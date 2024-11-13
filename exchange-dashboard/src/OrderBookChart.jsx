import React, { useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const OrderBookChart = ({ orderBookData }) => {
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");

  // Function to prepare the chart data for selected symbol
  const prepareChartData = (symbol) => {
    const orderBook = orderBookData[symbol];

    // Prepare labels and data for chart
    const bidPrices = orderBook.bids.map((bid) => bid.price);
    const bidQuantities = orderBook.bids.map((bid) => bid.quantity);
    const askPrices = orderBook.asks.map((ask) => ask.price);
    const askQuantities = orderBook.asks.map((ask) => ask.quantity);

    return {
      labels: [...bidPrices, ...askPrices], // Combine bid and ask prices in one set of labels
      datasets: [
        {
          label: "Bids",
          data: [...bidQuantities], // Bid quantities
          backgroundColor: "rgba(75, 192, 192, 0.5)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
        },
        {
          label: "Asks",
          data: [...askQuantities], // Ask quantities
          backgroundColor: "rgba(255, 99, 132, 0.5)",
          borderColor: "rgba(255, 99, 132, 1)",
          borderWidth: 1,
        },
      ],
    };
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
        <Bar
          data={chartData}
          options={{
            responsive: true,
            plugins: {
              title: {
                display: true,
                text: "Order Book - Bids and Asks",
              },
              tooltip: {
                mode: "index",
                intersect: false,
              },
            },
            scales: {
              x: {
                title: {
                  display: true,
                  text: "Price",
                },
                ticks: {
                  callback: function (value) {
                    return value.toFixed(2); // Display price as 2 decimals
                  },
                },
              },
              y: {
                title: {
                  display: true,
                  text: "Quantity",
                },
                beginAtZero: true,
              },
            },
          }}
        />
      </div>
    </div>
  );
};

export default OrderBookChart;
