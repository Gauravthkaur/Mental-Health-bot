import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";

// Constants
const CONSTANTS = {
  CONTEXT_MESSAGE_COUNT: 6,
  MAX_OUTPUT_TOKENS: 1500,
  TEMPERATURE: 0.75,
  STORAGE_KEYS: {
    USER_PROFILE: 'userProfile',
    BOT_PERSONA: 'botPersona'
  }
};

// Breakpoints
const BREAKPOINTS = {
  mobile: '480px',
  tablet: '768px',
  desktop: '1024px'
};

// Configuration objects
const BOT_PERSONAS = [
  { id: "Supportive", name: "Supportive Friend", description: "Warm, empathetic, and encouraging" },
  { id: "Calm", name: "Calm Mentor", description: "Serene, wise, and grounding" },
  { id: "Cheerful", name: "Cheerful Coach", description: "Upbeat, positive, and motivating" },
  { id: "Practical", name: "Practical Guide", description: "Direct, clear, and solution-focused" }
];

const KNOWLEDGE_BASE = {
  anxiety: [
    "Anxiety is a normal response to stress that can be helpful in some situations, keeping us alert and aware.",
    "Deep breathing exercises can help reduce anxiety by triggering the body's relaxation response.",
    "Progressive muscle relaxation involves tensing and then releasing each muscle group, which can help manage anxiety."
  ],
  depression: [
    "Depression is more than just feeling sad – it's a persistent feeling of sadness and loss of interest.",
    "Physical activity has been shown to help reduce symptoms of depression by releasing endorphins.",
    "Setting small, achievable goals can help combat depression by providing a sense of accomplishment."
  ],
  stress: [
    "Stress is the body's response to pressure from a situation or life event.",
    "Mindfulness meditation can help reduce stress by focusing your attention on the present moment.",
    "Adequate sleep is essential for stress management as it helps the body recover and regenerate."
  ],
  sleep: [
    "Adults typically need 7-9 hours of quality sleep per night.",
    "Creating a consistent sleep schedule helps regulate your body's internal clock.",
    "Avoiding screens before bedtime can improve sleep quality by reducing blue light exposure."
  ]
};

const MOOD_KEYWORDS = {
  Happy: {
    high: ['ecstatic', 'thrilled', 'overjoyed', 'elated'],
    medium: ['happy', 'good', 'great', 'wonderful', 'amazing', 'fantastic'],
    low: ['okay', 'fine', 'decent', 'alright']
  },
  Sad: {
    high: ['devastated', 'heartbroken', 'miserable', 'depressed'],
    medium: ['sad', 'down', 'upset', 'disappointed', 'blue'],
    low: ['meh', 'blah', 'low']
  },
  Angry: {
    high: ['furious', 'enraged', 'livid', 'outraged'],
    medium: ['angry', 'mad', 'frustrated', 'annoyed', 'irritated'],
    low: ['bothered', 'irked']
  },
  Anxious: {
    high: ['panicked', 'terrified', 'overwhelmed'],
    medium: ['anxious', 'worried', 'nervous', 'stressed', 'concerned'],
    low: ['uneasy', 'tense']
  }
};

const TONE_OPTIONS = {
  Happy: ["upbeat and celebratory", "joyful and encouraging", "bright and positive"],
  Sad: ["gentle and comforting", "empathetic and supportive", "warm and understanding"],
  Angry: ["calm and grounding", "patient and validating", "soothing and peaceful"],
  Anxious: ["reassuring and calming", "steady and supportive", "grounding and gentle"],
  Neutral: ["warm and supportive", "friendly and approachable", "caring and attentive"]
};

const SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
];

