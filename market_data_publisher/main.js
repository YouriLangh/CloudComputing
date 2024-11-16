const amqp = require("amqplib");
const WebSocket = require("ws");
const { OrderBook, Order } = require("/app/orderbook");

const RABBITMQ_URL = "amqp://rabbitmq";
const ORDERBOOK_QUEUE = "orderbook_queue"; // RabbitMQ queue to consume messages

let orderBook = new OrderBook(["AAPL", "GOOGL", "MSFT", "AMZN"]);

// Create WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

// Store active WebSocket connections
const clients = new Set();
wss.on("listening", () => {
  console.log("WebSocket server listening on ws://localhost:8080");
});

wss.on("connection", (ws) => {
  console.log("Client connected");
  clients.add(ws);

  ws.send(
    JSON.stringify({
      type: "orderBook",
      data: orderBook.toJSON(),
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

  // Assert the queue
  await channel.assertQueue(ORDERBOOK_QUEUE, { durable: true });

  console.log("Market Data Publisher consuming from RabbitMQ...");

  await channel.consume(ORDERBOOK_QUEUE, (msg) => {
    if (msg !== null) {
      const data = JSON.parse(msg.content.toString());
      const { type, ...content } = data;

      if (type === "order") {
        console.log(
          `Order: ${content.order_type} ${content.quantity} ${content.symbol} @ ${content.price} (${content.sequenceNumber})`
        );
        processOrder(content);
      } else if (type === "execution") {
        console.log(
          `Execution: ${content.symbol} ${content.quantity} @ ${content.price} (${content.sequenceNumber})`
        );
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

function calculateDailyAveragePrice() {
  const averages = {};

  for (const symbol of orderBook.symbol_order_book_map.keys()) {
    const asks = orderBook.symbol_order_book_map.get(symbol).asks.toArray();
    const bids = orderBook.symbol_order_book_map.get(symbol).bids.toArray();

    const avgAskPrice = asks.length
      ? asks.reduce((sum, order) => sum + order.price, 0) / asks.length
      : 0;

    const avgBidPrice = bids.length
      ? bids.reduce((sum, order) => sum + order.price, 0) / bids.length
      : 0;

    averages[symbol] = { avgAskPrice, avgBidPrice };
  }

  return averages;
}

function publishPriceEvolution() {
  const averages = calculateDailyAveragePrice();
  const message = JSON.stringify({
    type: "priceEvolution",
    data: averages,
    timestamp: Date.now(),
  });

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

setInterval(() => {
  publishPriceEvolution();
}, 60000); // Send evolution every minute

startMarketDataPublisher();
