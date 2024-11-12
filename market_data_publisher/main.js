const { Kafka } = require("kafkajs");
const { OrderBook, EngineOrder } = require("/app/matching-engine");

const kafka = new Kafka({ brokers: ["kafka:9092"] });
const consumer = kafka.consumer({ groupId: "market_data_group" });

let orderbook = new OrderBook(["AAPL", "GOOGL", "MSFT", "AMZN"]);

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
    current_book.asks.push({ price_level: order.price, order: order });
    } else {
    current_book.bids.push({ price_level: order.price, order: order });
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
    const current_book = orderbook.symbol_order_book_map.get(order.symbol);
    const heap = order_type === 'ask' ? current_book.asks : current_book.bids;
  // Process fill data for the order book or any real-time UI updates
  //console.log("Processing fill for dashboard:", fill);
//   publishToDashboard(fill, "fill");
  // Attempt to remove the order with the given ID from the heap
  removeOrderFromHeap(heap, id);
  console.log('Processing fill for dashboard:', order);
  console.log(current_book)
}

function publishToDashboard(data, type) {
  // Code to publish data to the dashboard (e.g., via WebSocket)
  // console.log(`Publishing ${type} to dashboard:`, data);
}

// Remove a specific order from a heap
function removeOrderFromHeap(heap, orderId) {
    // Locate the index of the order with the given ID
    const index = heap.findIndex(item => item.order.id === orderId);
    
    if (index === -1) {
        console.log(`Order with ID ${orderId} not found in heap`);
        return;
    }
  
    // Swap with the last element and pop
    [heap[index], heap[heap.length - 1]] = [heap[heap.length - 1], heap[index]];
    heap.pop();
  
    // Re-heapify to maintain heap property
    heapifyDown(heap, index);
  }
  
  // Helper function to restore heap order
  function heapifyDown(heap, index) {
    let largest = index;
    const left = 2 * index + 1;
    const right = 2 * index + 2;
  
    if (left < heap.length && heap[left].price_level > heap[largest].price_level) {
        largest = left;
    }
  
    if (right < heap.length && heap[right].price_level > heap[largest].price_level) {
        largest = right;
    }
  
    if (largest !== index) {
        [heap[index], heap[largest]] = [heap[largest], heap[index]];
        heapifyDown(heap, largest);
    }
  }


startMarketDataPublisher();
