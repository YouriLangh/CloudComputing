// src/components/Dashboard.jsx
import React from "react";
import useWebSocket from "./useWebSocket";
import OrderBookChart from "./OrderBookChart";
const Dashboard = () => {
  // Use the environment variable URL or default to localhost for WebSocket
  const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || "ws://localhost:8080";
  const messages = useWebSocket(wsUrl);
  //   const orderBookData =
  //     messages.find((msg) => msg.type === "orderBook")?.data || {};
  const orderBookData = {
    AAPL: {
      asks: [
        { side: "ask", price: 102.8, quantity: 19, secnum: 14 },
        { side: "ask", price: 106.62, quantity: 27, secnum: 24 },
        { side: "ask", price: 105.95, quantity: 76, secnum: 28 },
      ],
      bids: [
        { side: "bid", price: 108.88, quantity: 19, secnum: 22 },
        { side: "bid", price: 108.04, quantity: 8, secnum: 21 },
        { side: "bid", price: 106.44, quantity: 16, secnum: 26 },
        { side: "bid", price: 106.36, quantity: 85, secnum: 13 },
        { side: "bid", price: 106.64, quantity: 12, secnum: 11 },
      ],
    },
  };

  return (
    <div>
      <h2>Order Book Dashboard</h2>
      <div>
        <h3>Real-Time Updates</h3>
        <ul>
          {messages.map((msg, index) => (
            <li key={index}>
              {msg.type === "orderBook" ? (
                <span>New Orderbook: {JSON.stringify(msg.data)}</span>
              ) : (
                <span>Price Evolution: {JSON.stringify(msg.data)}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
      <OrderBookChart orderBookData={orderBookData} />
    </div>
  );
};

export default Dashboard;
