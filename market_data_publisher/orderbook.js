const Heap = require("heap");

function createSideHeaps() {
  return {
    asks: new Heap((a, b) => a.price - b.price), // Min-heap for asks (ascending price)
    bids: new Heap((a, b) => b.price - a.price), // Max-heap for bids (descending price)
  };
}

class Order {
  constructor(side = "", price = 0, quantity = 0, secnum = 0) {
    this.side = side;
    this.price = price;
    this.quantity = quantity;
    this.secnum = secnum;
  }
}

class OrderBook {
  constructor(symbols = []) {
    this.symbol_order_book_map = new Map();
    for (const sym of symbols) {
      this.symbol_order_book_map.set(sym, createSideHeaps());
    }
  }

  // Add a new order to the order book
  addOrder(symbol, order) {
    const orderBookSide = this.symbol_order_book_map.get(symbol);
    if (!orderBookSide) return;

    if (order.side === "ask") {
      orderBookSide.asks.push(order);
    } else if (order.side === "bid") {
      orderBookSide.bids.push(order);
    }
  }

  adjustOrRemoveOrder(symbol, side, secnum, quantityToRemove) {
    const orderBookSide = this.symbol_order_book_map.get(symbol);
    if (!orderBookSide) return;

    const heap = side === "ask" ? orderBookSide.asks : orderBookSide.bids;
    console.log("orderbook before delete: ", heap);
    const orderIndex = heap
      .toArray()
      .findIndex((order) => order.secnum === secnum);

    if (orderIndex === -1) {
      console.log(`Order with secnum ${secnum} not found.`);
      return;
    }

    const order = heap.toArray()[orderIndex];

    // Adjust the quantity
    if (order.quantity > quantityToRemove) {
      order.quantity -= quantityToRemove;
      heap.heapify(); // Re-heapify to maintain heap structure
    } else {
      // If quantity reaches zero, remove the order from the heap
      heap.toArray().splice(orderIndex, 1);
      heap.heapify(); // Re-heapify after removing
    }
    console.log("orderbook after delete: ", heap);
  }

  toJSON() {
    const orderBookJSON = {};
    for (const [symbol, { asks, bids }] of this.symbol_order_book_map) {
      orderBookJSON[symbol] = {
        asks: asks.toArray().sort((a, b) => a.price_level - b.price_level), // Ascending for asks
        bids: bids.toArray().sort((a, b) => b.price_level - a.price_level), // Descending for bids
      };
    }
    return orderBookJSON;
  }
}

module.exports = { OrderBook, Order };
