const amqp = require("amqplib");
const WebSocket = require("ws");

const RABBITMQ_URL = "amqp://rabbitmq";
const ORDERBOOK_QUEUE = "orderbook_queue"; // RabbitMQ queue for unified messages

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
        console.log(clientSubscriptions)
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

function processOrder(data) {
  const { price, symbol, quantity, side } = data;
  // Add the order to the appropriate side (bids or asks)
  const bookSide = orderBooks[symbol][side === "bid" ? "bids" : "asks"];
  bookSide[price] = (bookSide[price] || 0) + quantity;

  // Publish the updated order book to all clients subscribed to the stock symbol
  publishToDashboard(symbol, data, "order");
}

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
  publishToDashboard(symbol, data, "execution");
}

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
