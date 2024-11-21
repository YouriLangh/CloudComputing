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
    const connectionString = `amqp://${RABBITMQ_HOST}:${RABBITMQ_PORT}`;  // Use environment variables here
    const connection = await amqp.connect(connectionString);
    const channel = await connection.createChannel();

    // Ensure the queues exist
    await channel.assertQueue(ORDER_QUEUE, { durable: true });
    await channel.assertQueue(ORDER_MANAGER_QUEUE, { durable: true });

    console.log("Gateway is now consuming orders...");

    // Start consuming messages
    channel.consume(ORDER_QUEUE, async (msg) => {
      if (msg !== null) {
        const order = JSON.parse(msg.content.toString());
        // Validate the order
        if (validateOrder(order)) {
          // Forward to the Order Manager queue
          channel.sendToQueue(
            ORDER_MANAGER_QUEUE,
            Buffer.from(JSON.stringify(order)),
            { persistent: true }
          );

          channel.ack(msg); // Acknowledge the message upon successful forwarding
        } else {
          console.log("Order validation failed:", order);
          channel.nack(msg); // Acknowledge invalid message to avoid reprocessing
        }
      }
    });
  } catch (error) {
    console.error("Failed to consume and forward orders:", error);
  }
}

consumeAndForwardOrders();
