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
    const orderBookSide =
      this.symbol_order_book.symbol_order_book_map.get(symbol);
    if (!orderBookSide) return;
    console.log(
      "Order book before adjustment: ",
      JSON.stringify(this.symbol_order_book.toJSON())
    );
    const heap = side === "ask" ? orderBookSide.asks : orderBookSide.bids;
    let orderIndex = this.findOrderIndex(heap, secnum);
    cons;
    if (orderIndex === -1) {
      console.log(`Order with secnum ${secnum} not found.`);
      return;
    }

    // Adjust quantity
    const order = heap.nodes[orderIndex].order;
    if (order.quantity > quantityToRemove) {
      order.quantity -= quantityToRemove;
    } else {
      // Remove order by replacing it with the last element, pop, and re-heapify
      heap.nodes[orderIndex] = heap.nodes[heap.size() - 1];
      heap.pop();
      heap._heapifyUp(orderIndex);
      heap._heapifyDown(orderIndex);
    }

    console.log(
      "Order book after adjustment: ",
      JSON.stringify(this.symbol_order_book.toJSON())
    );
  }

  // Helper function to find the index of an order by secnum in the heap
  findOrderIndex(heap, secnum) {
    for (let i = 0; i < heap.size(); i++) {
      if (heap.nodes[i].order.secnum === secnum) {
        return i;
      }
    }
    return -1;
  }

  toJSON() {
    const orderBookJSON = {};
    for (const [symbol, { asks, bids }] of this.symbol_order_book_map) {
      orderBookJSON[symbol] = {
        asks: asks.toArray().sort((a, b) => a.price - b.price), // Ascending for asks
        bids: bids.toArray().sort((a, b) => a.price - b.price), // Descending for bids
      };
    }
    return orderBookJSON;
  }
}

module.exports = { OrderBook, Order };
