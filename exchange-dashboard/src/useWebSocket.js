// src/hooks/useWebSocket.js
import { useEffect } from "react";

const useWebSocket = (url, setOrderBookData, setPriceEvolutionData) => {
  useEffect(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log("Connected to WebSocket server");
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log("Received message from WebSocket server:", message);
      if (message.type === "priceEvolution")
      console.log("Received price evolution data from WebSocket server:", message.data);
    else if(message.type === "order") {
        const { price, symbol, quantity, order_type, secnum } = message.data;
        if (order_type === "bid") {
          const bids = orderBookData[symbol].bids;
          bids.set(price, (bids.get(price) || 0) + quantity);
        } else if (order_type === "ask") {
          const asks = orderBookData[symbol].asks;
          asks.set(price, (asks.get(price) || 0) + quantity);
        }
        setOrderBookData({ ...orderBookData }); // Update the order book data
      } else if (message.type === "execution") {
        const { price, symbol, quantity, side, secnum } = message.data;
        const book = side === "bid" ? orderBookData[symbol].bids : orderBookData[symbol].asks;
        if (book.has(price)) {
          let remainingQuantity = book.get(price) - quantity;
          if (remainingQuantity === 0) {
            book.delete(price); // Remove the ask if quantity goes to zero
          } else {
            book.set(price, remainingQuantity); // Update the ask with remaining quantity
          }
        }
      }
        else if (message.type === "initialData")
        setOrderBookData(message.orderBook); // Update the order book data directly
        setPriceEvolutionData(message.averages); // Update the price evolution data directly
    };

    ws.onclose = () => {
      console.log("Disconnected from WebSocket server");
    };

    return () => {
      ws.close(); // Cleanup on component unmount
    };
  }, [url, setOrderBookData]); // Dependency on setOrderBookData
};

export default useWebSocket;
