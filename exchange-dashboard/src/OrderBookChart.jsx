import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const OrderBookChart = ({ orderBookData }) => {
  const { bids, asks } = orderBookData;

  // Extract unique prices from bids and asks
  const bidPrices = Object.keys(bids).map(Number);
  const askPrices = Object.keys(asks).map(Number);
  const allPrices = Array.from(new Set([...bidPrices, ...askPrices])).sort(
    (a, b) => a - b
  );
  const minPrice = allPrices[0];
  const maxPrice = allPrices[allPrices.length - 1];

  // Prepare data for the chart
  const data = allPrices.map((price) => ({
    price,
    bids: bids[price] || null,
    asks: asks[price] || null,
  }));

  return (
    <ResponsiveContainer width="100%" height={700}>
      <BarChart
        width={800}
        height={400}
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="price"
          domain={[minPrice, maxPrice]}
          label={{ value: "Order Price", position: "insideBottom", offset: -5 }}
        />
        <YAxis
          label={{
            value: "Cumulative Amount",
            angle: -90,
            position: "insideLeft",
          }}
        />
        <Tooltip />
        <Tooltip
          formatter={(value, name) =>
            value !== null ? [value, name === "bids" ? "Bids" : "Asks"] : null
          }
        />
        <Bar dataKey="bids" fill="green" />
        <Bar dataKey="asks" fill="red" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default OrderBookChart;
