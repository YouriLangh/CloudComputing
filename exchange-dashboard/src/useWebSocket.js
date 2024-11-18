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

      if (message.type === "orderBook") {
        setOrderBookData(message.data); // Update the order book data directly
      } else if (message.type === "priceEvolution")
      console.log("Received price evolution data from WebSocket server:", message.data);
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
