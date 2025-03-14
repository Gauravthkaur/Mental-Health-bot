from flask import Flask, request, jsonify
from flask_cors import CORS
import nltk
from nltk.sentiment import SentimentIntensityAnalyzer
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
import re
import logging
import random
from .chatbot_enhanced import EnhancedChatbot

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Allow frontend to call the API

# Download required NLTK data
try:
    nltk.download('vader_lexicon')
    nltk.download('punkt')
    nltk.download('stopwords')
    nltk.download('averaged_perceptron_tagger')
    logger.info("Successfully downloaded NLTK data")
except Exception as e:
    logger.error(f"Error downloading NLTK data: {str(e)}")
    raise

# Initialize the enhanced chatbot
chatbot = EnhancedChatbot()

sia = SentimentIntensityAnalyzer()
stop_words = set(stopwords.words('english'))

# Define keywords and their associated responses
KEYWORDS = {
    'anxiety': {
        'keywords': ['anxiety', 'panic', 'worry', 'stress', 'nervous', 'fear', 'anxious', 'panic attack', 'panicking', 'worried', 'stressed', 'afraid', 'scared', 'anxiousness'],
        'responses': {
            'Sad': [
                "I understand anxiety can be really challenging. Have you tried any breathing exercises or meditation?",
                "It's okay to feel anxious. Would you like to talk about what's triggering these feelings?",
                "Remember that anxiety is a natural response, but we can work on managing it together.",
                "I hear you. Anxiety can be really overwhelming. Would you like to try some grounding techniques?",
                "Your feelings are valid. Let's talk about what might help you feel more at ease."
            ],
            'Neutral': [
                "I notice you're mentioning anxiety. Would you like to explore some coping strategies?",
                "Anxiety can affect us in different ways. How has it been impacting you lately?",
                "There are many effective ways to manage anxiety. Would you like to discuss some options?"
            ],
            'Happy': [
                "I'm glad you're feeling good while discussing this! Would you like to share what's been helping you manage anxiety?",
                "That's great that you're open about your anxiety! What strategies have worked well for you?",
                "Your positive attitude about managing anxiety is inspiring! Want to share your journey?"
            ]
        }
    },
    'depression': {
        'keywords': ['depression', 'sad', 'hopeless', 'worthless', 'suicide', 'empty', 'depressed', 'down', 'miserable', 'despair', 'despairing', 'suicidal', 'unhappy', 'melancholy'],
        'responses': {
            'Sad': [
                "I hear you, and it's important to know that you're not alone. Have you considered talking to a mental health professional?",
                "Depression can be really difficult to deal with. Would you like to share more about what you're experiencing?",
                "Your feelings are valid. Let's talk about what might help you feel better.",
                "I'm here to listen. Depression can be really challenging. Would you like to talk about what's been on your mind?",
                "Remember that seeking help is a sign of strength. Would you like to discuss some support options?"
            ],
            'Neutral': [
                "I notice you're mentioning depression. Would you like to talk about how you're feeling?",
                "Depression can affect people in different ways. How has it been affecting you?",
                "There are many resources available for support. Would you like to explore some options?"
            ],
            'Happy': [
                "I'm glad you're feeling better! Would you like to share what's been helping you?",
                "That's wonderful that you're feeling good! What strategies have been working for you?",
                "Your positive progress is inspiring! Want to share what's been helping?"
            ]
        }
    },
    'stress': {
        'keywords': ['stress', 'pressure', 'overwhelmed', 'exhausted', 'tired', 'burnout', 'stressed', 'stressful', 'pressured', 'burden', 'overworked', 'exhaustion'],
        'responses': {
            'Sad': [
                "Stress can be really overwhelming. Have you tried any stress management techniques?",
                "It's important to take care of yourself. Would you like to talk about what's causing your stress?",
                "Remember to take breaks and practice self-care. What activities help you relax?",
                "I hear you. Stress can be really challenging. Would you like to explore some coping strategies?",
                "Your feelings about stress are valid. Let's talk about what might help you feel better."
            ],
            'Neutral': [
                "I notice you're mentioning stress. Would you like to discuss some stress management techniques?",
                "Stress affects everyone differently. How has it been impacting you?",
                "There are many ways to manage stress. Would you like to explore some options?"
            ],
            'Happy': [
                "I'm glad you're feeling good while managing stress! What's been working for you?",
                "That's great that you're handling stress well! Would you like to share your strategies?",
                "Your positive approach to stress is inspiring! Want to share what's helping?"
            ]
        }
    },
    'sleep': {
        'keywords': ['sleep', 'insomnia', 'tired', 'exhausted', 'restless', 'sleepless', 'sleepy', 'fatigue', 'fatigued', 'bed', 'nap', 'drowsy', 'rest', 'resting'],
        'responses': {
            'Sad': [
                "Sleep issues can be really frustrating. Have you tried establishing a bedtime routine?",
                "Poor sleep can affect your mental health. Would you like to discuss what might be keeping you up?",
                "Creating a peaceful sleep environment can help. Have you tried any relaxation techniques before bed?",
                "I understand sleep problems can be really challenging. Would you like to explore some solutions?",
                "Your sleep struggles are valid. Let's talk about what might help you rest better."
            ],
            'Neutral': [
                "I notice you're mentioning sleep issues. Would you like to discuss some sleep hygiene tips?",
                "Sleep problems can affect us in different ways. How has it been impacting you?",
                "There are many strategies for better sleep. Would you like to explore some options?"
            ],
            'Happy': [
                "I'm glad you're feeling good about your sleep! What's been helping you?",
                "That's great that you're sleeping better! Would you like to share your tips?",
                "Your positive sleep habits are inspiring! Want to share what's working?"
            ]
        }
    },
    'loneliness': {
        'keywords': ['lonely', 'alone', 'isolated', 'friend', 'social', 'loneliness', 'solitude', 'isolation', 'abandoned', 'friendship', 'company', 'connection', 'disconnected'],
        'responses': {
            'Sad': [
                "Feeling lonely can be really hard. Have you considered joining any social groups or activities?",
                "Connection is important for mental health. Would you like to talk about ways to build more social connections?",
                "Remember that it's okay to reach out to others. Have you tried connecting with friends or family?",
                "I hear you. Loneliness can be really challenging. Would you like to explore ways to connect?",
                "Your feelings of loneliness are valid. Let's talk about what might help you feel more connected."
            ],
            'Neutral': [
                "I notice you're mentioning loneliness. Would you like to discuss ways to build connections?",
                "Loneliness affects everyone differently. How has it been affecting you?",
                "There are many ways to build social connections. Would you like to explore some options?"
            ],
            'Happy': [
                "I'm glad you're feeling connected! What's been helping you build relationships?",
                "That's great that you're feeling good socially! Would you like to share your experiences?",
                "Your positive social life is inspiring! Want to share what's working?"
            ]
        }
    }
}

