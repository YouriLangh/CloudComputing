const amqp = require("amqplib");
const { MatchingEngine, EngineOrder } = require('/app/matching-engine');

let matchingEngine = new MatchingEngine(['AAPL', 'GOOGL', 'MSFT', 'AMZN']);

// Execution handler for the matching engine
function executionHandler(ask_executions, bid_executions) {
// Log the executions
    console.log("Ask executions:", ask_executions);
    console.log("Bid executions:", bid_executions);
}

const ORDER_MANAGER_QUEUE = "order_manager_queue"; // Queue for validated orders to the Order Manager
// Connection settings for RabbitMQ
const RABBITMQ_URL = "amqp://rabbitmq"; // Update if RabbitMQ is hosted elsewhere

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
  
      console.log("Order manager is now consuming orders...");
  
      // Start consuming messages
      channel.consume(ORDER_MANAGER_QUEUE, async (msg) => {
        if (msg !== null) {
            const { price, symbol, quantity, order_type } = JSON.parse(msg.content.toString());

            // Create an EngineOrder instance from the parsed data
            const order = new EngineOrder(symbol, order_type, parseFloat(price), parseInt(quantity), seqGen.getNext());

            console.log(`Order received: ${order.side} ${order.quantity} of ${order.symbol} at ${order.price}`);
            matchingEngine.execute(order, executionHandler);
  
            channel.ack(msg); // Acknowledge the message upon successful forwarding
        }
      });
    } catch (error) {
      console.error("Failed to consume and forward orders:", error);
    }
  }

  consumeAndForwardOrders();