import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
const socket = new WebSocket("ws://market-data-publisher:8080");

socket.onopen = () => {
  console.log("Connected to the WebSocket server");
};

socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === "order") {
    // Handle the new order data
    console.log("New order:", message.data);
  } else if (message.type === "fill") {
    // Handle the execution fill data
    console.log("New fill:", message.data);
  }
};

socket.onclose = () => {
  console.log("Disconnected from WebSocket server");
};

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