# Define recommendations for different moods and categories
RECOMMENDATIONS = {
    'anxiety': {
        'songs': {
            'Sad': [
                {"title": "Weightless", "artist": "Marconi Union", "reason": "This song is scientifically proven to reduce anxiety"},
                {"title": "Don't Worry Be Happy", "artist": "Bobby McFerrin", "reason": "A gentle reminder to stay positive"},
                {"title": "Three Little Birds", "artist": "Bob Marley", "reason": "Uplifting reggae to ease your mind"}
            ],
            'Neutral': [
                {"title": "Breathe", "artist": "Télépopmusik", "reason": "Calming electronic beats to help you relax"},
                {"title": "Somewhere Over the Rainbow", "artist": "Israel Kamakawiwo'ole", "reason": "Soothing ukulele version to calm your nerves"}
            ],
            'Happy': [
                {"title": "Good Vibrations", "artist": "Beach Boys", "reason": "Upbeat tune to maintain positive energy"},
                {"title": "Walking on Sunshine", "artist": "Katrina & The Waves", "reason": "Energetic song to boost your mood"}
            ]
        },
        'games': {
            'Sad': [
                {"name": "Tetris", "reason": "Focusing on patterns can help reduce anxiety"},
                {"name": "Stardew Valley", "reason": "Peaceful farming game to distract from worries"}
            ],
            'Neutral': [
                {"name": "Animal Crossing", "reason": "Calm, social game to help you relax"},
                {"name": "Journey", "reason": "Beautiful, meditative game to ease your mind"}
            ],
            'Happy': [
                {"name": "Mario Kart", "reason": "Fun racing game to maintain good spirits"},
                {"name": "Just Dance", "reason": "Active game to keep your energy up"}
            ]
        }
    },
    'depression': {
        'songs': {
            'Sad': [
                {"title": "Fix You", "artist": "Coldplay", "reason": "Emotional support through music"},
                {"title": "The Sound of Silence", "artist": "Simon & Garfunkel", "reason": "Reflective song to process feelings"}
            ],
            'Neutral': [
                {"title": "Here Comes the Sun", "artist": "The Beatles", "reason": "Hopeful melody to lift spirits"},
                {"title": "Lean on Me", "artist": "Bill Withers", "reason": "Reminder that you're not alone"}
            ],
            'Happy': [
                {"title": "Happy", "artist": "Pharrell Williams", "reason": "Upbeat anthem to maintain positivity"},
                {"title": "Don't Stop Believin'", "artist": "Journey", "reason": "Inspiring song to keep going"}
            ]
        },
        'games': {
            'Sad': [
                {"name": "Gris", "reason": "Beautiful, emotional journey about healing"},
                {"name": "Flower", "reason": "Peaceful game about finding beauty in life"}
            ],
            'Neutral': [
                {"name": "Minecraft", "reason": "Creative outlet to express yourself"},
                {"name": "The Sims", "reason": "Life simulation to regain control"}
            ],
            'Happy': [
                {"name": "Portal", "reason": "Puzzle game to challenge your mind"},
                {"name": "Overcooked", "reason": "Fun cooperative game to connect with others"}
            ]
        }
    },
    'stress': {
        'songs': {
            'Sad': [
                {"title": "Weightless", "artist": "Marconi Union", "reason": "Stress-reducing ambient music"},
                {"title": "River Flows in You", "artist": "Yiruma", "reason": "Calming piano piece"}
            ],
            'Neutral': [
                {"title": "Peaceful Easy Feeling", "artist": "Eagles", "reason": "Relaxing country rock"},
                {"title": "Morning Meditation", "artist": "Dan Gibson", "reason": "Nature sounds to reduce stress"}
            ],
            'Happy': [
                {"title": "Good Day Sunshine", "artist": "The Beatles", "reason": "Cheerful tune to brighten your day"},
                {"title": "Walking on Sunshine", "artist": "Katrina & The Waves", "reason": "Energetic song to relieve stress"}
            ]
        },
        'games': {
            'Sad': [
                {"name": "Zen Bound", "reason": "Meditative puzzle game to unwind"},
                {"name": "Prune", "reason": "Minimalist game about growth and letting go"}
            ],
            'Neutral': [
                {"name": "Monument Valley", "reason": "Peaceful puzzle game to distract from stress"},
                {"name": "Alto's Adventure", "reason": "Calming endless runner with beautiful visuals"}
            ],
            'Happy': [
                {"name": "Garden Paws", "reason": "Cute farming game to relax"},
                {"name": "Slime Rancher", "reason": "Colorful, stress-free game about collecting slimes"}
            ]
        }
    },
    'sleep': {
        'songs': {
            'Sad': [
                {"title": "Weightless", "artist": "Marconi Union", "reason": "Sleep-inducing ambient music"},
                {"title": "Clair de Lune", "artist": "Claude Debussy", "reason": "Peaceful classical piece"}
            ],
            'Neutral': [
                {"title": "Nocturne in E-flat major", "artist": "Frédéric Chopin", "reason": "Gentle piano piece for sleep"},
                {"title": "Sleep", "artist": "Eric Whitacre", "reason": "Soothing choral music"}
            ],
            'Happy': [
                {"title": "Lullaby", "artist": "Brahms", "reason": "Classic calming melody"},
                {"title": "Goodnight Sweetheart", "artist": "The Spaniels", "reason": "Gentle doo-wop for peaceful sleep"}
            ]
        },
        'games': {
            'Sad': [
                {"name": "Sleep Cycle", "reason": "Track and improve your sleep quality"},
                {"name": "Calm", "reason": "Meditation and sleep stories app"}
            ],
            'Neutral': [
                {"name": "Sleep Town", "reason": "Build a town by maintaining good sleep habits"},
                {"name": "Forest", "reason": "Stay focused and plant real trees while you sleep"}
            ],
            'Happy': [
                {"name": "Pokemon Sleep", "reason": "Track sleep while collecting Pokemon"},
                {"name": "Sleep Cycle", "reason": "Wake up feeling refreshed with smart alarm"}
            ]
        }
    },
    'loneliness': {
        'songs': {
            'Sad': [
                {"title": "Lean on Me", "artist": "Bill Withers", "reason": "Reminder that you're not alone"},
                {"title": "You've Got a Friend", "artist": "Carole King", "reason": "Comforting message about friendship"}
            ],
            'Neutral': [
                {"title": "Count on Me", "artist": "Bruno Mars", "reason": "Upbeat song about friendship"},
                {"title": "With a Little Help from My Friends", "artist": "The Beatles", "reason": "Classic about the importance of connection"}
            ],
            'Happy': [
                {"title": "Happy Together", "artist": "The Turtles", "reason": "Cheerful song about togetherness"},
                {"title": "You've Got a Friend in Me", "artist": "Randy Newman", "reason": "Disney classic about friendship"}
            ]
        },
        'games': {
            'Sad': [
                {"name": "Among Us", "reason": "Social deduction game to connect with others"},
                {"name": "Minecraft", "reason": "Build and explore with others online"}
            ],
            'Neutral': [
                {"name": "Stardew Valley", "reason": "Farming game with social elements"},
                {"name": "Animal Crossing", "reason": "Virtual world to connect with others"}
            ],
            'Happy': [
                {"name": "Overcooked", "reason": "Fun cooperative cooking game"},
                {"name": "Fall Guys", "reason": "Playful multiplayer game to meet new people"}
            ]
        }
    }
}

