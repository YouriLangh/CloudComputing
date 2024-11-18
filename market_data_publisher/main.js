const amqp = require("amqplib");
const WebSocket = require("ws");

const RABBITMQ_URL = "amqp://rabbitmq";
const ORDERBOOK_QUEUE = "orderbook_queue"; // RabbitMQ queue for unified messages

// Initialize order books with empty maps for each symbol
let orderBooks = {
  "AAPL": { bids: new Map(), asks: new Map() },
  "GOOGL": { bids: new Map(), asks: new Map() },
  "MSFT": { bids: new Map(), asks: new Map() },
  "AMZN": { bids: new Map(), asks: new Map() },
};

// Create WebSocket server
const wss = new WebSocket.Server({ port: 8080 });
const clients = new Set();

wss.on("listening", () => {
  console.log("WebSocket server listening on ws://localhost:8080");
});

wss.on("connection", (ws) => {
  console.log("Client connected");
  clients.add(ws);

  // Send current order book and historical averages to new clients
  ws.send(
    JSON.stringify({
      type: "initialData",
      orderBook: orderBooks,
    })
  );

  ws.on("close", () => {
    console.log("Client disconnected");
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
  const { price, symbol, quantity, order_type, secnum } = data;

  // Add the order to the appropriate side (bids or asks)
  if (order_type === "bid") {
    const bids = orderBooks[symbol].bids;
    bids.set(price, (bids.get(price) || 0) + quantity);
  } else if (order_type === "ask") {
    const asks = orderBooks[symbol].asks;
    asks.set(price, (asks.get(price) || 0) + quantity);
  }
  
  // Publish the updated order book to clients
  publishToDashboard(data, "order");
}

function processExecution(data) {
  const { price, symbol, quantity, side, secnum } = data;
  const book = side ==="bid" ? orderBooks[symbol].bids : orderBooks[symbol].asks;
  // Remove the quantity from the appropriate side (bids or asks)
    if (book.has(price)) {
      let remainingQuantity = book.get(price) - quantity;
      if (remainingQuantity === 0) {
        book.delete(price); // Remove the ask if quantity goes to zero 
      } else {
        book.set(price, remainingQuantity); // Update the ask with remaining quantity
      }
    }

  // Publish the updated order book to clients
  publishToDashboard(data, "execution");
}

function publishToDashboard(data, type) {
  // Prepare the message with updated order book and new data
  const message = JSON.stringify({ type, data, orderBooks });

  // Send the message to all connected clients
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Start the Market Data Publisher
startMarketDataPublisher();
