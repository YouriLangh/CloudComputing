import React, { useEffect, useState } from "react";
import OrderBookChart from "./OrderBookChart";
import PriceEvolutionChart from "./PriceEvolutionChart";
const App = () => {
  const [ws, setWs] = useState(null);
  const [orderBook, setOrderBook] = useState({ bids: {}, asks: {} });
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");
  const [averages, setAverages] = useState([]);
  const symbols = ["AAPL", "GOOGL", "MSFT", "AMZN"];

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
      if (message.type === "initial") {
        const { orderBook, averages } = message.data;
        console.log("Initial data received:", orderBook, averages);
        setOrderBook(orderBook);
        setAverages(averages);
      } else if (message.type === "orderbook") {
        const { orderBook } = message.data;
        setOrderBook(orderBook);
      } else if (message.type === "averages") {
        const averages = message.data;
        setAverages(averages);
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

  return (
    <div className="container">
      <div className="controls">
        <select
          value={selectedSymbol}
          onChange={(e) => setSelectedSymbol(e.target.value)}
        >
          {symbols.map((symbol) => (
            <option key={symbol} value={symbol}>
              {symbol}
            </option>
          ))}
        </select>
      </div>
      <OrderBookChart orderBookData={orderBook} />
      <PriceEvolutionChart averages={averages} />
    </div>
  );
};

export default App;
