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
  Cell,
} from "recharts";

const OrderBookChart = ({ orderBookData }) => {
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");

  // Function to prepare the chart data for the selected symbol
  const prepareChartData = (symbol) => {
    const orderBook = orderBookData[symbol];

    // Check if orderBook exists for the selected symbol
    if (!orderBook) {
      return []; // Return an empty array if no data is available
    }

    // Prepare combined data with both bids and asks
    const combinedData = [
      ...orderBook.bids.map((bid) => ({
        price: bid.price,
        quantity: bid.quantity,
        side: "Bid",
      })),
      ...orderBook.asks.map((ask) => ({
        price: ask.price,
        quantity: ask.quantity,
        side: "Ask",
      })),
    ];
    return combinedData
  };

  const chartData = prepareChartData(selectedSymbol);

  // Function to determine the color based on the side (Bid or Ask)
  const getBarColor = (side) => {
    return side === "Bid" ? "rgba(75, 192, 192, 0.5)" : "rgba(255, 99, 132, 0.5)";
  };

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
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="price"
              tickFormatter={(value) => value.toFixed(2)} // Format price with 2 decimal places
            />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="quantity"
              barSize={20}
              radius={[5, 5, 0, 0]}
              name="Orders"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getBarColor(entry.side)} // Apply color based on side (Bid or Ask)
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default OrderBookChart;
