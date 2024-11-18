import React, { useEffect, useState } from 'react';
import './App.css';

const App = () => {
  const [ws, setWs] = useState(null); // WebSocket connection
  const [orderBooks, setOrderBooks] = useState({
    AAPL: { bids: new Map(), asks: new Map() },
    GOOGL: { bids: new Map(), asks: new Map() },
    MSFT: { bids: new Map(), asks: new Map() },
    AMZN: { bids: new Map(), asks: new Map() },
  });
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');

  // Initialize WebSocket connection and subscribe to order book updates
  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8080');
    socket.onopen = () => {
      console.log('WebSocket connected');
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received data:', data);
      if (data.type === 'initialData') {
        // Handle initial data
        setOrderBooks(data.orderBook);
      } else if (data.type === 'order') {
        // Handle live updates to the order book
        updateOrderBook(data.data, data.type);
      }
    };

    socket.onclose = () => {
      console.log('WebSocket disconnected');
    };

    setWs(socket);

    return () => {
      socket.close(); // Clean up WebSocket on component unmount
    };
  }, []);

  // Update the order book based on received data (order or execution)
  const updateOrderBook = (data, type) => {
    const { symbol, price, quantity, order_type } = data;
    const updatedOrderBooks = { ...orderBooks };

    // Add or update the order in the order book
    if (order_type === 'bid') {
      const bids = updatedOrderBooks[symbol].bids;
      bids.set(price, (bids.get(price) || 0) + quantity);
    } else if (order_type === 'ask') {
      const asks = updatedOrderBooks[symbol].asks;
      asks.set(price, (asks.get(price) || 0) + quantity);
    }

    // Publish the updated order book
    setOrderBooks(updatedOrderBooks);
  };

  // Function to render the bids or asks table for a selected symbol
  const renderOrderBookTable = (side) => {
    const orders = orderBooks[selectedSymbol][side];
    const sortedOrders = [...orders.entries()].sort((a, b) => (side === 'bids' ? b[0] - a[0] : a[0] - b[0]));
    return (
      <tbody>
        {sortedOrders.map(([price, quantity]) => (
          <tr key={price}>
            <td>{price}</td>
            <td>{quantity}</td>
          </tr>
        ))}
      </tbody>
    );
  };

  return (
    <div className="container">
      <div className="controls">
        <button onClick={() => setSelectedSymbol('AAPL')}>AAPL</button>
        <button onClick={() => setSelectedSymbol('GOOGL')}>GOOGL</button>
        <button onClick={() => setSelectedSymbol('MSFT')}>MSFT</button>
        <button onClick={() => setSelectedSymbol('AMZN')}>AMZN</button>
      </div>

      <div className="orderbook">
        <h2>{selectedSymbol} Order Book</h2>
        <table className="orderbook-table">
          <thead>
            <tr>
              <th>Price</th>
              <th>Quantity</th>
            </tr>
          </thead>
          {renderOrderBookTable('bids')}
          {renderOrderBookTable('asks')}
        </table>
      </div>
    </div>
  );
};

export default App;
