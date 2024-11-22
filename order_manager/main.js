const amqp = require("amqplib");
const { RedisMatchingEngine, EngineOrder } = require("./redis_engine");
const redis = require("redis");

// Create a Redis client for Redis state
const redisClient = redis.createClient({
  url: `redis://${process.env.REDIS_HOST || "redis-service"}:${process.env.REDIS_PORT || 6379}`,
});

// Use Redis client's promise-based API
async function connectToRedis() {
  try {
    await redisClient.connect();
    console.log("Redis is connected and ready!");
  } catch (error) {
    console.error("Error connecting to Redis:", error);
  }
}

// Call the function to connect to Redis
connectToRedis();

// Create a MatchingEngine that stores its state in Redis
const matchingEngine = new RedisMatchingEngine(
  ["AAPL", "GOOGL", "MSFT", "AMZN"], // Stock symbols
  redisClient                         // Pass the redis client
);
// Environment variables for RabbitMQ connection
const RABBITMQ_HOST = process.env.RABBITMQ_HOST;
const RABBITMQ_PORT = process.env.RABBITMQ_PORT;
const ORDERBOOK_QUEUE = process.env.RABBITMQ_ORDERBOOK_QUEUE;
const ORDER_MANAGER_QUEUE = process.env.RABBITMQ_MANAGER_QUEUE;
const EXCHANGE_NAME = "order_manager_exchange";  // Add exchange name

// class SequentialNumberGenerator {
//   constructor(start = 1) {
//     this.key = "seq_number";  // Redis key to store the current sequence number
//     this.start = start;

//     // Initialize the sequence number in Redis if it doesn't exist
//     redisClient.set(this.key, this.start, { NX: true }, (err, result) => {
//       if (result === "OK") {
//         console.log(`Sequence number initialized to ${this.start}`);
//       }
//     });
//   }

//   getNext() {
//     try {
//       const newSeq = redisClient.incr("seq_number");
//       console.log("Next sequence:", newSeq);
//       return newSeq;
//     } catch (error) {
//       console.error("Error getting next sequence:", error);
//     }
//   }
// }
class SequentialNumberGenerator {
  constructor(start = 1) {
    this.current = start;  // Initialize the counter with the starting value
  }

  getNext() {
    const seq = this.current;  // Store the current value before incrementing
    this.current++;  // Increment the sequence number
    return seq;  // Return the previous value (before incrementing)
  }
}
const seqGen = new SequentialNumberGenerator();

async function setupRabbitMQ() {
  const connectionString = `amqp://${RABBITMQ_HOST}:${RABBITMQ_PORT}`;  // Use environment variables here
  const connection = await amqp.connect(connectionString);
  const channel = await connection.createChannel();

  // Ensure the exchange exists
  await channel.assertExchange(EXCHANGE_NAME, 'fanout', { durable: true });

  // Ensure the manager queue exists
  await channel.assertQueue(ORDER_MANAGER_QUEUE, { durable: true });

  // Ensure a dynamic queue is created and bind it to the exchange
  const queueName = `orderbook_queue_${process.env.POD_NAME}`;
  await channel.assertQueue(queueName, { durable: true });
  await channel.bindQueue(queueName, EXCHANGE_NAME, '');  // Bind to the exchange
  console.log("RabbitMQ setup completed.");
  return { connection, channel };
}

// Publish a message to the fanout exchange
function publishMessage(channel, messageType, exchange, message) {
  const fullMessage = {
    ...message,
    type: messageType,
  };

  // Publish the message to the exchange (not to a queue directly)
  channel.publish(exchange, '', Buffer.from(JSON.stringify(fullMessage)));
}

// Execution handler for the matching engine
async function executionHandler(channel, ask_executions, bid_executions) {
  console.log("ask executions: ", ask_executions);
  console.log("bid executions: ", bid_executions);

  // Append ask and bid executions into a single list
  const all_executions = [...ask_executions, ...bid_executions];

  // Publish each execution to RabbitMQ
  for (const execution of all_executions) {
    publishMessage(channel, "execution", EXCHANGE_NAME, execution);
  }
}

async function consumeAndForwardOrders(channel) {
  console.log("Order manager is now consuming orders from RabbitMQ...");

  // Start consuming messages
  channel.consume(ORDER_MANAGER_QUEUE, async (msg) => {
    if (msg !== null) {
      try {
        const rawOrder = JSON.parse(msg.content.toString());
        console.log("Raw order received: ", rawOrder); // Add this line to inspect the raw order
        const processedOrder = processOrder(rawOrder);

        console.log(
          `Order received: ${processedOrder.side} ${processedOrder.quantity} of ${processedOrder.symbol} at ${processedOrder.price}`
        );

        // Publish the order to RabbitMQ
        publishMessage(channel, "order", EXCHANGE_NAME, processedOrder);

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
