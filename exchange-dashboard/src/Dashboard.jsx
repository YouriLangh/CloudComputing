// src/components/Dashboard.jsx
import React, { useState } from "react";
import useWebSocket from "./useWebSocket";
import OrderBookChart from "./OrderBookChart";

const Dashboard = () => {
  // Use the environment variable URL or default to localhost for WebSocket
  const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || "ws://localhost:8080";

  // State to store the order book data
  const [orderBookData, setOrderBookData] = useState({
    "AAPL": { bids: new Map(), asks: new Map() },
    "GOOGL": { bids: new Map(), asks: new Map() },
    "MSFT": { bids: new Map(), asks: new Map() },
    "AMZN": { bids: new Map(), asks: new Map() },
  });
  
  const [priceEvolutionData, setPriceEvolutionData] = useState(new Map());

  // Use the WebSocket hook and pass setOrderBookData to it
  useWebSocket(wsUrl, setOrderBookData, setPriceEvolutionData);

  return (
    <div>
      <h2>Order Book Dashboard</h2>
      <span>{priceEvolutionData && JSON.stringify(priceEvolutionData)}</span>
      <div>
        <h3>Real-Time Updates</h3>
        <OrderBookChart orderBookData={orderBookData} />
      </div>
    </div>
  );
};

export default Dashboard;
