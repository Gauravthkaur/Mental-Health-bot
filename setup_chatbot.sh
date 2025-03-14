#!/bin/bash

# Exit on error
set -e

echo "🚀 Setting up Mental Health Chatbot Frontend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install it from https://nodejs.org/"
    exit 1
fi

# Check if npx is available
if ! command -v npx &> /dev/null; then
    echo "❌ npx is not installed. Please install it using: npm install -g npx"
    exit 1
fi

# Create frontend directory
npx create-react-app frontend
cd frontend || exit

# Install dependencies
npm install axios

# Create components directory
mkdir -p src/components

# Create Chatbot component
cat > src/components/Chatbot.js <<EOL
import React, { useState } from "react";
import axios from "axios";

const Chatbot = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMessage = { sender: "user", text: input };
        setMessages([...messages, userMessage]);

        try {
            const response = await axios.post("http://127.0.0.1:5000/chat", { message: input });
            const botMessage = { sender: "bot", text: response.data.response };
            setMessages([...messages, userMessage, botMessage]);
        } catch (error) {
            console.error("Error sending message:", error);
        }

        setInput("");
    };

    return (
        <div style={{ width: "400px", margin: "20px auto", padding: "10px", border: "1px solid #ccc", borderRadius: "8px" }}>
            <h2>🧠 Mental Health Chatbot</h2>
            <div style={{ height: "300px", overflowY: "auto", padding: "10px", border: "1px solid #ddd" }}>
                {messages.map((msg, index) => (
                    <div key={index} style={{ textAlign: msg.sender === "user" ? "right" : "left", margin: "5px 0" }}>
                        <strong>{msg.sender === "user" ? "You" : "Bot"}:</strong> {msg.text}
                    </div>
                ))}
            </div>
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message..." style={{ width: "80%", padding: "8px" }} />
            <button onClick={sendMessage} style={{ padding: "8px", marginLeft: "5px" }}>Send</button>
        </div>
    );
};

export default Chatbot;
EOL

# Modify App.js
cat > src/App.js <<EOL
import React from "react";
import Chatbot from "./components/Chatbot";

function App() {
    return (
        <div>
            <Chatbot />
        </div>
    );
}

export default App;
EOL

echo "✅ Frontend setup complete!"
echo "📌 To start the frontend, run: cd frontend && npm start"
