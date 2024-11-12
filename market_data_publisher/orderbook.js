const Heap = require('heap');

function createSideHeaps() {
    return {
        asks: new Heap((a, b) => a.price - b.price), // Min-heap for asks (ascending price)
        bids: new Heap((a, b) => b.price - a.price)  // Max-heap for bids (descending price)
    };
}

class Order {
    constructor(symbol = '', side = '', price = 0, quantity = 0, secnum = 0) {
        this.symbol = symbol;
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
    addOrder(order) {
        const orderBookSide = this.symbol_order_book_map.get(order.symbol);
        if (!orderBookSide) return;

        if (order.side === 'ask') {
            orderBookSide.asks.push(order);
        } else if (order.side === 'bid') {
            orderBookSide.bids.push(order);
        }
    }

    // Remove specific quantities from the top of the heap
    removeTopQuantity(symbol, side, quantityToRemove) {
        const orderBookSide = this.symbol_order_book_map.get(symbol);
        if (!orderBookSide) return;

        const heap = side === 'ask' ? orderBookSide.asks : orderBookSide.bids;
        const topOrder = heap.peek();
        if (!heap.empty() && topOrder.quantity <= quantityToRemove) {
            // Remove the entire top order if quantity to remove is greater or equal
            // Note: should never be smaller.
            quantityToRemove -= topOrder.quantity;
            heap.pop();
        } else {
            // Reduce the quantity of the top order
            topOrder.quantity -= quantityToRemove;
            quantityToRemove = 0;
            }
    }
}


module.exports = { OrderBook, Order };