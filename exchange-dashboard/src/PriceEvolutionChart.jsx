import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const PriceEvolutionChart = ({ averages }) => {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        data={averages}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="minuteTimestamp"
          label={{ value: "Time", position: "insideBottom", offset: -5 }}
          tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' })}
        />
        <YAxis
          label={{ value: "Price", angle: -90, position: "insideLeft" }}
          domain={['auto', 'auto']}
        />
        <Tooltip
          formatter={(value) => value.toFixed(2)}
          labelFormatter={(timestamp) => `Time: ${new Date(timestamp).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' })}`}
        />
        <Line type="monotone" dataKey="avgBidPrice" stroke="green" dot={false} name="Bid" />
        <Line type="monotone" dataKey="avgAskPrice" stroke="blue" dot={false} name="Ask" />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default PriceEvolutionChart;
