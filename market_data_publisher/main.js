const { Kafka } = require("kafkajs");
const WebSocket = require("ws");
const { OrderBook, Order } = require("/app/orderbook");

const kafka = new Kafka({ brokers: ["kafka:9092"] });
const consumer = kafka.consumer({ groupId: "market_data_group" });

let orderBook = new OrderBook(["AAPL", "GOOGL", "MSFT", "AMZN"]);

// Create WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

// Store all WebSocket connections
const clients = new Set();
wss.on("listening", () => {
  console.log("WebSocket server is now open and listening on ws://localhost:8080");
});
// TODO: order_manager kafka producer has warning as it does not use our partitioner?
// TODO: Multiple order books exist for different symbols
// TODO: decide what data to send to the dashboard
// TODO: Where to add timestamps again??

// Handle new WebSocket connections
wss.on("connection", (ws) => {
  console.log("New client connected");
  clients.add(ws);
  ws.send(JSON.stringify(orderBook)); // send the current order book to them

  // Remove client from the set when they disconnect
  ws.on("close", () => {
    console.log("Client disconnected");
    clients.delete(ws);
  });
});

async function startMarketDataPublisher() {
  await consumer.connect();

  // Subscribe to both 'orders' and 'order_fills' topics
  await consumer.subscribe({ topic: "orders" }); //, fromBeginning: true });  in case of crash, we want to start from the beginning : TODO: Might be better to rehydrate a log
  await consumer.subscribe({ topic: "order_fills" }); //, fromBeginning: true });

  console.log("Market Data Publisher is now consuming from Kafka topics...");

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const data = JSON.parse(message.value.toString());

      if (topic === "orders") {
        console.log("Received new order:", data);
        processOrder(data);
      } else if (topic === "order_fills") {
        console.log("Received execution fill:", data);
        processFill(data);
      }
    },
  });
}

function processOrder(data) {
  const { price, symbol, quantity, order_type, secnum } = data;
  console.log("Processing order for dashboard:", data);
  const order = new Order(symbol, order_type, price, quantity, secnum);
  orderBook.addOrder(order);
  // Publish to all WebSocket clients
  publishToDashboard(data, "order");
}

function processFill(data) {
  const { price, symbol, quantity, order_type, secnum } = data;
  console.log("Processing fill for dashboard:", data);
  orderBook.adjustOrRemoveOrder(symbol, order_type, secnum, quantity);
  // Publish to all WebSocket clients
  publishToDashboard(data, "fill");
}

function publishToDashboard(data, type) {
  // Broadcast the data to all connected WebSocket clients
  const message = JSON.stringify({
    type: type,
    data: data,
  });

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

startMarketDataPublisher();