// Utility functions
const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error parsing ${key} from localStorage:`, error);
      localStorage.removeItem(key);
      return defaultValue;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
    }
  }
};

// Custom hooks
const usePersistedState = (key, defaultValue) => {
  const [state, setState] = useState(() => storage.get(key, defaultValue));
  
  useEffect(() => {
    storage.set(key, state);
  }, [key, state]);
  
  return [state, setState];
};

// Helper functions
const detectUserMood = (message) => {
  const messageLower = message.toLowerCase();
  const moodScores = {};
  
  // Calculate mood scores
  Object.entries(MOOD_KEYWORDS).forEach(([mood, categories]) => {
    moodScores[mood] = 0;
    Object.entries(categories).forEach(([intensity, keywords]) => {
      const weight = intensity === 'high' ? 3 : intensity === 'medium' ? 2 : 1;
      keywords.forEach(keyword => {
        if (messageLower.includes(keyword)) {
          moodScores[mood] += weight;
        }
      });
    });
  });
  
  // Handle negations
  const negations = ['not', 'don\'t', 'doesn\'t', 'isn\'t', 'aren\'t', 'wasn\'t', 
                    'weren\'t', 'haven\'t', 'hasn\'t', 'hadn\'t', 'won\'t', 
                    'wouldn\'t', 'couldn\'t', 'shouldn\'t', 'never'];
  
  negations.forEach(negation => {
    const negationIndex = messageLower.indexOf(negation);
    if (negationIndex !== -1) {
      const nearbyText = messageLower.substring(
        Math.max(0, negationIndex - 3), 
        Math.min(messageLower.length, negationIndex + 20)
      );
      
      Object.entries(MOOD_KEYWORDS).forEach(([mood, categories]) => {
        const allKeywords = Object.values(categories).flat();
        allKeywords.forEach(keyword => {
          if (nearbyText.includes(keyword)) {
            moodScores[mood] = Math.max(0, moodScores[mood] - 2);
          }
        });
      });
    }
  });
  
  // Find highest scoring mood
  const [detectedMood, highestScore] = Object.entries(moodScores)
    .reduce(([bestMood, bestScore], [mood, score]) => 
      score > bestScore ? [mood, score] : [bestMood, bestScore], 
      ["Neutral", 0]
    );
  
  return highestScore >= 1 ? detectedMood : "Neutral";
};

const getRelevantInfo = (message) => {
  const messageLower = message.toLowerCase();
  const relevantInfo = [];
  
  Object.entries(KNOWLEDGE_BASE).forEach(([topic, information]) => {
    if (messageLower.includes(topic)) {
      relevantInfo.push(...information);
    }
  });
  
  return relevantInfo.length > 0 ? relevantInfo : null;
};

const identifyTopics = (message) => {
  const topics = [];
  const messageLower = message.toLowerCase();
  
  // Check knowledge base topics
  Object.keys(KNOWLEDGE_BASE).forEach(topic => {
    if (messageLower.includes(topic)) {
      topics.push(topic);
    }
  });
  
  // Check for additional topics
  if (messageLower.includes("bmi") || messageLower.includes("weight") || messageLower.includes("height")) {
    topics.push("BMI");
  }
  if (messageLower.includes("mindfulness") || messageLower.includes("meditation")) {
    topics.push("mindfulness");
  }
  
  return topics.length > 0 ? [...new Set(topics)] : ["general mental health"];
};

const getToneForMood = (mood) => {
  const options = TONE_OPTIONS[mood] || TONE_OPTIONS.Neutral;
  return options[Math.floor(Math.random() * options.length)];
};

const tools = {
  calculateBMI: (weight, height) => {
    if (height === 0) return "Height cannot be zero.";
    const bmi = weight / (height * height);
    return `Your BMI is ${bmi.toFixed(2)}`;
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

const checkForToolRequests = (message) => {
  const messageLower = message.toLowerCase();
  if (messageLower.includes("bmi") && (messageLower.includes("calculate") || messageLower.includes("what"))) {
    return "calculateBMI";
  }
  if (messageLower.includes("mindfulness") || messageLower.includes("meditation exercise")) {
    return "getMindfulnessExercise";
  }
  if (messageLower.includes("sleep tip") || messageLower.includes("sleep help")) {
    return "getSleepTip";
  }
  return null;
};

const handleToolRequest = (tool, message) => {
  try {
    switch (tool) {
      case "calculateBMI":
        const weightMatch = message.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilos?|pounds?|lbs?)/i);
        const heightMatch = message.match(/(\d+(?:\.\d+)?)\s*(?:m|meters?|cm|centimeters?|ft|feet|inches?)/i);
        if (weightMatch && heightMatch) {
          const weight = parseFloat(weightMatch[1]);
          const height = parseFloat(heightMatch[1]);
          return tools.calculateBMI(weight, height);
        }
        return "Please provide your weight and height for BMI calculation.";
      case "getMindfulnessExercise":
        return tools.getMindfulnessExercise();
      case "getSleepTip":
        return tools.getSleepTip();
      default:
        return null;
    }
  } catch (error) {
    console.error("Tool execution error:", error);
    return "I encountered an error while processing your request.";
  }
};

// Error classes
class APIError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.details = details;
  }
}

class StreamingError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StreamingError';
  }
}

// Main component
const MentalHealthChatbot = () => {
  // State management
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamedResponse, setStreamedResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  
  // Persisted state
  const [userProfile, setUserProfile] = usePersistedState(CONSTANTS.STORAGE_KEYS.USER_PROFILE, {
    name: "",
    preferences: [],
    mood: "Neutral",
    topics: []
  });
  
  const [botPersona, setBotPersona] = usePersistedState(CONSTANTS.STORAGE_KEYS.BOT_PERSONA, "Supportive");
  
  // Refs
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  
  // Memoized values
  const GEMINI_API_KEY = useMemo(() => process.env.REACT_APP_GEMINI_API_KEY, []);
  
  // Utility functions
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);
  
  const updateUserProfile = useCallback((message, mood) => {
    setUserProfile(prev => {
      let newName = prev.name;
      if (!prev.name) {
        const nameMatch = message.match(/my name is (\w+)/i);
        if (nameMatch?.[1]) {
          newName = nameMatch[1];
        }
      }
      
      const newTopics = identifyTopics(message).filter(t => t !== "general mental health");
      const updatedTopics = [...new Set([...prev.topics, ...newTopics])].slice(-5);
      
      return {
        ...prev,
        name: newName,
        mood: mood,
        topics: updatedTopics
      };
    });
  }, [setUserProfile]);
  
  const addMessage = useCallback((text, sender, mood = 'Neutral') => {
    setMessages(prev => [...prev, { 
      text, 
      sender, 
      mood, 
      timestamp: new Date().toISOString() 
    }]);
  }, []);
  
  const handleError = useCallback((error, context = "") => {
    console.error(`Error in ${context}:`, error);
    setError(error.message);
    
    let errorMessage = "I'm experiencing some technical difficulties. ";
    
    if (error instanceof APIError) {
      if (error.status === 429) {
        errorMessage += "I'm receiving too many requests right now. Please try again in a moment.";
      } else if (error.status >= 500) {
        errorMessage += "There seems to be a server issue. Please try again later.";
      } else {
        errorMessage += "There was an issue with the request. Please try again.";
      }
    } else if (error.name === 'AbortError') {
      errorMessage = "Request was cancelled.";
    } else if (error instanceof StreamingError) {
      errorMessage += "There was an issue with the response stream. Please try again.";
    } else {
      errorMessage += "Please try again in a moment.";
    }
    
    addMessage(errorMessage, 'bot', 'Apologetic');
  }, [addMessage]);
  
  const generateResponse = useCallback(async (userInputMessage, userMood) => {
    if (!GEMINI_API_KEY) {
      handleError(new Error("API key is not configured"), "API key check");
      return;
    }
    
    // Set loading state first
    setIsLoading(true);
    setError(null);
    setStreamedResponse(""); // Ensure streamed response is cleared
    
    abortControllerRef.current = new AbortController();
    
    try {
      // Check for tool requests first
      const toolRequest = checkForToolRequests(userInputMessage);
      if (toolRequest) {
        const toolResponse = handleToolRequest(toolRequest, userInputMessage);
        if (toolResponse) {
          addMessage(toolResponse, 'bot', 'Helpful');
          updateUserProfile(userInputMessage, userMood);
          return;
        }
      }

      // Prepare system prompt
      const relevantInfo = getRelevantInfo(userInputMessage);
      const systemPrompt = `You are a friendly mental health support assistant with a ${botPersona} persona. Your goal is to listen, understand, and provide supportive suggestions and tips.

