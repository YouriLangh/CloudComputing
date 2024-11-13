import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const OrderBookChart = ({ orderBookData }) => {
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");

  // Function to prepare the chart data for selected symbol
  const prepareChartData = (symbol) => {
    const orderBook = orderBookData[symbol];

    // Prepare bid and ask data
    const bidData = orderBook.bids.map((bid) => ({
      price: bid.price,
      quantity: bid.quantity,
      side: "Bid",
    }));
    const askData = orderBook.asks.map((ask) => ({
      price: ask.price,
      quantity: ask.quantity,
      side: "Ask",
    }));

    // Combine bids and asks into one dataset
    return [...bidData, ...askData];
  };

  const chartData = prepareChartData(selectedSymbol);

  return (
    <div>
      <h2>Order Book for {selectedSymbol}</h2>
      <select
        onChange={(e) => setSelectedSymbol(e.target.value)}
        value={selectedSymbol}
      >
        {Object.keys(orderBookData).map((symbol) => (
          <option key={symbol} value={symbol}>
            {symbol}
          </option>
        ))}
      </select>

      <div style={{ width: "100%", height: "400px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="price" tickFormatter={(value) => value.toFixed(2)} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="quantity"
              fill="rgba(75, 192, 192, 0.5)"
              barSize={20}
              radius={[5, 5, 0, 0]}
              data={chartData.filter((item) => item.side === "Bid")}
            />
            <Bar
              dataKey="quantity"
              fill="rgba(255, 99, 132, 0.5)"
              barSize={20}
              radius={[5, 5, 0, 0]}
              data={chartData.filter((item) => item.side === "Ask")}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default OrderBookChart;
