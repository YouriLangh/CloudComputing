import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const OrderBookChart = ({ orderBookData }) => {
  const { bids, asks } = orderBookData;

  // Prepare chart data using the provided cumulative bids and asks
  const bidPrices = Object.keys(bids).map(Number).sort((a, b) => b - a); // Sort bids descending
  const askPrices = Object.keys(asks).map(Number).sort((a, b) => a - b); // Sort asks ascending

  const data = [];

  // Create data array for bids
  bidPrices.forEach((price) => {
    data.push({ price, bids: bids[price], asks: 0 });
  });

  // Create data array for asks
  askPrices.forEach((price) => {
    data.push({ price, bids: 0, asks: asks[price] });
  });

  // Sort by price for correct alignment
  const sortedData = data.sort((a, b) => a.price - b.price);

  return (
    <ResponsiveContainer width={700} height={700}>
    <BarChart
      width={800}
      height={400}
      data={sortedData}
      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
    >
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="price" label={{ value: "Order Price", position: "insideBottom", offset: -5 }} />
      <YAxis label={{ value: "Cumulative Amount", angle: -90, position: "insideLeft" }} />
      <Tooltip />
      <Bar dataKey="bids" fill="green" stackId="orders" />
      <Bar dataKey="asks" fill="red" stackId="orders" />
    </BarChart>
    </ResponsiveContainer>
  );
};

export default OrderBookChart;
