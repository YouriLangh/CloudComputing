const amqp = require("amqplib");

// Environment variables for RabbitMQ connection
const RABBITMQ_HOST = process.env.RABBITMQ_HOST;
const RABBITMQ_PORT = process.env.RABBITMQ_PORT;
const ORDER_QUEUE = process.env.RABBITMQ_ORDER_QUEUE;
const ORDER_MANAGER_QUEUE = process.env.RABBITMQ_MANAGER_QUEUE;

// Function to validate orders
function validateOrder(order) {
  const {
    user_id,
    timestamp_ns,
    price,
    symbol,
    quantity,
    order_type,
    trader_type,
  } = order;
  if (
    typeof user_id === "string" &&
    !isNaN(Number(timestamp_ns)) &&
    !isNaN(Number(price)) &&
    typeof symbol === "string" &&
    symbol.length >= 4 &&
    symbol.length <= 5 &&
    !isNaN(Number(quantity)) &&
    (order_type === "ask" || order_type === "bid") &&
    (trader_type === "market_maker" ||
      trader_type === "institutional" ||
      trader_type === "retail")
  ) {
    return true;
  }
  return false;
}

// Connect to RabbitMQ and consume orders from the 'orders' queue
async function consumeAndForwardOrders() {
  try {
    const connectionString = `amqp://${RABBITMQ_HOST}:${RABBITMQ_PORT}`;
    const connection = await amqp.connect(connectionString);
    const channel = await connection.createChannel();

    // Set up the exchange and get a unique queue for this pod
    await channel.assertQueue(ORDER_QUEUE, { durable: true });
    await channel.assertQueue(ORDER_MANAGER_QUEUE, { durable: true });

    console.log("Gateway is now consuming orders...");

    // Start consuming messages
    channel.consume(ORDER_QUEUE, async (msg) => {
      if (msg !== null) {
        const order = JSON.parse(msg.content.toString());
        // Validate and forward the order to the Order Manager queue
        if (validateOrder(order)) {
          channel.sendToQueue(
            ORDER_MANAGER_QUEUE,
            Buffer.from(JSON.stringify(order)),
            { persistent: true }
          );
          channel.ack(msg); // Acknowledge the message
        } else {
          console.log("Order validation failed:", order);
          channel.nack(msg); // Negative ack if validation fails
        }
      }
    });
  } catch (error) {
    console.error("Failed to consume orders:", error);
  }
}

consumeAndForwardOrders();