User's current mood appears to be: ${userMood}.
Their conversation history shows interest in: ${userProfile.topics.join(', ') || 'general mental health'}.
${userProfile.name ? `Their name is ${userProfile.name}. Address them by their name when appropriate and natural.` : ''}
${relevantInfo ? "Relevant background information: " + relevantInfo.join(" ") : ""}

Please respond in a ${getToneForMood(userMood)} tone.

Guidelines:
- Be empathetic, understanding, and validate the user's feelings.
- Provide evidence-based coping strategies and practical tips when appropriate.
- Never diagnose or prescribe treatment.
- If the user seems to be in crisis or expresses thoughts of self-harm, gently guide them to seek professional help immediately.
- Keep responses conversational, friendly, and authentic.
- Use occasional emojis for emotional warmth, but be judicious with serious topics.
- Tailor your language to a ${botPersona} communication style.
- If asked about your identity, state you are an AI assistant.
- If asked for something outside your scope, politely state your limitations and redirect.`;
      
      // Prepare conversation context
      const recentMessages = messages.slice(-CONSTANTS.CONTEXT_MESSAGE_COUNT);
      const geminiContents = [
        { role: 'user', parts: [{ text: 'SYSTEM: ' + systemPrompt }] },
        ...recentMessages.map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        })),
        { role: 'user', parts: [{ text: userInputMessage }] }
      ];
      
      const requestBody = {
        contents: geminiContents,
        generationConfig: {
          temperature: CONSTANTS.TEMPERATURE,
          maxOutputTokens: CONSTANTS.MAX_OUTPUT_TOKENS,
        },
        safetySettings: SAFETY_SETTINGS
      };
      
      setIsStreaming(true);

      // Make API call
      const streamingUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}&alt=sse`;
      
      const response = await fetch(streamingUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: "Unknown API error" } }));
        throw new APIError(response.status, `API request failed: ${errorData.error?.message || response.statusText}`, errorData);
      }
      
      if (!response.body) {
        throw new StreamingError("Response body is null, streaming not possible.");
      }
      
      // Process stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonString = line.substring(6);
            if (jsonString.trim()) {
              try {
                const parsedChunk = JSON.parse(jsonString);
                const content = parsedChunk.candidates?.[0]?.content?.parts?.[0];
                
                if (content?.text) {
                  accumulatedText += content.text;
                  setStreamedResponse(prev => prev + content.text);
                }
              } catch (parseError) {
                console.warn('Error parsing streaming JSON:', parseError);
              }
            }
          }
        }
      }
      
      // Finalize response
      if (accumulatedText) {
        addMessage(accumulatedText, 'bot', userMood);
        updateUserProfile(userInputMessage, userMood);
      } else {
        throw new StreamingError("Received empty response from API");
      }
      
    } catch (error) {
      if (error.name !== 'AbortError') {
        handleError(error, "generateResponse");
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setStreamedResponse("");
      abortControllerRef.current = null;
    }
  }, [GEMINI_API_KEY, botPersona, userProfile, messages, handleError, addMessage, updateUserProfile]);
  
  // Event handlers
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;
    
    const currentInput = inputMessage.trim();
    const userMood = detectUserMood(currentInput);
    
    addMessage(currentInput, 'user', userMood);
    setInputMessage("");
    generateResponse(currentInput, userMood);
  }, [inputMessage, isLoading, addMessage, generateResponse]);
  
  const handleInputChange = useCallback((e) => {
    setInputMessage(e.target.value);
  }, []);
  
  const handlePersonaChange = useCallback((e) => {
    setBotPersona(e.target.value);
  }, [setBotPersona]);
  
  const handleCancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);
  
  const handleSuggestionClick = useCallback((suggestion) => {
    setInputMessage(suggestion);
    setTimeout(() => {
      const form = document.querySelector('.input-form');
      if (form) {
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    }, 0);
  }, []);
  
  // Effects
  useEffect(() => {
    scrollToBottom();
  }, [messages, streamedResponse, scrollToBottom]);
  
  // Memoized components
  const MessageContent = React.memo(({ message }) => (
    <ReactMarkdown
      components={{
        a: ({ node, ...props }) => (
          <a {...props} target="_blank" rel="noopener noreferrer" 
             style={{ 
               color: message.sender === 'bot' ? '#0084ff' : '#fff', 
               textDecoration: 'underline',
               wordBreak: 'break-word' 
             }} />
        ),
        p: ({ node, ...props }) => (
          <span {...props} style={{ 
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
            overflow: 'hidden'
          }} />
        ),
        ul: ({ node, ...props }) => (
          <ul style={{ 
            margin: '8px 0 8px 20px',
            width: '100%',
            boxSizing: 'border-box'
          }} {...props} />
        ),
        ol: ({ node, ...props }) => (
          <ol style={{ 
            margin: '8px 0 8px 20px',
            width: '100%',
            boxSizing: 'border-box'
          }} {...props} />
        ),
        li: ({ node, ...props }) => (
          <li style={{ 
            marginBottom: '4px',
            wordBreak: 'break-word'
          }} {...props} />
        ),
        strong: ({ node, ...props }) => (
          <strong style={{ 
            color: message.sender === 'bot' ? '#a777e3' : '#fff',
            wordBreak: 'break-word'
          }} {...props} />
        ),
        em: ({ node, ...props }) => (
          <em style={{ 
            color: message.sender === 'bot' ? '#6e8efb' : '#fff',
            wordBreak: 'break-word'
          }} {...props} />
        )
      }}
    >
      {message.text}
    </ReactMarkdown>
  ));
  
  const getMoodEmoji = (mood) => {
    const emojis = {
      Happy: '😊', Sad: '😔', Angry: '😌', Anxious: '😰',
      Neutral: '💬', Helpful: '💡', Apologetic: '😥'
    };
    return emojis[mood] || '💬';
  };
  
  // Render
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '800px',
        margin: '0 auto',
        padding: '10px',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}>
        {/* Header */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '20px 20px 0 0',
          padding: '20px',
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
        }}>
          <h1 style={{
            margin: '0 0 10px 0',
            color: '#333',
            fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
            wordBreak: 'break-word'
          }}>
            Mental Health Companion
          </h1>
          <p style={{
            margin: '0 0 20px 0',
            color: '#666',
            fontSize: 'clamp(0.9rem, 2vw, 1.1rem)'
          }}>
            A supportive space to share your thoughts and feelings
          </p>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            flexWrap: 'wrap'
          }}>
            <label htmlFor="persona-select" style={{ color: '#333', fontWeight: '500' }}>
              Bot Personality:
            </label>
            <select
              id="persona-select"
              value={botPersona}
              onChange={handlePersonaChange}
              disabled={isLoading}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                background: 'white',
                fontSize: '14px'
              }}
            >
              {BOT_PERSONAS.map(persona => (
                <option key={persona.id} value={persona.id}>
                  {persona.name} - {persona.description}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Messages Container */}
        <div style={{
          flex: 1,
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '15px',
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 300px)',
          minHeight: '30px'
        }}>
          {error && (
            <div style={{
              background: '#fee',
              border: '1px solid #fcc',
              color: '#c33',
              padding: '10px',
              borderRadius: '8px',
              marginBottom: '10px'
            }}>
              Error: {error}
            </div>
          )}
          
          {messages.length === 0 && !isLoading && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <p style={{ fontSize: '1.2rem', color: '#333', marginBottom: '30px' }}>
                👋 Hi there! {userProfile.name ? `Welcome back, ${userProfile.name}!` : "I'm your mental health companion."} How are you feeling today?
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                {[
                  "I'm feeling anxious today",
                  "I'm feeling sad",
                  "I need help with stress",
                  "Tell me about mindfulness"
                ].map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => handleSuggestionClick(suggestion)}
                    style={{
                      padding: '12px 16px',
                      background: 'linear-gradient(45deg, #667eea, #764ba2)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '20px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      transition: 'transform 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                    onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {messages.map((message, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: '15px'
              }}
            >
              <div style={{
                maxWidth: '70%',
                width: 'fit-content',
                padding: '12px 16px',
                borderRadius: message.sender === 'user' ? '20px 20px 5px 20px' : '20px 20px 20px 5px',
                background: message.sender === 'user' 
                  ? 'linear-gradient(45deg, #667eea, #764ba2)'
                  : 'white',
                color: message.sender === 'user' ? 'white' : '#333',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
                border: message.sender === 'bot' ? '1px solid #eee' : 'none',
                overflowWrap: 'break-word',
                wordBreak: 'break-word',
                hyphens: 'auto'
              }}>
                {message.sender === 'bot' && (
                  <span style={{ marginRight: '8px', fontSize: '1.2em' }}>
                    {getMoodEmoji(message.mood)}
                  </span>
                )}
                <MessageContent message={message} />
                <div style={{
                  fontSize: '0.75rem',
                  opacity: 0.7,
                  marginTop: '5px',
                  textAlign: 'right'
                }}>
                  {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            </div>
          ))}
          
          {isStreaming && streamedResponse && (
            <div style={{
              display: 'flex',
              justifyContent: 'flex-start',
              marginBottom: '15px'
            }}>
              <div style={{
                maxWidth: '70%',
                padding: '12px 16px',
                borderRadius: '20px 20px 20px 5px',
                background: 'white',
                color: '#333',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
                border: '1px solid #eee'
              }}>
                <span style={{ marginRight: '8px', fontSize: '1.2em' }}>
                  ✏️
                </span>
                <ReactMarkdown
                  components={{
                    a: ({ node, ...props }) => (
                      <a {...props} target="_blank" rel="noopener noreferrer" 
                         style={{ color: '#0084ff', textDecoration: 'underline' }} />
                    ),
                    p: ({ node, ...props }) => <span {...props} />,
                    ul: ({ node, ...props }) => <ul style={{ margin: '8px 0 8px 20px' }} {...props} />,
                    ol: ({ node, ...props }) => <ol style={{ margin: '8px 0 8px 20px' }} {...props} />,
                    li: ({ node, ...props }) => <li style={{ marginBottom: '4px' }} {...props} />,
                    strong: ({ node, ...props }) => <strong style={{ color: '#a777e3' }} {...props} />,
                    em: ({ node, ...props }) => <em style={{ color: '#6e8efb' }} {...props} />
                  }}
                >
                  {streamedResponse}
                </ReactMarkdown>
                <span style={{ 
                  animation: 'blink 1s infinite',
                  fontSize: '1.2em',
                  marginLeft: '2px'
                }}>|</span>
              </div>
            </div>
          )}
          
          {/* FIX: This condition ensures the loading indicator shows until the first chunk of the response is received. */}
          {isLoading && !streamedResponse && (
            <div style={{
              display: 'flex',
              justifyContent: 'flex-start',
              marginBottom: '15px'
            }}>
              <div style={{
                padding: '12px 16px',
                borderRadius: '20px 20px 20px 5px',
                background: 'white',
                color: '#333',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
                border: '1px solid #eee',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '1.2em' }}>
                  🤔
                </span>
                <span>Thinking...</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input Form */}
        <form onSubmit={handleSubmit} style={{
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '15px',
          borderRadius: '0 0 20px 20px',
          display: 'flex',
          gap: '10px',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.1)',
          flexWrap: 'wrap'
        }} className="input-form">
          <input
            type="text"
            value={inputMessage}
            onChange={handleInputChange}
            placeholder="Type your message here..."
            disabled={isLoading}
            style={{
              flex: '1 1 50px',
              padding: '12px 16px',
              border: '1px solid #ddd',
              borderRadius: '25px',
              fontSize: 'clamp(14px, 2vw, 16px)',
              outline: 'none',
              background: isLoading ? '#f5f5f5' : 'white'
            }}
          />
          {isLoading ? (
            <button
              type="button"
              onClick={handleCancelRequest}
              style={{
                padding: '12px 24px',
                background: '#ff6b6b',
                color: 'white',
                border: 'none',
                borderRadius: '25px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500'
              }}
            >
              Cancel
            </button>
          ) : (
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              style={{
                padding: '12px 24px',
                background: inputMessage.trim() && !isLoading 
                  ? 'linear-gradient(45deg, #667eea, #764ba2)' 
                  : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '25px',
                cursor: inputMessage.trim() && !isLoading ? 'pointer' : 'not-allowed',
                fontSize: '16px',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
            >
              Send
            </button>
          )}
        </form>
      </div>
      
      <style jsx>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        @media (max-width: ${BREAKPOINTS.mobile}) {
          .input-form {
            flex-direction: column;
          }
          
          .input-form button {
            width: 100%;
          }
          
          div[style*="maxWidth: '70%'"] {
            max-width: 85% !important;
          }
          
          div[style*="gridTemplateColumns"] {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: ${BREAKPOINTS.tablet}) {
          div[style*="padding: '20px'"] {
            padding: 15px !important;
          }
          
          button {
            padding: 10px 16px !important;
            font-size: 14px !important;
          }
          
          select {
            max-width: 200px;
          }
        }

        @media (hover: none) {
          button:hover {
            transform: none !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
};

export default MentalHealthChatbot;
