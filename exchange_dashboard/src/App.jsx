import { useState, useEffect } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';

const socket = new WebSocket("ws://market-data-publisher:8080");

function App() {
  // State to store orders and fills
  const [orders, setOrders] = useState([]);
  const [fills, setFills] = useState([]);

  useEffect(() => {
    // WebSocket event listeners
    socket.onopen = () => {
      console.log("Connected to the WebSocket server");
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "order") {
        // Update the orders state with the new order data
        setOrders((prevOrders) => [...prevOrders, message.data]);
        console.log("New order:", message.data);
      } else if (message.type === "fill") {
        // Update the fills state with the new fill data
        setFills((prevFills) => [...prevFills, message.data]);
        console.log("New fill:", message.data);
      }
    };

    socket.onclose = () => {
      console.log("Disconnected from WebSocket server");
    };

    // Cleanup function to close WebSocket connection when component unmounts
    return () => {
      socket.close();
    };
  }, []);

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
