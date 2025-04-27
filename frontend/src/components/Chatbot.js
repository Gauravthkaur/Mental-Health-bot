import React, { useState, useRef, useEffect } from "react";
import "./Chatbot.css";

const Chatbot = () => {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [loadingFrame, setLoadingFrame] = useState(0);
    const [isMusicPlaying, setIsMusicPlaying] = useState(false);
    const [currentTrack, setCurrentTrack] = useState(0);
    const [streamedResponse, setStreamedResponse] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [userProfile, setUserProfile] = useState({
        name: "",
        preferences: [],
        mood: "Neutral",
        topics: []
    });
    const [botPersona, setBotPersona] = useState("Supportive"); // Default persona
    const messagesEndRef = useRef(null);
    const audioRef = useRef(null);
    const abortControllerRef = useRef(null);

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

    // Bot personas
    const botPersonas = [
        { id: "Supportive", name: "Supportive Friend", description: "Warm, empathetic, and encouraging" },
        { id: "Calm", name: "Calm Mentor", description: "Serene, wise, and grounding" },
        { id: "Cheerful", name: "Cheerful Coach", description: "Upbeat, positive, and motivating" },
        { id: "Practical", name: "Practical Guide", description: "Direct, clear, and solution-focused" }
    ];

    // Knowledge base for RAG implementation
    const knowledgeBase = {
        "anxiety": [
            "Anxiety is a normal response to stress that can be helpful in some situations, keeping us alert and aware.",
            "Deep breathing exercises can help reduce anxiety by triggering the body's relaxation response.",
            "Progressive muscle relaxation involves tensing and then releasing each muscle group, which can help manage anxiety."
        ],
        "depression": [
            "Depression is more than just feeling sad – it's a persistent feeling of sadness and loss of interest.",
            "Physical activity has been shown to help reduce symptoms of depression by releasing endorphins.",
            "Setting small, achievable goals can help combat depression by providing a sense of accomplishment."
        ],
        "stress": [
            "Stress is the body's response to pressure from a situation or life event.",
            "Mindfulness meditation can help reduce stress by focusing your attention on the present moment.",
            "Adequate sleep is essential for stress management as it helps the body recover and regenerate."
        ],
        "sleep": [
            "Adults typically need 7-9 hours of quality sleep per night.",
            "Creating a consistent sleep schedule helps regulate your body's internal clock.",
            "Avoiding screens before bedtime can improve sleep quality by reducing blue light exposure."
        ]
    };

    // Tool functions
    const tools = {
        calculateBMI: (weight, height) => {
            const bmi = weight / (height * height);
            return bmi.toFixed(2);
        },
        
        getMindfulnessExercise: () => {
            const exercises = [
                "Body Scan: Starting from your toes, slowly bring attention to each part of your body, noticing sensations without judgment.",
                "5-4-3-2-1 Technique: Acknowledge 5 things you see, 4 things you can touch, 3 things you hear, 2 things you smell, and 1 thing you taste.",
                "Mindful Breathing: Focus on your breath. Inhale for 4 counts, hold for 2, exhale for 6. Repeat for 5 minutes.",
                "Loving-kindness Meditation: Direct positive wishes to yourself, then a loved one, then an acquaintance, then a difficult person, and finally to all beings."
            ];
            return exercises[Math.floor(Math.random() * exercises.length)];
        },
        
        getSleepTip: () => {
            const tips = [
                "Maintain a consistent sleep schedule, even on weekends.",
                "Create a restful environment by keeping your bedroom cool, quiet, and dark.",
                "Avoid caffeine and large meals before bedtime.",
                "Try a relaxation technique like deep breathing or progressive muscle relaxation before sleeping.",
                "Limit exposure to screens at least an hour before bed."
            ];
            return tips[Math.floor(Math.random() * tips.length)];
        }
    };

    // Load user profile from local storage on component mount
    useEffect(() => {
        const savedProfile = localStorage.getItem('userProfile');
        if (savedProfile) {
            try {
                setUserProfile(JSON.parse(savedProfile));
            } catch (error) {
                console.error("Error parsing user profile:", error);
                localStorage.removeItem('userProfile');
            }
        }
        
        const savedPersona = localStorage.getItem('botPersona');
        if (savedPersona) {
            setBotPersona(savedPersona);
        }
    }, []);

    // Save user profile to local storage when it changes
    useEffect(() => {
        localStorage.setItem('userProfile', JSON.stringify(userProfile));
    }, [userProfile]);

    // Save bot persona to local storage when it changes
    useEffect(() => {
        localStorage.setItem('botPersona', botPersona);
    }, [botPersona]);

    useEffect(() => {
        let interval;
        if (isLoading) {
            interval = setInterval(() => {
                setLoadingFrame((prev) => (prev + 1) % loadingFrames.length);
            }, 200);
        }
        return () => clearInterval(interval);
    }, [isLoading, loadingFrames.length]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, streamedResponse]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = 0.3; // Set volume to 30%
            
            // Add error handling for audio
            audioRef.current.addEventListener('error', (e) => {
                console.error('Audio playback error:', e);
                setIsMusicPlaying(false);
            });
        }
        
        return () => {
            if (audioRef.current) {
                audioRef.current.removeEventListener('error', () => {});
            }
        };
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const toggleMusic = () => {
        if (!audioRef.current) return;
        
        if (isMusicPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(error => {
                console.error("Music playback error:", error);
                setIsMusicPlaying(false);
            });
        }
        setIsMusicPlaying(!isMusicPlaying);
    };

    const nextTrack = () => {
        setCurrentTrack((prev) => (prev + 1) % calmingTracks.length);
        if (isMusicPlaying && audioRef.current) {
            audioRef.current.load();
            audioRef.current.play().catch(error => {
                console.error("Music playback error:", error);
                setIsMusicPlaying(false);
            });
        }
    };

    const previousTrack = () => {
        setCurrentTrack((prev) => (prev - 1 + calmingTracks.length) % calmingTracks.length);
        if (isMusicPlaying && audioRef.current) {
            audioRef.current.load();
            audioRef.current.play().catch(error => {
                console.error("Music playback error:", error);
                setIsMusicPlaying(false);
            });
        }
    };

    // Detect user mood based on message content
    const detectUserMood = (message) => {
        const happyKeywords = ['happy', 'good', 'great', 'excellent', 'wonderful', 'better', 'joy', 'glad', 'excited'];
        const sadKeywords = ['sad', 'depressed', 'anxious', 'worried', 'bad', 'terrible', 'awful', 'unhappy', 'stressed', 'overwhelmed'];
        const angryKeywords = ['angry', 'mad', 'frustrated', 'annoyed', 'irritated', 'upset'];
        
        const messageLower = message.toLowerCase();
        
        if (sadKeywords.some(keyword => messageLower.includes(keyword))) {
            return "Sad";
        } else if (angryKeywords.some(keyword => messageLower.includes(keyword))) {
            return "Angry";
        } else if (happyKeywords.some(keyword => messageLower.includes(keyword))) {
            return "Happy";
        }
        
        return "Neutral";
    };

    // Get relevant information from knowledge base
    const getRelevantInfo = (message) => {
        const messageLower = message.toLowerCase();
        let relevantInfo = [];
        
        for (const [topic, information] of Object.entries(knowledgeBase)) {
            if (messageLower.includes(topic)) {
                relevantInfo = [...relevantInfo, ...information];
            }
        }
        
        return relevantInfo.length > 0 ? relevantInfo : null;
    };

    // Add API key configuration - store this in environment variables in production!
    // const AIML_API_KEY = process.env.REACT_APP_AIML_API_KEY;
    const AIML_API_KEY = "25b62cc09a4f4207b5dcbf041e206d00"; // Your hardcoded key

    // Update user profile based on message content
    const updateUserProfile = (message, mood) => {
        // Extract potential name if not already set
        if (!userProfile.name) {
            const nameMatch = message.match(/my name is (\w+)/i);
            if (nameMatch && nameMatch[1]) {
                setUserProfile(prev => ({
                    ...prev,
                    name: nameMatch[1]
                }));
            }
        }
        
        // Update mood
        setUserProfile(prev => ({
            ...prev,
            mood: mood
        }));
        
        // Identify and add topics
        const newTopics = identifyTopics(message).split(", ");
        setUserProfile(prev => {
            const updatedTopics = [...new Set([...prev.topics, ...newTopics])];
            return {
                ...prev,
                topics: updatedTopics.slice(0, 5) // Keep only the 5 most recent topics
            };
        });
    };

    // Chain-of-thought reasoning and API call function
    const generateResponse = async (message, userMood) => {
        try {
            setIsLoading(true); // Set loading true at the start
            setIsStreaming(true); // Assume streaming initially
            setStreamedResponse(""); // Clear previous streamed response
    
            abortControllerRef.current = new AbortController();
    
            // Format a rich system prompt for mental health context
            const relevantInfo = getRelevantInfo(message);
            const systemPrompt = `You are a mental health support assistant with a ${botPersona} persona.
    
            The user's current mood appears to be: ${userMood}
            Their conversation history shows interest in: ${userProfile.topics.join(', ') || 'general mental health'}
            ${userProfile.name ? `Their name is ${userProfile.name}.` : ''}
    
            ${relevantInfo ? "Relevant background information: " + relevantInfo.join(" ") : ""}
    
            Please respond in a ${getToneForMood(userMood)} tone.
    
            Guidelines:
            - Be empathetic and validate the user's feelings
            - Provide evidence-based coping strategies when appropriate
            - Never diagnose or prescribe treatment
            - If there are signs of crisis, gently suggest professional resources (like mentioning talking to a professional or providing a helpline number if appropriate and safe)
            - Keep responses conversational and authentic
            - Use occasional emojis for emotional warmth, but be judicious with serious topics
            - Tailor your language to a ${botPersona} communication style`;
    
            // Check for tool requests first
            const toolRequest = checkForToolRequests(message);
            if (toolRequest) {
                setIsLoading(false); // Turn off loading if handling tool request
                setIsStreaming(false);
                const toolResponse = handleToolRequest(toolRequest, message);
                // Add tool response directly to messages
                setMessages(prev => [...prev, { text: toolResponse, sender: 'bot', mood: 'Helpful' }]); // Assuming 'Helpful' mood for tools
                return; // Exit function after handling tool request
            }
    
            // Check if API key is available
            if (!AIML_API_KEY) {
                setIsLoading(false);
                setIsStreaming(false);
                setMessages(prev => [...prev, {
                    text: "I'm sorry, but I'm not properly configured. Please make sure the API key is set in your environment variables (REACT_APP_AIML_API_KEY).",
                    sender: 'bot',
                    mood: 'Apologetic'
                }]);
                return;
            }
    
            // Set up request parameters
            let responseText = '';
            const apiUrl = 'https://api.aimlapi.com/v1/chat/completions'; // Verify this URL is correct
    
            // Use streaming for better user experience
            if ('ReadableStream' in window && abortControllerRef.current) {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        "Authorization": `Bearer ${AIML_API_KEY}`,
                        "Content-Type": "application/json"
                    },
                    signal: abortControllerRef.current.signal,
                    body: JSON.stringify({
                        "model": "gpt-3.5-turbo",
                        "messages": [
                            {
                                "role": "system",
                                "content": systemPrompt
                            },
                            {
                                "role": "user",
                                "content": message
                            }
                        ],
                        "max_tokens": 1000,
                        "stream": true,
                        "temperature": 0.7 // Slightly reduce randomness
                    })
                });
    
                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('API Error:', errorData); // Keep console.error for actual errors
                    throw new Error(`API request failed with status ${response.status}: ${errorData.message || 'Unknown error'}`);
                }
    
                // Process the stream
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
    
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
    
                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n').filter(line => line.trim() !== '');
    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') {
                                break;
                            }
    
                            try {
                                const parsed = JSON.parse(data);
                                // Add null checks to prevent errors
                                if (parsed.choices && 
                                    parsed.choices.length > 0 && 
                                    parsed.choices[0].delta && 
                                    parsed.choices[0].delta.content) {
                                    const contentChunk = parsed.choices[0].delta.content;
                                    responseText += contentChunk;
                                    setStreamedResponse(prev => prev + contentChunk);
                                }
                            } catch (e) {
                                console.error('Error parsing streaming JSON:', e, 'Data:', data); // Keep console.error
                            }
                        }
                    }
                }
                // After stream finishes, add the complete message to the main messages array
                if (responseText) {
                    const finalFormattedResponse = formatResponse(responseText, userMood); // Format the complete response
                    // Add the final message only if it's not empty
                    setMessages(prev => [...prev, { text: finalFormattedResponse, sender: 'bot', mood: userMood }]);
                }
    
            } else {
                // Fallback to non-streaming API
                console.warn("Streaming not supported or aborted, falling back to non-streaming API.");
                setIsStreaming(false); // Ensure streaming is false if fallback used
                
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        "Authorization": `Bearer ${AIML_API_KEY}`,
                        "Content-Type": "application/json"
                    },
                    signal: abortControllerRef.current ? abortControllerRef.current.signal : null,
                    body: JSON.stringify({
                        "model": "gpt-3.5-turbo",
                        "messages": [
                            {
                                "role": "system",
                                "content": systemPrompt
                            },
                            {
                                "role": "user",
                                "content": message
                            }
                        ],
                        "max_tokens": 1000,
                        "stream": false,
                        "temperature": 0.7
                    })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`API request failed with status ${response.status}: ${errorData.message || 'Unknown error'}`);
                }
                
                const data = await response.json();
                if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
                    responseText = data.choices[0].message.content;
                    const finalFormattedResponse = formatResponse(responseText, userMood);
                    setMessages(prev => [...prev, { text: finalFormattedResponse, sender: 'bot', mood: userMood }]);
                }
            }
    
            // Update user profile after getting response
            updateUserProfile(message, userMood);
    
        } catch (error) {
            console.error("Error generating response:", error); // Keep console.error
                if (error.name === 'AbortError') {
                console.log('Fetch aborted'); // Keep console.log for specific events like abort
                setMessages(prev => [...prev, { text: "Request cancelled.", sender: 'bot', mood: 'Neutral' }]);
            } else {
                setMessages(prev => [...prev, {
                    text: "I'm so sorry, I seem to be having trouble right now. Let's try again in a moment. 😥",
                    sender: 'bot',
                    mood: 'Apologetic'
                }]);
            }
        } finally {
            setIsLoading(false);
            setIsStreaming(false); // Turn off streaming indicator once done or errored
            setStreamedResponse(""); // Clear the streaming display area
            abortControllerRef.current = null; // Clear the abort controller
        }
    };

    // Identify topics in the user's message
    const identifyTopics = (message) => {
        const topics = [];
        const messageLower = message.toLowerCase();
        
        for (const topic of Object.keys(knowledgeBase)) {
            if (messageLower.includes(topic)) {
                topics.push(topic);
            }
        }
        
        return topics.length > 0 ? topics.join(", ") : "general mental health";
    };

    // Check user history for relevant context
    const checkUserHistory = () => {
        if (userProfile.name) {
            return `User's name is ${userProfile.name}. `;
        }
        return "No specific user history found.";
    };

    // Get appropriate tone based on user mood
    const getToneForMood = (mood) => {
        switch (mood) {
            case "Sad": return "empathetic and gentle";
            case "Angry": return "calm and validating";
            case "Happy": return "cheerful and encouraging";
            default: return "warm and supportive";
        }
    };

    // Check if user needs a specific tool or calculation
    const checkForToolRequests = (message) => {
        const messageLower = message.toLowerCase();
        
        if (messageLower.includes("bmi") || (messageLower.includes("weight") && messageLower.includes("height"))) {
            return "bmi";
        }
        
        if (messageLower.includes("mindfulness") || messageLower.includes("meditation")) {
            return "mindfulness";
        }
        
        if (messageLower.includes("sleep") && (messageLower.includes("tip") || messageLower.includes("help") || messageLower.includes("advice"))) {
            return "sleep";
        }
        
        return null;
    };

    // Handle tool requests
    const handleToolRequest = (tool, message) => {
        switch (tool) {
            case "bmi": {
                // Extract weight and height from message
                const weightMatch = message.match(/(\d+(\.\d+)?)\s*(kg|kilograms)/i);
                const heightMatch = message.match(/(\d+(\.\d+)?)\s*(m|meters)/i);
                
                if (weightMatch && heightMatch) {
                    const weight = parseFloat(weightMatch[1]);
                    const height = parseFloat(heightMatch[1]);
                    const bmi = tools.calculateBMI(weight, height);
                    
                    return `I've calculated your BMI as ${bmi}. 📊\n\nA BMI under 18.5 is considered underweight, 18.5-24.9 is healthy, 25-29.9 is overweight, and 30+ is obese. Remember that BMI is just one health indicator and doesn't account for factors like muscle mass. How are you feeling about this result?`;
                }
                return "I'd be happy to calculate your BMI! Could you please provide your weight in kg and height in meters? For example: 'My weight is 70kg and my height is 1.75m'";
            }
            
            case "mindfulness": {
                const exercise = tools.getMindfulnessExercise();
                return `I'd love to share a mindfulness exercise with you! 🧘\n\n${exercise}\n\nWould you like to try this now? I can guide you through it step by step.`;
            }
            
            case "sleep": {
                const tip = tools.getSleepTip();
                return `Here's a helpful sleep tip for you: 💤\n\n${tip}\n\nWould you like another tip or would you prefer to talk about creating a bedtime routine?`;
            }
            
            default:
                return null;
        }
    };

    // Format response based on user mood and other factors
    const formatResponse = (rawText, userMood) => {
        // Use the raw text directly as botMessage
        let botMessage = rawText;
    
        // Format long paragraphs with better spacing
        botMessage = botMessage.replace(/(\. )([A-Z])/g, '.\n\n$2');
        
        // Add mood-appropriate emoji (consider context sensitivity)
        let emoji = "";
        switch (userMood) {
            case "Sad": emoji = "😔"; break;
            case "Angry": emoji = "😌"; break; // Calming emoji for anger
            case "Happy": emoji = "😊"; break;
            default: emoji = "💭";
        }
    
        // Add persona-appropriate language (subtly)
        let personalTouch = "";
        switch (botPersona) {
            case "Supportive": 
                personalTouch = Math.random() > 0.7 ? "I'm here for you. " : "You're not alone in this. ";
                break;
            case "Calm": 
                personalTouch = Math.random() > 0.7 ? "Take a deep breath. " : "Let's approach this mindfully. ";
                break;
            case "Cheerful": 
                personalTouch = Math.random() > 0.7 ? "You've got this! " : "Looking on the bright side, ";
                break;
            case "Practical": 
                personalTouch = Math.random() > 0.7 ? "Let's focus on solutions. " : "Here's what might help: ";
                break;
            default:
                personalTouch = "";
        }
    
        // Only add personal touches occasionally and for appropriate moods
        if (Math.random() > 0.6 && userMood !== "Angry") {
            botMessage = personalTouch + botMessage;
        }
    
        // Add emoji occasionally
        if (Math.random() > 0.7) {
            botMessage = botMessage + " " + emoji;
        }
    
        return botMessage;
    };

    // Handle user message submission
    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!inputMessage.trim() || isLoading) return;
        
        const userMood = detectUserMood(inputMessage);
        
        // Add user message to chat
        setMessages(prev => [...prev, { text: inputMessage, sender: 'user', mood: userMood }]);
        
        // Clear input field
        setInputMessage("");
        
        // Generate bot response
        generateResponse(inputMessage, userMood);
    };

    // Handle input change
    const handleInputChange = (e) => {
        setInputMessage(e.target.value);
    };

    // Handle persona change
    const handlePersonaChange = (e) => {
        setBotPersona(e.target.value);
    };

    // Cancel ongoing request
    const handleCancelRequest = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    };

    return (
        <div className="chatbot-container">
            <div className="chatbot-header">
                <h1>Mental Health Companion</h1>
                <p>A supportive space to share your thoughts and feelings</p>
                
                <div className="persona-selector">
                    <label htmlFor="persona-select">Bot Personality:</label>
                    <select 
                        id="persona-select" 
                        value={botPersona} 
                        onChange={handlePersonaChange}
                        disabled={isLoading}
                    >
                        {botPersonas.map(persona => (
                            <option key={persona.id} value={persona.id}>
                                {persona.name} - {persona.description}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            
            <div className="messages-container">
                {messages.length === 0 && (
                    <div className="welcome-message">
                        <p>👋 Hi there! I'm your mental health companion. How are you feeling today?</p>
                        <div className="welcome-suggestions">
                            <button onClick={() => setInputMessage("I'm feeling anxious today")}>I'm feeling anxious</button>
                            <button onClick={() => setInputMessage("I'm feeling sad")}>I'm feeling sad</button>
                            <button onClick={() => setInputMessage("I need help with stress")}>Help with stress</button>
                            <button onClick={() => setInputMessage("Tell me about mindfulness")}>Tell me about mindfulness</button>
                        </div>
                    </div>
                )}
                
                {messages.map((message, index) => (
                    <div key={index} className={`message ${message.sender}`}>
                        <div className="message-content">
                            {message.sender === 'bot' && message.mood && (
                                <span className="mood-emoji">
                                    {message.mood === 'Happy' && '😊'}
                                    {message.mood === 'Sad' && '😔'}
                                    {message.mood === 'Angry' && '😌'}
                                    {message.mood === 'Neutral' && '💭'}
                                    {message.mood === 'Helpful' && '💡'}
                                    {message.mood === 'Apologetic' && '😥'}
                                </span>
                            )}
                            <p className="message-text">{message.text.split('\n').map((line, i) => (
                                <React.Fragment key={i}>
                                    {line}
                                    {i < message.text.split('\n').length - 1 && <br />}
                                </React.Fragment>
                            ))}</p>
                        </div>
                        <div className="message-timestamp">
                            {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                    </div>
                ))}
                
                {isStreaming && streamedResponse && (
                    <div className="message bot streaming">
                        <div className="message-content">
                            <span className="mood-emoji">{userProfile.mood === 'Happy' ? '😊' : userProfile.mood === 'Sad' ? '😔' : userProfile.mood === 'Angry' ? '😌' : '💭'}</span>
                            <p className="message-text streaming-text">
                                {streamedResponse.split('\n').map((line, i) => (
                                    <React.Fragment key={i}>
                                        {line}
                                        {i < streamedResponse.split('\n').length - 1 && <br />}
                                    </React.Fragment>
                                ))}
                                <span className="cursor-blink">|</span>
                            </p>
                        </div>
                    </div>
                )}
                
                {isLoading && !isStreaming && (
                    <div className="message bot">
                        <div className="message-content">
                            <span className="loading-animation">{loadingFrames[loadingFrame]}</span>
                            <p>Thinking...</p>
                        </div>
                    </div>
                )}
                
                <div ref={messagesEndRef} />
            </div>
            
            <form onSubmit={handleSubmit} className="input-form">
                <input
                    type="text"
                    value={inputMessage}
                    onChange={handleInputChange}
                    placeholder="Type your message here..."
                    className="message-input"
                    disabled={isLoading}
                />
                
                {isLoading ? (
                    <button 
                        type="button" 
                        className="cancel-button"
                        onClick={handleCancelRequest}
                    >
                        Cancel
                    </button>
                ) : (
                    <button 
                        type="submit" 
                        id="send-button"
                        disabled={!inputMessage.trim()}
                    >
                        Send
                    </button>
                )}
            </form>
            
            <div className="music-player">
                <button onClick={previousTrack} title="Previous track">⏮️</button>
                <button onClick={toggleMusic} title={isMusicPlaying ? "Pause music" : "Play music"}>
                    {isMusicPlaying ? "⏸️" : "▶️"}
                </button>
                <button onClick={nextTrack} title="Next track">⏭️</button>
                <span className="track-title">{calmingTracks[currentTrack].title}</span>
                
                <audio
                    ref={audioRef}
                    src={calmingTracks[currentTrack].url}
                    loop
                    onEnded={() => nextTrack()}
                />
            </div>
        </div>
    );
};

export default Chatbot;