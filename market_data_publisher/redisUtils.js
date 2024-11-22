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
  return new Promise((resolve, reject) => {
    redisClient.set(`orderbook:${symbol}`, JSON.stringify(orderBook), (err) => {
      if (err) {
        console.error(`Error setting order book for ${symbol}`, err);
        return reject(err);
      }
      resolve();
    });
  });
}

// Function to get an order book for a given symbol
async function getOrderBook(symbol) {
    console.log(`Getting order book for ${symbol}`);
    const orderBookData = await redisClient.get(`orderbook:${symbol}`);
    if(orderBookData){
        return JSON.parse(orderBookData);
    } else {
        return null;
    }
  }
  

// Function to get average prices for a given symbol
async function getAverages(symbol) {
    console.log(`Getting Averages for ${symbol}`);
    const averages = await redisClient.get(`average:${symbol}`)
    if(averages){
        return JSON.parse(averages);
    } else {
        return [];
    }
  }

// Function to set average prices for a given symbol
async function setAverages(symbol, averages) {
  return new Promise((resolve, reject) => {
    redisClient.set(`average:${symbol}`, JSON.stringify(averages), (err) => {
      if (err) {
        console.error(`Error setting averages for ${symbol}`, err);
        return reject(err);
      }
      resolve();
    });
  });
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
