const { Kafka } = require("kafkajs");

const kafka = new Kafka({ brokers: ["kafka:9092"] });
const consumer = kafka.consumer({ groupId: "market_data_group" });

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
    const { price, symbol, quantity, order_type, id } = data
    const order = new EngineOrder(
        symbol,
        order_type,
        parseFloat(price),
        parseInt(quantity),
        id
    );
    if(order.order_type === 'ask'){
        // Process ask order
        console.log("Processing ask order for dashboard:", order);
    } else {
        // Process bid order
    }
  // Process new order data for the order book or any real-time UI updates
  console.log("Processing order for dashboard:", order);
  publishToDashboard(order, "order");
}

function processFill(data) {
    const { price, symbol, quantity, order_type, id } = data
    const order = new EngineOrder(
        symbol,
        order_type,
        parseFloat(price),
        parseInt(quantity),
        id
    );
  console.log('Processing fill for dashboard:', order);

}

function publishToDashboard(data, type) {
  // Code to publish data to the dashboard (e.g., via WebSocket)
  // console.log(`Publishing ${type} to dashboard:`, data);
}

startMarketDataPublisher();
