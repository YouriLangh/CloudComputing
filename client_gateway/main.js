const amqp = require("amqplib");

// RabbitMQ configuration
const ORDER_QUEUE = "orders"; // Queue where the Order Streamer publishes orders
const ORDER_MANAGER_QUEUE = "order_manager_queue"; // Queue for validated orders to the Order Manager

// Connection settings for RabbitMQ
const RABBITMQ_URL = "amqp://rabbitmq"; // Update if RabbitMQ is hosted elsewhere

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
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    // Ensure the queues exist
    await channel.assertQueue(ORDER_QUEUE, { durable: true, autoDelete: true });
    //await channel.assertQueue(ORDER_MANAGER_QUEUE, { durable: true });

    console.log("Gateway is now consuming orders...");

    let lastMessageTime = Date.now(); // Track the time of the last received message

    // Function to handle timeouts (5 seconds)
    const timeoutDuration = 5000; // 5 seconds timeout
    const timeoutCheck = setInterval(() => {
      if (Date.now() - lastMessageTime > timeoutDuration) {
        console.log("No messages received for 5 seconds. Closing connection...");
        channel.close();
        connection.close();
        clearInterval(timeoutCheck); // Stop checking for timeouts
      }
    }, 1000); // Check every second

    // Start consuming messages
    channel.consume(ORDER_QUEUE, async (msg) => {
      if (msg !== null) {
        lastMessageTime = Date.now(); // Reset the timer when a message is received
        const order = JSON.parse(msg.content.toString());

        // Validate the order
        if (validateOrder(order)) {
          console.log(
            "Order validated, forwarding to Order Manager... %s",
            order
          );

          // Forward to the Order Manager queue
          // channel.sendToQueue(
          //     ORDER_MANAGER_QUEUE,
          //     Buffer.from(JSON.stringify(order)),
          //     { persistent: true }
          // );

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
