// src/components/Dashboard.jsx
import React from 'react';
import useWebSocket from './useWebSocket';

const Dashboard = () => {
    // Use the environment variable URL or default to localhost for WebSocket
    const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || "ws://localhost:8080";
    const messages = useWebSocket(wsUrl);

    return (
        <div>
            <h2>Order Book Dashboard</h2>
            <div>
                <h3>Real-Time Updates</h3>
                <ul>
                    {messages.map((msg, index) => (
                        <li key={index}>
                            {msg.type === "orderBook" ? (
                                <span>New Orderbook: {JSON.stringify(msg.data)}</span>
                            ) : (
                                <span>Price Evolution: {JSON.stringify(msg.data)}</span>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default Dashboard;
