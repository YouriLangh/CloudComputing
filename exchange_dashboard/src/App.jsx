import { useState, useEffect } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

const socket = new WebSocket("ws://market_data_publisher:8080");

function App() {
  // State to store orders and fills
  const [orders, setOrders] = useState([]);
  const [fills, setFills] = useState([]);
  const wsUrl = import.meta.env.VITE_MDP_WS_URL || "ws://localhost:8080";
    // WebSocket event listeners
    socket.onopen = () => {
      console.log("Connected to the WebSocket server");
    };

    useEffect(() => {
      const ws = new WebSocket(wsUrl);
  
      ws.onopen = () => {
        console.log("Connected to Market Data Publisher WebSocket");
      };
  
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
  
        if (message.type === "order") {
          handleNewOrder(message.data);
        } else if (message.type === "fill") {
          handleOrderFill(message.data);
        }
      };
  
      ws.onclose = () => {
        console.log("Disconnected from Market Data Publisher WebSocket");
      };
  
      return () => {
        ws.close(); // Cleanup WebSocket connection on component unmount
      };
    }, [wsUrl]);

    function handleNewOrder(order) {
      console.log("New order received:", order);
      // Update order book visualization
  }
  
  function handleOrderFill(fill) {
      console.log("Order fill received:", fill);
      // Update order book or chart with the fill data
  }
  

  return (
    <div>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>

      <div className="card">
        <h2>Orders</h2>
        <ul>
          {orders.map((order, index) => (
            <li key={index}>
              {order.id}: {order.symbol} - {order.quantity} @ {order.price}
            </li>
          ))}
        </ul>

        <h2>Fills</h2>
        <ul>
          {fills.map((fill, index) => (
            <li key={index}>
              {fill.id}: {fill.symbol} - {fill.quantity} @ {fill.price}
            </li>
          ))}
        </ul>
      </div>

      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </div>
  );
}

export default App;