def analyze_mood(text):
    try:
        score = sia.polarity_scores(text)
        logger.debug(f"Sentiment score: {score}")
        if score['compound'] > 0.05:
            return "Happy"
        elif score['compound'] < -0.05:
            return "Sad"
        else:
            return "Neutral"
    except Exception as e:
        logger.error(f"Error in analyze_mood: {str(e)}")
        return "Neutral"

def identify_keywords(text):
    try:
        # Convert text to lowercase
        text = text.lower()
        
        # Check for direct keyword matches without tokenization first
        identified_categories = []
        for category, data in KEYWORDS.items():
            if any(keyword in text for keyword in data['keywords']):
                identified_categories.append(category)
                
        # If no direct matches, try tokenization approach
        if not identified_categories:
            words = word_tokenize(text)
            words = [word for word in words if word not in stop_words and word.isalnum()]
            logger.debug(f"Processed words: {words}")
            
            for category, data in KEYWORDS.items():
                if any(keyword in words for keyword in data['keywords']):
                    identified_categories.append(category)
        
        logger.debug(f"Identified categories: {identified_categories}")
        return identified_categories
    except Exception as e:
        logger.error(f"Error in identify_keywords: {str(e)}")
        return []

def get_recommendations(category, mood):
    try:
        if category in RECOMMENDATIONS:
            recommendations = RECOMMENDATIONS[category]
            song = random.choice(recommendations['songs'][mood])
            game = random.choice(recommendations['games'][mood])
            return {
                'song': f"🎵 Song Recommendation: '{song['title']}' by {song['artist']} - {song['reason']}",
                'game': f"🎮 Game Recommendation: '{game['name']}' - {game['reason']}"
            }
        return None
    except Exception as e:
        logger.error(f"Error getting recommendations: {str(e)}")
        return None

