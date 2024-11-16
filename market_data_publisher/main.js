const amqp = require("amqplib");
const WebSocket = require("ws");
const { OrderBook, Order } = require("/app/orderbook");

const RABBITMQ_URL = "amqp://rabbitmq";
const ORDERBOOK_QUEUE = "orderbook_queue"; // RabbitMQ queue for unified messages

let orderBook = new OrderBook(["AAPL", "GOOGL", "MSFT", "AMZN"]);

// Initialize dailyAveragePrices with empty arrays for each symbol
let dailyAveragePrices = new Map();
["AAPL", "GOOGL", "MSFT", "AMZN"].forEach((symbol) =>
  dailyAveragePrices.set(symbol, [])
);

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
      orderBook: orderBook.toJSON(),
      averages: Object.fromEntries(dailyAveragePrices),
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
  const order = new Order(order_type, price, quantity, secnum);
  orderBook.addOrder(symbol, order);
  publishToDashboard(data, "order");
}

function processExecution(data) {
  const { symbol, order_type, secnum, quantity } = data;
  orderBook.adjustOrRemoveOrder(symbol, order_type, secnum, quantity);
  publishToDashboard(orderBook.toJSON(), "orderBook");
}

function publishToDashboard(data, type) {
  const message = JSON.stringify({ type, data });
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Start the Market Data Publisher
startMarketDataPublisher();
