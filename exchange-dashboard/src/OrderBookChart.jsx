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

  // Prepare data for the chart
  const data = allPrices.map((price) => ({
    price: price, // Ensure price is a numeric value
    bids: bids[price] || null,
    asks: asks[price] || null,
  }));
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="custom-tooltip"
          style={{ backgroundColor: "white", border: "1px solid black" }}
        >
          <div>
            {payload.map((pld, index) => (
              <div
                key={index} // Add a unique key here
                style={{ display: "inline-block", padding: 10 }}
              >
                <div style={{ color: pld.fill }}>
                  {pld.value} {pld.dataKey}
                </div>
                <div style={{ color: pld.fill }}>at {`$${label}`}</div>
              </div>
            ))}
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
        <Bar dataKey="bids" fill="green" />
        <Bar dataKey="asks" fill="red" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default OrderBookChart;
