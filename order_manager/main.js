const amqp = require("amqplib");
const { Kafka } = require("kafkajs");
const { MatchingEngine, EngineOrder } = require('/app/matching-engine');

let matchingEngine = new MatchingEngine(['AAPL', 'GOOGL', 'MSFT', 'AMZN']);

// Kafka setup
const kafka = new Kafka({ brokers: ["kafka:9092"] });
const producer = kafka.producer();

async function connectKafkaProducer() {
    await producer.connect();
    console.log("Connected to Kafka producer.");
}

// Execution handler for the matching engine
async function executionHandler(ask_executions, bid_executions) {
    // console.log("Ask executions:", ask_executions);
    // console.log("Bid executions:", bid_executions);

    // Publish executions to Kafka Streams
    for (const execution of ask_executions) {
        await producer.send({
            topic: "order_fills",
            messages: [{ value: JSON.stringify({ ...execution, type: "ask" }) }],
        });
    }
    for (const execution of bid_executions) {
        await producer.send({
            topic: "order_fills",
            messages: [{ value: JSON.stringify({ ...execution, type: "bid" }) }],
        });
    }
}

const ORDER_MANAGER_QUEUE = "order_manager_queue"; // Queue for validated orders
const RABBITMQ_URL = "amqp://rabbitmq"; // RabbitMQ connection URL

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
                const { price, symbol, quantity, order_type } = JSON.parse(msg.content.toString());

                // Create an EngineOrder instance from the parsed data
                const order = new EngineOrder(symbol, order_type, parseFloat(price), parseInt(quantity), seqGen.getNext());

                // console.log(`Order received: ${order.side} ${order.quantity} of ${order.symbol} at ${order.price}`);
                await producer.send({
                  topic: "orders",
                  messages: [{ value: JSON.stringify(order) }],
              });

                matchingEngine.execute(order, executionHandler);

                // Acknowledge the message upon successful processing
                channel.ack(msg);
            }
        });
    } catch (error) {
        console.error("Failed to consume and forward orders:", error);
    }
}

// Connect to Kafka and start consuming orders
connectKafkaProducer().then(consumeAndForwardOrders);
