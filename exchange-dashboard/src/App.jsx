import React, { useEffect, useState } from "react";
import OrderBookChart from "./OrderBookChart";
// import PriceEvolutionChart from "./PriceEvolutionChart";
const App = () => {
    const [ws, setWs] = useState(null);
  const [orderBooks, setOrderBooks] = useState({
    AAPL: { bids: {}, asks: {} },
    GOOGL: { bids: {}, asks: {} },
    MSFT: { bids: {}, asks: {} },
    AMZN: { bids: {}, asks: {} },
  });
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");

  useEffect(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "subscribe", symbol: selectedSymbol }));
    }
  }, [selectedSymbol]);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8080");

    socket.onopen = () => {
      console.log("WebSocket connected");
    };

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log("Received data:", message);
      
        if (message.type === "initialData") {
          setOrderBooks(message.orderBook);
        } else if (message.type === "order" || message.type === "execution") {
          updateOrderBook(message.data, message.type);
        } else if (message.type === "orderBookUpdate") {
          // Update the order book for the current symbol
          const { orderBook } = message.data;
          setOrderBooks((prevOrderBooks) => ({
            ...prevOrderBooks,
            [selectedSymbol]: orderBook,
          }));
        }
      };
    setWs(socket);

    socket.onclose = () => {
      console.log("WebSocket disconnected");
    };

    return () => {
      socket.close(); // Clean up WebSocket on component unmount
    };
  }, []);

  const updateOrderBook = (data, type) => {
    const { symbol, price, quantity, side } = data;
    const updatedOrderBooks = { ...orderBooks };

    // Determine the correct side of the order book
    const sideKey = side === "bid" ? "bids" : "asks";
    const orders = updatedOrderBooks[symbol][sideKey];

    if (type === "order") {
      // Add or update the quantity at the specified price
      orders[price] = (orders[price] || 0) + quantity;
    } else if (type === "execution") {
      // Subtract the executed quantity
      if (orders[price] !== undefined) {
        const remainingQuantity = orders[price] - quantity;
        if (remainingQuantity <= 0) {
          delete orders[price]; // Remove the price level if quantity is zero or less
        } else {
          orders[price] = remainingQuantity;
        }
      }
    }

    setOrderBooks(updatedOrderBooks);
  };


  return (
    <div className="container">
      <div className="controls">
  <select value={selectedSymbol} onChange={(e) => setSelectedSymbol(e.target.value)}>
    {Object.keys(orderBooks).map((symbol) => (
      <option key={symbol} value={symbol}>
        {symbol}
      </option>
    ))}
  </select>
</div>
<OrderBookChart orderBookData={orderBooks[selectedSymbol]} />
{/* <PriceEvolutionChart /> */}

    </div>
  );
};

export default App;
