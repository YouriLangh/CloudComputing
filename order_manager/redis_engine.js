const { MatchingEngine, EngineOrder } = require('./matching-engine');
const Redis = require('ioredis');
const Heap = require('heap'); 
class RedisMatchingEngine extends MatchingEngine {
    constructor(symbols = [], redisClient) {
        super(symbols); // Initialize the base MatchingEngine with symbols
        this.redis = redisClient; // Use the passed Redis client
    }

    /**
     * This function overrides the original execute method to add Redis support.
     * We cache the state of the order book in Redis to improve scalability.
     * @param {EngineOrder} order 
     * @param {Function} executionHandler 
     */
    async execute(order = new EngineOrder, executionHandler) {
        // First, try to get the order book from Redis
        let current_book = await this.getOrderBookFromRedis(order.symbol);

        if (!current_book) {
            // If the order book isn't found in Redis, use the base class's in-memory order book
            current_book = this.symbol_order_book.symbol_order_book_map.get(order.symbol);
        }

        // Perform the order matching using the inherited execute method
        await super.execute(order, executionHandler);

        // After executing, save the updated order book back to Redis
        await this.saveOrderBookToRedis(order.symbol, current_book);
    }

    /**
     * Save the current order book to Redis.
     * @param {string} symbol 
     * @param {Object} orderBook 
     */
    async saveOrderBookToRedis(symbol, orderBook) {
        const orderBookData = {
            asks: orderBook.asks.toArray(),
            bids: orderBook.bids.toArray()
        };
        await this.redis.set(`orderBook:${symbol}`, JSON.stringify(orderBookData));
    }

    /**
     * Get the order book from Redis. If not found, return null.
     * @param {string} symbol 
     * @returns {Object|null}
     */
    async getOrderBookFromRedis(symbol) {
        const orderBookData = await this.redis.get(`orderBook:${symbol}`);
        if (orderBookData) {
            const parsedData = JSON.parse(orderBookData);
            const current_book = createSideHeaps();
            current_book.asks = new Heap((a, b) => a.price_level - b.price_level);
            current_book.bids = new Heap((a, b) => b.price_level - a.price_level);

            parsedData.asks.forEach(item => current_book.asks.push(item));
            parsedData.bids.forEach(item => current_book.bids.push(item));

            return current_book;
        }
        return null;
    }
}

module.exports = { RedisMatchingEngine };
