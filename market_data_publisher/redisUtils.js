const redis = require("redis");

const redisClient = redis.createClient({
    url: `redis://${process.env.REDIS_HOST || "redis-service"}:${process.env.REDIS_PORT || 6379}`,
  });

redisClient.on("error", (err) => console.error("Redis Error", err));

async function connectRedis() {
    try {
      await redisClient.connect(); // Explicitly wait for the connection
      console.log("Connected to Redis!");
    } catch (err) {
      console.error("Failed to connect to Redis", err);
      throw err; // Ensure that you stop further execution if connection fails
    }
  }

// Function to set an order book for a given symbol
async function setOrderBook(symbol, orderBook) {
  try {
    await redisClient.set(`orderbook:${symbol}`, JSON.stringify(orderBook));
  } catch (err) {
    console.error(`Error setting order book for ${symbol}`, err);
    throw err;
  }
}

async function getOrderBook(symbol) {
  try {
    const orderBookData = await redisClient.get(`orderbook:${symbol}`);
    return orderBookData ? JSON.parse(orderBookData) : null;
  } catch (err) {
    console.error(`Error getting order book for ${symbol}`, err);
    throw err;
  }
}

async function setAverages(symbol, averages) {
  try {
    await redisClient.set(`average:${symbol}`, JSON.stringify(averages));
  } catch (err) {
    console.error(`Error setting averages for ${symbol}`, err);
    throw err;
  }
}

async function getAverages(symbol) {
  try {
    const averages = await redisClient.get(`average:${symbol}`);
    return averages ? JSON.parse(averages) : [];
  } catch (err) {
    console.error(`Error getting averages for ${symbol}`, err);
    throw err;
  }
}



// Initialize state for symbols
async function initializeState(symbols) {
    await connectRedis(); // Ensure the Redis client is connected before initializing state
  
    const orderBooks = {};
    const averagePriceHistory = {};
  
    for (const symbol of symbols) {
      const orderBook = await getOrderBook(symbol);
      orderBooks[symbol] = orderBook || { bids: {}, asks: {} };
  
      const averages = await getAverages(symbol);
      averagePriceHistory[symbol] = averages || [];
    }
    return { orderBooks, averagePriceHistory };
  }

module.exports = {
  setOrderBook,
  setAverages,
  initializeState,
};
