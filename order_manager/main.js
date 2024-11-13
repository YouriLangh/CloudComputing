const amqp = require("amqplib");
const { Kafka, Partitioners } = require("kafkajs");
const { MatchingEngine, EngineOrder } = require("/app/matching-engine");

let matchingEngine = new MatchingEngine(["AAPL", "GOOGL", "MSFT", "AMZN"]);

// Kafka setup
const kafka = new Kafka({ brokers: ["kafka:9092"] });
const producer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner,
});

const ORDER_MANAGER_QUEUE = "order_manager_queue"; // Queue for validated orders
const RABBITMQ_URL = "amqp://rabbitmq"; // RabbitMQ connection URL

async function connectKafkaProducer() {
  await producer.connect();
  console.log("Connected to Kafka producer.");
}

// Execution handler for the matching engine
async function executionHandler(ask_executions, bid_executions) {
  console.log("ask executions: ", ask_executions);
  console.log("bid executions: ", bid_executions);

  // Append ask and bid executions into a single list
  const all_executions = [...ask_executions, ...bid_executions];

  // Map executions to messages, using the `order_type` to set the type
  const messages = all_executions.map((execution) => ({
    key: execution.symbol,
    value: JSON.stringify({
      ...execution,
      type: execution.order_type, // Use `order_type` to get the side
    }),
  }));

  // Send all messages in a single batch
  await producer.send({
    topic: "order_fills",
    messages,
  });
}


class SequentialNumberGenerator {
  constructor(start = 1) {
    this.current = start;
  }

  getNext() {
    return this.current++; // returns the current number and then increments
  }
}

const seqGen = new SequentialNumberGenerator();

async function consumeAndForwardOrders() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue(ORDER_MANAGER_QUEUE, { durable: true });
    console.log("Order manager is now consuming orders from RabbitMQ...");

    // Start consuming messages
    channel.consume(ORDER_MANAGER_QUEUE, async (msg) => {
      if (msg !== null) {
        const rawOrder = JSON.parse(msg.content.toString());

        const processedOrder = processOrder(rawOrder);

        console.log(`Order received: ${processedOrder.order_type} ${processedOrder.quantity} of ${processedOrder.symbol} at ${processedOrder.price}`);

        await producer.send({
          topic: "orders",
          // partition by symbol to ensure orders of the same symbol are processed in order
          messages: [
            {
              key: processedOrder.symbol,
              value: JSON.stringify(processedOrder),
            },
          ],
        });

        // Create an EngineOrder instance from the parsed data
        const order = new EngineOrder(
          processedOrder.symbol,
          processedOrder.order_type,
          processedOrder.price,
          processedOrder.quantity,
          processedOrder.secnum
        );

        matchingEngine.execute(order, executionHandler);

        // Acknowledge the message upon successful processing
        channel.ack(msg);
      }
    });
  } catch (error) {
    console.error("Failed to consume and forward orders:", error);
  }
}

function processOrder(order) {
  order.secnum = seqGen.getNext();
  order.price = parseFloat(order.price);
  order.quantity = parseInt(order.quantity);
  delete order.user_id;
  delete order.timestamp_ns;
  delete order.trader_type;
  return order;
}

// Connect to Kafka and start consuming orders
connectKafkaProducer().then(consumeAndForwardOrders);