def generate_response(text, mood, categories):
    try:
        response_parts = []
        
        # If specific categories are identified, use their responses
        if categories:
            category = categories[0]  # Use the first identified category
            if category in KEYWORDS and mood in KEYWORDS[category]['responses']:
                responses = KEYWORDS[category]['responses'][mood]
                response_parts.append(random.choice(responses))
                
                # Always add recommendations if available
                recommendations = get_recommendations(category, mood)
                if recommendations:
                    response_parts.append("\n\nHere are some recommendations to help you:")
                    response_parts.append(recommendations['song'])
                    response_parts.append(recommendations['game'])
            else:
                # Fallback if category doesn't have responses for this mood
                fallback_responses = {
                    "Happy": "I'm glad you're feeling positive! Is there something specific you'd like to discuss?",
                    "Sad": "I notice you might be feeling down. I'm here to listen if you want to talk more.",
                    "Neutral": "I see. Would you like to tell me more about what's on your mind?"
                }
                response_parts.append(fallback_responses[mood])
        else:
            # Generic mood-based responses
            responses = {
                "Happy": [
                    "I'm glad you're feeling good! 😊 Keep spreading positivity!",
                    "That's wonderful to hear! What's contributing to your positive mood?",
                    "Your positive energy is contagious! Keep it up! 🌟"
                ],
                "Sad": [
                    "I'm here for you. 💙 Would you like to talk about what's bothering you?",
                    "It's okay to feel sad. Would you like to share more about your feelings?",
                    "I'm listening. What's on your mind?"
                ],
                "Neutral": [
                    "I see. Would you like to share more about your day?",
                    "How are you feeling about things in general?",
                    "Is there anything specific you'd like to talk about?"
                ]
            }
            response_parts.append(random.choice(responses[mood]))
        
        logger.debug(f"Generated response parts: {response_parts}")
        return "\n".join(response_parts)
    except Exception as e:
        logger.error(f"Error in generate_response: {str(e)}")
        return "I'm here to listen. Would you like to tell me more?"

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        if not data or 'message' not in data:
            logger.error("No message received in request")
            return jsonify({
                "error": "No message provided",
                "response": "I didn't receive your message. Could you please try again?",
                "mood": "Neutral",
                "categories": []
            }), 400

        user_message = data['message']
        logger.info(f"Received message: {user_message}")
        
        # Process message using enhanced chatbot
        result = chatbot.process_message(user_message)
        
        logger.info(f"Sending response: {result['response']}")
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        return jsonify({
            "error": str(e),
            "response": "I apologize, but I'm having trouble processing your message. Could you please try again?",
            "mood": "Neutral",
            "categories": []
        }), 500

@app.route('/history', methods=['GET'])
def get_history():
    try:
        limit = request.args.get('limit', default=5, type=int)
        history = chatbot.get_conversation_history(limit)
        return jsonify({"history": history})
    except Exception as e:
        logger.error(f"Error retrieving history: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)