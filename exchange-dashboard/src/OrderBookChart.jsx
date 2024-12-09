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
  const bidPrices = Object.keys(bids).map(parseFloat);
  const askPrices = Object.keys(asks).map(parseFloat);
  const allPrices = Array.from(new Set([...bidPrices, ...askPrices])).sort(
    (a, b) => a - b
  );
  const minPrice = allPrices[0];
  const maxPrice = allPrices[allPrices.length - 1];

  // Prepare data for the chart (combine bids and asks into a single field)
  const data = allPrices.map((price) => {
    const isBid = bids[price] !== undefined;
    return {
      price, // Ensure price is a numeric value
      value: isBid ? bids[price] : asks[price],
      fill: isBid ? "green" : "red", // Dynamically set the fill color
    };
  });

  // Custom Tooltip Component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const { fill, value } = payload[0].payload;
      const type = fill === "green" ? "Bid" : "Ask";

      return (
        <div
          className="custom-tooltip"
          style={{ backgroundColor: "white", border: "1px solid black" }}
        >
          <div style={{ display: "inline-block", padding: 10 }}>
            <div style={{ color: fill }}>
              {type}: {value}
            </div>
            <div style={{ color: fill }}>at ${label}</div>
          </div>
        </div>
      );
    }

    return null;
  };

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
          domain={minPrice !== undefined && maxPrice !== undefined ? [minPrice, maxPrice] : undefined}
          label={{ value: "Order Price", position: "insideBottom", offset: -5 }}
        />
        <YAxis
          label={{
            value: "Cumulative Amount",
            angle: -90,
            position: "insideLeft",
          }}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "gray" }} />
        <Bar
          dataKey="value"
          fill="#8884d8"
          name="Order Volume"
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default OrderBookChart;
