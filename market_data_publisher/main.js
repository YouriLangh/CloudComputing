const amqp = require("amqplib");
const WebSocket = require("ws");
const { Subject } = require('rxjs');
const { groupBy, map, mergeMap, scan, debounceTime } = require("rxjs/operators");

const RABBITMQ_URL = "amqp://rabbitmq";
const ORDERBOOK_QUEUE = "orderbook_queue"; // RabbitMQ queue for unified messages

// RxJS Observable to stream orders
const orderStream = new Subject();

// Initialize order books with empty objects for each symbol
let orderBooks = {
  "AAPL": { bids: {}, asks: {} },
  "GOOGL": { bids: {}, asks: {} },
  "MSFT": { bids: {}, asks: {} },
  "AMZN": { bids: {}, asks: {} },
};

// Create WebSocket server
const wss = new WebSocket.Server({ port: 8080 });
const clients = new Set();
const clientSubscriptions = new Map();

wss.on("listening", () => {
  console.log("WebSocket server listening on ws://localhost:8080");
});

wss.on("connection", (ws) => {
  console.log("Client connected");
  clients.add(ws);

  // Initialize the client's subscriptions
  clientSubscriptions.set(ws, "AAPL");

  // Send the current order book to new clients
  ws.send(
    JSON.stringify({
      type: "initialData",
      orderBook: orderBooks,
    })
  );

  // Listen for subscription changes from the dashboard
  ws.on("message", (message) => {
    const msg = JSON.parse(message);
    if (msg.type === "subscribe") {
      const { symbol } = msg;
      if (symbol) {
        clientSubscriptions.set(ws, symbol);
        console.log(`Client subscribed to ${symbol}`);
        publishToDashboard(symbol, orderBooks[symbol], "orderBookUpdate");
      }
    }
  });

  // Remove client subscriptions on disconnect
  ws.on("close", () => {
    console.log("Client disconnected");
    clientSubscriptions.delete(ws);
    clients.delete(ws);
  });
});


async function startMarketDataPublisher() {
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();

  await channel.assertQueue(ORDERBOOK_QUEUE, { durable: true });

  console.log("Market Data Publisher consuming from RabbitMQ...");

  await channel.consume(ORDERBOOK_QUEUE, (msg) => {
    if (msg !== null) {
      const data = JSON.parse(msg.content.toString());
      const { type, ...content } = data;
      console.log(`Received ${type} message w data: ${JSON.stringify(content)}`);
      if (type === "order") {
        processOrder(content);
      } else if (type === "execution") {
        processExecution(content);
      }

      channel.ack(msg); // Acknowledge the message
    }
  });
}
// Function to handle order updates and compute averages
const computeAvgPricesPerMinute = () => {
  orderStream.pipe(
    // Group by symbol (AMZN, GOOGL, etc.)
    groupBy(order => order.symbol),

    // For each symbol group, process the orders
    mergeMap(group$ =>
      group$.pipe(
        // Group by current minute timestamp
        groupBy(order => {
          // Get the current time
          const currentTime = new Date();
          currentTime.setSeconds(0);  // Reset seconds to 0
          currentTime.setMilliseconds(0); // Reset milliseconds to 0
          return currentTime.toISOString(); // Group by truncated current time (minute)
        }),

        // For each minute group, accumulate prices and quantities
        mergeMap(minuteGroup$ =>
          minuteGroup$.pipe(
            scan((acc, order) => {
              // Accumulate ask and bid prices for the current minute
              if (order.side === 'bid') {
                acc.bids.totalPrice += order.price * order.quantity;
                acc.bids.totalQuantity += order.quantity;
              } else if (order.side === 'ask') {
                acc.asks.totalPrice += order.price * order.quantity;
                acc.asks.totalQuantity += order.quantity;
              }
              return acc;
            }, {
              bids: { totalPrice: 0, totalQuantity: 0 },
              asks: { totalPrice: 0, totalQuantity: 0 }
            }),

            // After accumulating, calculate average price for both bids and asks
            map(acc => ({
              minuteTimestamp: minuteGroup$.key, // Use the truncated current time as the minute timestamp
              symbol: group$.key, // Stock symbol
              avgBidPrice: acc.bids.totalQuantity > 0 ? acc.bids.totalPrice / acc.bids.totalQuantity : 0,
              avgAskPrice: acc.asks.totalQuantity > 0 ? acc.asks.totalPrice / acc.asks.totalQuantity : 0,
            }))
          )
        )
      )
    ),

    // Optional: Debounce time to simulate real-time processing every minute (for efficiency)
    debounceTime(1000) // Adjust this as per your needs
  ).subscribe(result => {
    console.log('Average Prices per Minute:', result);
    // Send the average price data to WebSocket clients subscribed to the symbol
    publishToDashboard(result.symbol, result, "avgPriceUpdate");
  });
};

// Function to process an order message
function processOrder(data) {
  const { timestamp_ns, price, symbol, quantity, side } = data;
  // Add the order to the appropriate side (bids or asks)
  const bookSide = orderBooks[symbol][side === "bid" ? "bids" : "asks"];
  bookSide[price] = (bookSide[price] || 0) + quantity;

  // Emit the order to the stream
  orderStream.next(data);
  
  // Publish the updated order book to all clients subscribed to the stock symbol
  // publishToDashboard(symbol, data, "order");
}

// Function to handle order execution updates
function processExecution(data) {
  const { price, symbol, quantity, side } = data;
  const bookSide = orderBooks[symbol][side === "bid" ? "bids" : "asks"];

  // Remove the quantity from the appropriate side (bids or asks)
  if (bookSide[price] !== undefined) {
    let remainingQuantity = bookSide[price] - quantity;
    if (remainingQuantity <= 0) {
      delete bookSide[price]; // Remove the entry if quantity goes to zero or below
    } else {
      bookSide[price] = remainingQuantity; // Update the entry with remaining quantity
    }
  }

  // Publish the updated order book to all clients subscribed to the stock symbol
  // publishToDashboard(symbol, data, "execution");
}

// Publish updates to clients
function publishToDashboard(symbol, data, type) {
  // Prepare the message with updated order book and new data
  const message = JSON.stringify({ type, data });

  // Send the message to all clients that are subscribed to the symbol
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && clientSubscriptions.get(client) === symbol) {
      client.send(message);
    }
  });
}

// Start the Market Data Publisher
startMarketDataPublisher();

// Start the average price computation
computeAvgPricesPerMinute();
