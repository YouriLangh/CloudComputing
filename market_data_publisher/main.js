const amqp = require("amqplib");
const WebSocket = require("ws");
const { Observable } = require("rxjs");
const { groupBy, map, mergeMap, scan, bufferTime } = require("rxjs/operators");

// Environment variables for RabbitMQ connection
const RABBITMQ_HOST = process.env.RABBITMQ_HOST;
const RABBITMQ_PORT = process.env.RABBITMQ_PORT;
const ORDERBOOK_QUEUE = process.env.RABBITMQ_ORDERBOOK_QUEUE;

// History data structure to store computed averages
const averagePriceHistory = {
  AAPL: [],
  GOOGL: [],
  MSFT: [],
  AMZN: [],
};
// Initialize order books with empty objects for each symbol
let orderBooks = {
  AAPL: { bids: {}, asks: {} },
  GOOGL: { bids: {}, asks: {} },
  MSFT: { bids: {}, asks: {} },
  AMZN: { bids: {}, asks: {} },
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
  updateDashboard("AAPL", {
    averages: averagePriceHistory["AAPL"],
    orderBook: orderBooks["AAPL"],
  }, "initial");

  // Listen for subscription changes from the dashboard
  ws.on("message", (message) => {
    const msg = JSON.parse(message);
    if (msg.type === "subscribe") {
      const { symbol } = msg;
      if (symbol) {
        clientSubscriptions.set(ws, symbol);
        console.log(`Client subscribed to ${symbol}`);
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

// Function to process an order message
function processOrder(data) {
  const { price, symbol, quantity, side } = data;
  // Add the order to the appropriate side (bids or asks)
  const bookSide = orderBooks[symbol][side === "bid" ? "bids" : "asks"];
  bookSide[price] = (bookSide[price] || 0) + quantity;
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
}

// Create an Observable for RabbitMQ orders
const orderStream = new Observable(async (subscriber) => {
  const connectionString = `amqp://${RABBITMQ_HOST}:${RABBITMQ_PORT}`;  // Use environment variables here
  const connection = await amqp.connect(connectionString);
  const channel = await connection.createChannel();

  await channel.assertQueue(ORDERBOOK_QUEUE, { durable: true });

  console.log("Consuming from RabbitMQ...");

  channel.consume(ORDERBOOK_QUEUE, (msg) => {
    if (msg !== null) {
      const data = JSON.parse(msg.content.toString());
      const { type, ...content } = data;
      console.log(
        `Received ${type} message w data: ${JSON.stringify(content)}`
      );
      if (type === "order") {
        subscriber.next(data); // Emit the order to the stream
        processOrder(content);
      } else if (type === "execution") {
        processExecution(content);
      }

      channel.ack(msg); // Acknowledge the message
    }
  });
});

// Process the order stream and compute averages
orderStream
  .pipe(
    // Group by stock symbol
    groupBy((order) => order.symbol),
    mergeMap((group$) =>
      group$.pipe(
        // Group orders into 1-minute windows
        bufferTime(60000), // Buffer for 60 seconds

        // For each 1-minute window, compute average prices
        map((orders) => {
          const bids = { totalPrice: 0, totalQuantity: 0 };
          const asks = { totalPrice: 0, totalQuantity: 0 };

          // Accumulate prices and quantities
          orders.forEach((order) => {
            if (order.side === "bid") {
              bids.totalPrice += order.price * order.quantity;
              bids.totalQuantity += order.quantity;
            } else if (order.side === "ask") {
              asks.totalPrice += order.price * order.quantity;
              asks.totalQuantity += order.quantity;
            }
          });

          return {
            symbol: group$.key,
            minuteTimestamp: new Date().toISOString(),
            avgBidPrice:
              bids.totalQuantity > 0 ? bids.totalPrice / bids.totalQuantity : 0,
            avgAskPrice:
              asks.totalQuantity > 0 ? asks.totalPrice / asks.totalQuantity : 0,
          };
        })
      )
    )
  )
  .subscribe((average) => {
    console.log("Computed Average:", average);

    // Store the computed average in the history data structure
    const { symbol, minuteTimestamp, avgBidPrice, avgAskPrice } = average;
    const data = {
      minuteTimestamp,
      avgBidPrice,
      avgAskPrice,
    };
    averagePriceHistory[symbol].push(data);
    updateDashboard(symbol, averagePriceHistory[symbol], "averages");
  });

// Publish updates to WebSocket clients
function updateDashboard(symbol, data, type) {
  const message = JSON.stringify({ type, data });

  clients.forEach((client) => {
    if (
      client.readyState === WebSocket.OPEN &&
      clientSubscriptions.get(client) === symbol
    ) {
      client.send(message);
    }
  });
}

// Start the application
orderStream.subscribe(); // Start the order stream

setInterval(() => {
  clients.forEach((client) => {
    let type = "orderbook";
    const symbol = clientSubscriptions.get(client);
    const orderBook = orderBooks[symbol];
    data = {
      orderBook: orderBook,
    };
    updateDashboard(symbol, data, type);
  });
}, 1000); // Publish every  1 second