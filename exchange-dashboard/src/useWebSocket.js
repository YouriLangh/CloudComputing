// src/hooks/useWebSocket.js
import { useEffect, useState } from 'react';

const useWebSocket = (url) => {
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        const ws = new WebSocket(url);

        ws.onopen = () => {
            console.log("Connected to WebSocket server");
        };

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            console.log("Received message from WebSocket server:", message);
            setMessages((prevMessages) => [...prevMessages, message]);
        };

        ws.onclose = () => {
            console.log("Disconnected from WebSocket server");
        };

        return () => {
            ws.close(); // Cleanup on component unmount
        };
    }, [url]);

    return messages;
};

export default useWebSocket;
