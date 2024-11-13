const { Kafka } = require("kafkajs");
const { Observable, Subject } = require("rxjs");
const { switchMap } = require("rxjs/operators");
const amqp = require("amqplib");

const kafka = new Kafka({ brokers: ["kafka:9092"] });
const producer = kafka.producer();

// Your matching engine
const { MatchingEngine, EngineOrder } = require("/app/matching-engine");
let matchingEngine = new MatchingEngine(["AAPL", "GOOGL", "MSFT", "AMZN"]);

// Kafka producer setup
async function connectKafkaProducer() {
  await producer.connect();
  console.log("Connected to Kafka producer.");
}

// Message stream (subject) for order events
const orderStream = new Subject();  // A stream to push new orders

class SequentialNumberGenerator {
  constructor(start = 1) {
    this.current = start;
  }

  getNext() {
    return this.current++; // returns the current number and then increments
  }
}
const seqGen = new SequentialNumberGenerator();

// Kafka consumer for orders
async function consumeAndForwardOrders() {
  try {
    const connection = await amqp.connect("amqp://rabbitmq");
    const channel = await connection.createChannel();
    const ORDER_MANAGER_QUEUE = "order_manager_queue";

    await channel.assertQueue(ORDER_MANAGER_QUEUE, { durable: true });
    console.log("Order manager is now consuming orders from RabbitMQ...");

    channel.consume(ORDER_MANAGER_QUEUE, (msg) => {
      if (msg !== null) {
        const rawOrder = JSON.parse(msg.content.toString());
        orderStream.next(rawOrder);  // Push the order into the reactive stream
        channel.ack(msg);  // Acknowledge the message
      }
    });
  } catch (error) {
    console.error("Failed to consume and forward orders:", error);
  }
}

// Processing the orders reactively
orderStream.pipe(
  switchMap((rawOrder) => {
    const processedOrder = processOrder(rawOrder);
    console.log(`Processing order: ${processedOrder.order_type} ${processedOrder.quantity} of ${processedOrder.symbol} at ${processedOrder.price}`);

    return new Observable((observer) => {
      // Simulate order execution
      const order = new EngineOrder(
        processedOrder.symbol,
        processedOrder.order_type,
        processedOrder.price,
        processedOrder.quantity,
        processedOrder.secnum
      );

      matchingEngine.execute(order, (ask_executions, bid_executions) => {
        // After matching orders, publish the executions (order fills) to Kafka
        ask_executions.forEach((execution) => {
          producer.send({
            topic: "order_fills",
            messages: [{ key: execution.symbol, value: JSON.stringify({ ...execution, type: "ask" }) }],
          });
        });

        bid_executions.forEach((execution) => {
          producer.send({
            topic: "order_fills",
            messages: [{ key: execution.symbol, value: JSON.stringify({ ...execution, type: "bid" }) }],
          });
        });
        observer.complete();  // Signal the completion of order processing
      });

      // Simulate asynchronous processing
      setTimeout(() => {
        observer.next(processedOrder);
      }, 1000);
    });
  })
).subscribe({
  next: (order) => {
    console.log(`Processed order: ${JSON.stringify(order)}`);
  },
  complete: () => {
    console.log("Order processing completed.");
  },
});

// Helper function to process an order
function processOrder(order) {
  order.secnum = new SequentialNumberGenerator().getNext();
  order.price = parseFloat(order.price);
  order.quantity = parseInt(order.quantity);
  return order;
}

// Connect to Kafka producer and start the process
connectKafkaProducer().then(consumeAndForwardOrders);
