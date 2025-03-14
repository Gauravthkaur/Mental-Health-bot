import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./Chatbot.css";

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

const Chatbot = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [loadingFrame, setLoadingFrame] = useState(0);
    const [isMusicPlaying, setIsMusicPlaying] = useState(false);
    const [currentTrack, setCurrentTrack] = useState(0);
    const messagesEndRef = useRef(null);
    const audioRef = useRef(null);

    const loadingFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

    // Calming background music tracks
    const calmingTracks = [
        {
            title: "Peaceful Meditation",
            url: "https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3?filename=peaceful-meditation-amp-ambient-119180.mp3"
        },
        {
            title: "Gentle Rain",
            url: "https://cdn.pixabay.com/download/audio/2022/03/10/audio_rain-amp-thunder-119181.mp3?filename=rain-and-thunder-ambient-119181.mp3"
        },
        {
            title: "Ocean Waves",
            url: "https://cdn.pixabay.com/download/audio/2022/03/10/audio_ocean-waves-119182.mp3?filename=ocean-waves-ambient-119182.mp3"
        }
    ];

    useEffect(() => {
        let interval;
        if (isLoading) {
            interval = setInterval(() => {
                setLoadingFrame((prev) => (prev + 1) % loadingFrames.length);
            }, 100);
        }
        return () => clearInterval(interval);
    }, [isLoading]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = 0.3; // Set volume to 30%
        }
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const toggleMusic = () => {
        if (isMusicPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsMusicPlaying(!isMusicPlaying);
    };

    const nextTrack = () => {
        setCurrentTrack((prev) => (prev + 1) % calmingTracks.length);
        if (isMusicPlaying) {
            audioRef.current.play();
        }
    };

    const previousTrack = () => {
        setCurrentTrack((prev) => (prev - 1 + calmingTracks.length) % calmingTracks.length);
        if (isMusicPlaying) {
            audioRef.current.play();
        }
    };

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMessage = { sender: "user", text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);
        setError(null);

        try {
            const response = await axios.post(`${API_URL}/chat`, { message: input });
            
            if (response.data.error) {
                throw new Error(response.data.error);
            }

            const botMessage = { 
                sender: "bot", 
                text: response.data.response,
                mood: response.data.mood,
                categories: response.data.categories
            };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error("Error sending message:", error);
            setError(error.message || "Failed to send message. Please try again.");
            const errorMessage = { 
                sender: "bot", 
                text: "I apologize, but I'm having trouble processing your message. Could you please try again?",
                mood: "Neutral"
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const getMoodEmoji = (mood) => {
        switch (mood) {
            case "Happy": return "😊";
            case "Sad": return "😔";
            case "Neutral": return "😐";
            default: return "💭";
        }
    };

    return (
        <>
            <div className="chatbot-container">
                <div className="chatbot-header">
                    <h2>🧠 Mental Health Chatbot</h2>
                    <p className="subtitle">I'm here to listen and help</p>
                </div>
                
                <div className="chatbot-messages">
                    {messages.map((msg, index) => (
                        <div 
                            key={index} 
                            className={`message ${msg.sender === "user" ? "user-message" : "bot-message"}`}
                        >
                            <div className="message-content">
                                {msg.sender === "bot" && (
                                    <span className="mood-emoji">{getMoodEmoji(msg.mood)}</span>
                                )}
                                <div className="message-text">{msg.text}</div>
                            </div>
                            {msg.sender === "bot" && msg.categories && msg.categories.length > 0 && (
                                <div className="message-categories">
                                    {msg.categories.map((category, idx) => (
                                        <span key={idx} className="category-tag">{category}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="message bot-message">
                            <div className="message-content">
                                <span className="mood-emoji">💭</span>
                                <div className="message-text">
                                    <span className="loading-animation">{loadingFrames[loadingFrame]}</span> Thinking...
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                <div className="chatbot-input">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your message here..."
                        className="message-input"
                        disabled={isLoading}
                    />
                    <button 
                        onClick={sendMessage} 
                        className="send-button"
                        disabled={isLoading}
                    >
                        {isLoading ? "Sending..." : "Send"}
                    </button>
                </div>
            </div>

            <div className="music-player">
                <button onClick={previousTrack} title="Previous Track">⏮️</button>
                <button onClick={toggleMusic} title={isMusicPlaying ? "Pause Music" : "Play Music"}>
                    {isMusicPlaying ? "⏸️" : "▶️"}
                </button>
                <button onClick={nextTrack} title="Next Track">⏭️</button>
                <span style={{ marginLeft: '10px', fontSize: '14px', color: '#2c3e50' }}>
                    {calmingTracks[currentTrack].title}
                </span>
            </div>

            <audio
                ref={audioRef}
                src={calmingTracks[currentTrack].url}
                loop
                onEnded={nextTrack}
            />
        </>
    );
};

export default Chatbot;
