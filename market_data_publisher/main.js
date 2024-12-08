const amqp = require("amqplib");
const WebSocket = require("ws");
const { Observable } = require("rxjs");
const { groupBy, map, mergeMap, bufferTime } = require("rxjs/operators");
const {
  setOrderBook,
  setAverages,
  initializeState,
} = require("./redisUtils");

// Environment variables for RabbitMQ connection
const RABBITMQ_HOST = process.env.RABBITMQ_HOST;
const RABBITMQ_PORT = process.env.RABBITMQ_PORT;
const ORDERBOOK_QUEUE = process.env.RABBITMQ_ORDERBOOK_QUEUE;
const EXCHANGE_NAME = "order_manager_exchange";  // Add exchange name
const SYMBOLS = ["AAPL", "GOOGL", "MSFT", "AMZN"];

let orderBooks = { "AAPL": {bids: {}, asks: {}}, "GOOGL": {bids: {}, asks: {}}, "MSFT": {bids: {}, asks: {}}, "AMZN": {bids: {}, asks: {}} };
let averagePriceHistory = {};

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
  broadcastUpdates("AAPL", {
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
        sendInitialDashboardData(ws, symbol);
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

// Publish initial dashboard data
function sendInitialDashboardData(client, symbol) {
  const orderBook = orderBooks[symbol];
  const averages = averagePriceHistory[symbol];
  const data = {
    type: "initial",
    data: { orderBook, averages },
  };
  client.send(JSON.stringify(data));
}


// Function to process incoming orders
function processOrder(data) {
  const { price, symbol, quantity, side } = data;
  // Ensure orderBooks for the symbol exist
  if (!orderBooks[symbol]) {
    orderBooks[symbol] = { bids: {}, asks: {} };
  }

  // Choose the appropriate side (bid or ask) based on order side
  const bookSide = orderBooks[symbol][side === "bid" ? "bids" : "asks"];

  // Update the book with the new order
  bookSide[price] = (bookSide[price] || 0) + quantity;

  // Set the updated orderBook in Redis
  setOrderBook(symbol, orderBooks[symbol]);
}

// Function to handle order execution updates
function processExecution(data) {
  const { price, symbol, quantity, side } = data;
  // Ensure orderBooks for the symbol exist
  if (!orderBooks[symbol]) {
    orderBooks[symbol] = { bids: {}, asks: {} };
  }

  // Choose the appropriate side (bid or ask) based on order side
  const bookSide = orderBooks[symbol][side === "bid" ? "bids" : "asks"];

  // If the price exists, update the book
  if (bookSide[price] !== undefined) {
    const remainingQuantity = bookSide[price] - quantity;
    if (remainingQuantity <= 0) {
      delete bookSide[price]; // Remove the price if quantity is 0 or less
    } else {
      bookSide[price] = remainingQuantity; // Update the quantity
    }
  }

  // Set the updated orderBook in Redis
  setOrderBook(symbol, orderBooks[symbol]);
}

// Create an Observable for RabbitMQ orders
const orderStream = new Observable(async (subscriber) => {
  const connection = await amqp.connect(`amqp://${RABBITMQ_HOST}:${RABBITMQ_PORT}`);
  const channel = await connection.createChannel();

  await channel.assertExchange(EXCHANGE_NAME, "fanout", { durable: true });
  const { queue } = await channel.assertQueue('', { exclusive: true });
  await channel.assertQueue('', { exclusive: true });
  await channel.bindQueue(queue, EXCHANGE_NAME, "");

  channel.consume(queue, (msg) => {
    if (msg) {
      const messageData = JSON.parse(msg.content.toString());
      // Process orders or executions
      if (messageData.type === "order") {
        processOrder(messageData); // Process new order
      } else if (messageData.type === "execution") {
        processExecution(messageData); // Process order execution
      }
      subscriber.next(messageData); // Push the message to the subscriber
      channel.ack(msg); // Acknowledge the message
    }
  });
});

// Process the order stream and compute averages
orderStream
  .pipe(
    groupBy((order) => order.symbol),
    mergeMap((group) =>
      group.pipe(
        bufferTime(60000),
        map((orders) => computeAverages(group.key, orders))
      )
    )
  )
  .subscribe(async (average) => {
    const { symbol } = average;
    averagePriceHistory[symbol].push(average);
    await setAverages(symbol, averagePriceHistory[symbol]);
    broadcastUpdates(symbol, { averages: averagePriceHistory[symbol] }, "averages");
  });


setInterval(() => {
  clients.forEach((client) => {
    let type = "orderbook";
    const symbol = clientSubscriptions.get(client);
    const orderBook = orderBooks[symbol];
    if (Object.keys(orderBook.bids).length || Object.keys(orderBook.asks).length) {
      data = {
        orderBook: orderBook,
      };
      broadcastUpdates(symbol, data, type);
    }
  });
}, 1000); // Publish every  1 second

function computeAverages(symbol, orders) {
  const bids = { totalPrice: 0, totalQuantity: 0 };
  const asks = { totalPrice: 0, totalQuantity: 0 };

  orders.forEach(({ price, quantity, side }) => {
    if (side === "bid") {
      bids.totalPrice += price * quantity;
      bids.totalQuantity += quantity;
    } else if (side === "ask") {
      asks.totalPrice += price * quantity;
      asks.totalQuantity += quantity;
    }
  });

  return {
    symbol,
    minuteTimestamp: new Date().toISOString(),
    avgBidPrice: bids.totalQuantity ? bids.totalPrice / bids.totalQuantity : 0,
    avgAskPrice: asks.totalQuantity ? asks.totalPrice / asks.totalQuantity : 0,
  };
}

// Broadcast updates to relevant WebSocket clients
function broadcastUpdates(symbol, data, type) {
  const message = JSON.stringify({ type, data });
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && clientSubscriptions.get(client) === symbol) {
      client.send(message);
    }
  });
}

// Load initial state from Redis and start the application
(async () => {
  const state = await initializeState(SYMBOLS);
  orderBooks = state.orderBooks;
  averagePriceHistory = state.averagePriceHistory;
  orderStream.subscribe(); // Start the order stream
})();