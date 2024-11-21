const amqp = require("amqplib");
const { MatchingEngine, EngineOrder } = require("./matching-engine");

let matchingEngine = new MatchingEngine(["AAPL", "GOOGL", "MSFT", "AMZN"]);

// Environment variables for RabbitMQ connection
const RABBITMQ_HOST = process.env.RABBITMQ_HOST;
const RABBITMQ_PORT = process.env.RABBITMQ_PORT;
const ORDERBOOK_QUEUE = process.env.RABBITMQ_ORDERBOOK_QUEUE;
const ORDER_MANAGER_QUEUE = process.env.RABBITMQ_MANAGER_QUEUE;


class SequentialNumberGenerator {
  constructor(start = 1) {
    this.current = start;
  }

  getNext() {
    return this.current++; // returns the current number and then increments
  }
}

const seqGen = new SequentialNumberGenerator();

async function setupRabbitMQ() {
  const connectionString = `amqp://${RABBITMQ_HOST}:${RABBITMQ_PORT}`;  // Use environment variables here
  const connection = await amqp.connect(connectionString);
  const channel = await connection.createChannel();

  // Declare the queues
  await channel.assertQueue(ORDER_MANAGER_QUEUE, { durable: true });
  await channel.assertQueue(ORDERBOOK_QUEUE, { durable: true });

  console.log("RabbitMQ setup completed.");
  return { connection, channel };
}

// Publish a message to RabbitMQ with a consistent sequence number
function publishMessage(channel, messageType, queue, message) {
  const timestamp = Date.now(); // Optional: Add a timestamp to ensure the order is traceable

  const fullMessage = {
    ...message,
    type: messageType,
  };

  channel.sendToQueue(queue, Buffer.from(JSON.stringify(fullMessage)));
}

// Execution handler for the matching engine
async function executionHandler(channel, ask_executions, bid_executions) {
  console.log("ask executions: ", ask_executions);
  console.log("bid executions: ", bid_executions);

  // Append ask and bid executions into a single list
  const all_executions = [...ask_executions, ...bid_executions];

  // Publish each execution to RabbitMQ
  for (const execution of all_executions) {
    publishMessage(channel, "execution", ORDERBOOK_QUEUE, execution);
  }
}

async function consumeAndForwardOrders(channel) {
  console.log("Order manager is now consuming orders from RabbitMQ...");

  // Start consuming messages
  channel.consume(ORDER_MANAGER_QUEUE, async (msg) => {
    if (msg !== null) {
      try {
        const rawOrder = JSON.parse(msg.content.toString());
        const processedOrder = processOrder(rawOrder);

        console.log(
          `Order received: ${processedOrder.side} ${processedOrder.quantity} of ${processedOrder.symbol} at ${processedOrder.price}`
        );

        // Publish the order to RabbitMQ
        publishMessage(channel, "order", ORDERBOOK_QUEUE, processedOrder);

        // Create an EngineOrder instance from the parsed data
        const order = new EngineOrder(
          processedOrder.symbol,
          processedOrder.side,
          processedOrder.price,
          processedOrder.quantity,
          processedOrder.secnum
        );

        matchingEngine.execute(order, (askExec, bidExec) =>
          executionHandler(channel, askExec, bidExec)
        );

        // Acknowledge the message upon successful processing
        channel.ack(msg);
      } catch (error) {
        console.error("Error processing order:", error);
        channel.nack(msg); // Negative acknowledgment on error
      }
    }
  });
}

function processOrder(order) {
  order.secnum = seqGen.getNext();
  order.price = parseFloat(order.price);
  order.quantity = parseInt(order.quantity);
  delete order.user_id;
  delete order.trader_type;
  order.side = order.order_type;
  delete order.order_type;
  delete order.timestamp_ns;
  return order;
}

// Initialize RabbitMQ and start consuming
(async () => {
  try {
    const { channel } = await setupRabbitMQ();
    await consumeAndForwardOrders(channel);
  } catch (error) {
    console.error("Failed to start order manager:", error);
  }
})();
