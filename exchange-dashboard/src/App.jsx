import React, { useEffect, useState } from "react";
import OrderBookChart from "./OrderBookChart";
import PriceEvolutionChart from "./PriceEvolutionChart";
const App = () => {
    const [ws, setWs] = useState(null);
  const [orderBooks, setOrderBooks] = useState({
    AAPL: { bids: {}, asks: {} },
    GOOGL: { bids: {}, asks: {} },
    MSFT: { bids: {}, asks: {} },
    AMZN: { bids: {}, asks: {} },
  });
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");
  const [averages, setAverages] = useState([]);
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
        if(message.data.averages !== undefined && message.data.orderBook !== undefined){
          const { averages, orderBook } = message.data;
          console.log("Received averages:", averages);
          console.log("Received orderBook:", orderBook);
          if(averages.length > 0) setAverages(averages);
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
 <PriceEvolutionChart averages={averages}/>

    </div>
  );
};

export default App;
