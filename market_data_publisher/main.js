const { Kafka } = require("kafkajs");
const WebSocket = require("ws");

const kafka = new Kafka({ brokers: ["kafka:9092"] });
const consumer = kafka.consumer({ groupId: "market_data_group" });

// Create WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

// Store all WebSocket connections
const clients = new Set();

// Handle new WebSocket connections
wss.on("connection", (ws) => {
  console.log("New client connected");
  clients.add(ws);

  // Remove client from the set when they disconnect
  ws.on("close", () => {
    console.log("Client disconnected");
    clients.delete(ws);
  });
});

async function startMarketDataPublisher() {
  await consumer.connect();

  // Subscribe to both 'orders' and 'order_fills' topics
  await consumer.subscribe({ topic: "orders", fromBeginning: true });
  await consumer.subscribe({ topic: "order_fills", fromBeginning: true });

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
  const { price, symbol, quantity, order_type, id } = data;
  console.log("Processing order for dashboard:", data);

  // Publish to all WebSocket clients
  publishToDashboard(data, "order");
}

function processFill(data) {
  const { price, symbol, quantity, order_type, id } = data;
  console.log("Processing fill for dashboard:", data);

  // Publish to all WebSocket clients
  // publishToDashboard(data, "fill");
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
