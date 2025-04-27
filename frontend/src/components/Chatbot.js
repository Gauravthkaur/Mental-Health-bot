import React, { useState, useRef, useEffect } from "react";
import { Analytics } from "@vercel/analytics/react" // Keep this import
import "./Chatbot.css";

// Initialize Putter.js client
const putter = window.puter;

const Chatbot = () => {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState("");
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
            url: "https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3?filename=soft-piano-music-312509.mp3"
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
            }, 200);
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

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!inputMessage.trim() || isLoading) return;

        const userMessage = inputMessage.trim();
        setInputMessage('');
        setMessages(prev => [...prev, { text: userMessage, sender: 'user' }]);
        setIsLoading(true);

        try {
            // Check if the message is mental health related
            const mentalHealthKeywords = [
                'anxiety', 'depression', 'stress', 'mental', 'therapy', 'counseling',
                'feel', 'feeling', 'emotion', 'emotional', 'help', 'support', 'cope',
                'coping', 'overwhelmed', 'sad', 'happy', 'angry', 'frustrated',
                'lonely', 'sleep', 'insomnia', 'panic', 'worry', 'worried'
            ];

            const isMentalHealthRelated = mentalHealthKeywords.some(keyword => 
                userMessage.toLowerCase().includes(keyword)
            );

            if (!isMentalHealthRelated) {
                setMessages(prev => [...prev, {
                    // Updated off-topic message
                    text: "My focus is on supporting you with mental health and emotional well-being topics. While I appreciate your question, could we perhaps explore something related to feelings, coping strategies, or self-care? I'm here to listen.",
                    sender: 'bot',
                    mood: 'Neutral' // Or perhaps 'GentleReminder'?
                }]);
                setIsLoading(false);
                return;
            }

            // Get AI response using Putter.js
            const response = await window.puter.ai.chat(userMessage);

            // Extract and format the message text from the response object
            let botMessage;

            if (response && typeof response === 'object') {
                console.log('AI Response Structure:', response);
                
                if (response.content) {
                    botMessage = response.content;
                } else if (response.message && typeof response.message === 'string') {
                    botMessage = response.message;
                } else if (response.message && response.message.content) {
                    botMessage = response.message.content;
                } else {
                    // Updated formatting error message
                    botMessage = 'I seem to be having a little trouble putting my thoughts into words right now. Could you perhaps try phrasing that differently?';
                }
            } else if (typeof response === 'string') {
                botMessage = response;
            } else {
                // Updated generic error message (alternative)
                botMessage = 'Oh dear, something unexpected happened on my end. Please give me a moment, and perhaps try your message again?';
            }

            // Format the message for better readability
            botMessage = botMessage
                .replace(/\n/g, '<br>') // Convert newlines to HTML line breaks
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold text
                .replace(/\*(.*?)\*/g, '<em>$1</em>'); // Italic text
            
            // Add bot response to messages
            setMessages(prev => [...prev, { 
                text: botMessage, 
                sender: 'bot',
                mood: 'Neutral' // You can implement mood detection if needed
            }]);
        } catch (error) {
            console.error('Error getting AI response:', error);
            setMessages(prev => [...prev, {
                // Updated generic error message in catch block
                text: 'I\'m so sorry, it seems I\'ve encountered a technical hiccup. Please don\'t worry, it\'s not you. Could you try sending your message again in a little bit?',
                sender: 'bot',
                mood: 'Apologetic' // Custom mood?
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const getMoodEmoji = (mood) => {
        switch (mood) {
            case "Happy": return "😊";
            case "Sad": return "😔";
            case "Neutral": return "😐";
            case "Apologetic": return "😥"; // Example for new mood
            case "GentleReminder": return " gently nudging "; // Example for new mood
            default: return "💭";
        }
    };

    return (
        <div className="chatbot-container">
            <Analytics /> {/* Add the Vercel Analytics component here */}
            <div className="chatbot-header">
                <h1>Mental Health Chatbot</h1>
                <p>Your supportive AI companion</p>
            </div>
            
            <div className="messages-container">
                {messages.map((message, index) => (
                    <div key={index} className={`message ${message.sender}`}>
                        <div className="message-content">
                            {message.sender === 'bot' && (
                                <span className="mood-emoji">{getMoodEmoji(message.mood)}</span>
                            )}
                            <p dangerouslySetInnerHTML={{ __html: message.text }}></p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="message bot">
                        <div className="message-content">
                            <span className="mood-emoji">🤔</span>
                            <div className="loading-animation">
                                {loadingFrames[loadingFrame]}
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

            <form onSubmit={sendMessage} className="input-form">
                <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type your message..."
                    disabled={isLoading}
                    className="message-input"
                />
                <button id="send-button" type="submit" disabled={isLoading} >
                    Send
                </button>
            </form>

            <div className="music-player">
                <button onClick={previousTrack}>⏮️</button>
                <button onClick={toggleMusic}>
                    {isMusicPlaying ? '⏸️' : '▶️'}
                </button>
                <button onClick={nextTrack}>⏭️</button>
                <span className="track-title">{calmingTracks[currentTrack].title}</span>
            </div>

            <audio
                ref={audioRef}
                src={calmingTracks[currentTrack].url}
                loop
                onEnded={nextTrack}
            />
        </div>
    );
};

export default Chatbot;
