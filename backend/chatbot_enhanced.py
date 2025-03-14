from textblob import TextBlob
import sqlite3
from datetime import datetime
import hashlib
import logging
import os
import random
import threading

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class EnhancedChatbot:
    def __init__(self):
        self.response_cache = {}
        self.conversation_history = []
        self._local = threading.local()
        self.setup_database()
        
    def get_db(self):
        """Get thread-local database connection"""
        if not hasattr(self._local, 'db'):
            self._local.db = sqlite3.connect('chatbot.db', check_same_thread=False)
            self._local.cursor = self._local.db.cursor()
        return self._local.db, self._local.cursor
        
    def setup_database(self):
        """Initialize SQLite database for conversation history"""
        try:
            db, cursor = self.get_db()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS conversations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_message TEXT,
                    bot_response TEXT,
                    mood TEXT,
                    categories TEXT,
                    timestamp DATETIME
                )
            ''')
            db.commit()
            logger.info("Database initialized successfully")
        except Exception as e:
            logger.error(f"Database initialization error: {str(e)}")
            raise

    def enhanced_mood_analysis(self, text):
        """Analyze mood using TextBlob"""
        try:
            blob = TextBlob(text)
            score = blob.sentiment.polarity
            
            if score > 0.05:
                return "Happy"
            elif score < -0.05:
                return "Sad"
            else:
                return "Neutral"
        except Exception as e:
            logger.error(f"Mood analysis error: {str(e)}")
            return "Neutral"

    def identify_keywords(self, text):
        """Identify keywords in text"""
        try:
            text = text.lower()
            categories = []
            
            # Define keywords and their variations for each category
            keywords = {
                'anxiety': [
                    'anxiety', 'panic', 'worry', 'stress', 'nervous', 'fear', 'anxious', 'panic attack',
                    'panicking', 'worried', 'stressed', 'afraid', 'scared', 'anxiousness', 'overwhelmed',
                    'racing thoughts', 'heart racing', 'sweating', 'trembling', 'restless', 'on edge',
                    'can\'t relax', 'constant worry', 'fearful', 'apprehensive', 'tense', 'jittery'
                ],
                'depression': [
                    'depression', 'sad', 'hopeless', 'worthless', 'suicide', 'empty', 'depressed', 'down',
                    'miserable', 'despair', 'despairing', 'suicidal', 'unhappy', 'melancholy', 'gloomy',
                    'low mood', 'no energy', 'tired', 'exhausted', 'no motivation', 'can\'t get up',
                    'no interest', 'lost interest', 'feel nothing', 'numb', 'crying', 'tearful',
                    'self-harm', 'self harm', 'want to die', 'life not worth', 'no purpose'
                ],
                'stress': [
                    'stress', 'pressure', 'overwhelmed', 'exhausted', 'tired', 'burnout', 'stressed',
                    'stressful', 'pressured', 'burden', 'overworked', 'exhaustion', 'pressure',
                    'too much', 'can\'t handle', 'breaking point', 'at my limit', 'no time',
                    'deadline', 'workload', 'responsibilities', 'too many things', 'no rest',
                    'always busy', 'no break', 'constant pressure', 'under pressure'
                ],
                'sleep': [
                    'sleep', 'insomnia', 'tired', 'exhausted', 'restless', 'sleepless', 'sleepy',
                    'fatigue', 'fatigued', 'bed', 'nap', 'drowsy', 'rest', 'resting', 'can\'t sleep',
                    'wake up', 'waking up', 'nightmares', 'bad dreams', 'sleep problems',
                    'sleep issues', 'trouble sleeping', 'sleep deprivation', 'sleep deprived',
                    'no sleep', 'lack of sleep', 'poor sleep', 'sleep quality', 'sleep schedule'
                ],
                'loneliness': [
                    'lonely', 'alone', 'isolated', 'friend', 'social', 'loneliness', 'solitude',
                    'isolation', 'abandoned', 'friendship', 'company', 'connection', 'disconnected',
                    'no friends', 'no one to talk to', 'no support', 'feel alone', 'by myself',
                    'no one understands', 'no one cares', 'no social life', 'no connections',
                    'missing people', 'miss company', 'want friends', 'need friends', 'social anxiety',
                    'afraid to socialize', 'hard to make friends'
                ]
            }
            
            # Check for exact matches first
            for category, words in keywords.items():
                if any(word in text for word in words):
                    categories.append(category)
                    continue
                
                # Check for variations and context
                for word in words:
                    # Check for word variations (e.g., "can't" vs "cant")
                    if word.replace("'", "") in text:
                        categories.append(category)
                        break
                    
                    # Check for compound words (e.g., "no sleep" vs "nosleep")
                    if word.replace(" ", "") in text:
                        categories.append(category)
                        break
                    
                    # Check for common misspellings
                    if any(word.replace(vowel, vowel * 2) in text for vowel in 'aeiou'):
                        categories.append(category)
                        break
            
            # Remove duplicates while preserving order
            return list(dict.fromkeys(categories))
            
        except Exception as e:
            logger.error(f"Keyword identification error: {str(e)}")
            return []

    def get_cached_response(self, category, mood, message_hash):
        """Get response from cache or generate new one"""
        cache_key = f"{category}:{mood}:{message_hash}"
        if cache_key in self.response_cache:
            return self.response_cache[cache_key]
        
        # Generate response if not in cache
        response = self.generate_response(category, mood)
        self.response_cache[cache_key] = response
        return response

    def get_recommendations(self, category, mood):
        """Generate personalized recommendations based on category and mood"""
        try:
            recommendations = {
                'anxiety': {
                    'Sad': {
                        'songs': [
                            {"title": "Weightless", "artist": "Marconi Union", "reason": "This song is scientifically proven to reduce anxiety"},
                            {"title": "Don't Worry Be Happy", "artist": "Bobby McFerrin", "reason": "A gentle reminder to stay positive"},
                            {"title": "Three Little Birds", "artist": "Bob Marley", "reason": "Uplifting reggae to ease your mind"}
                        ],
                        'games': [
                            {"name": "Tetris", "reason": "Focusing on patterns can help reduce anxiety"},
                            {"name": "Stardew Valley", "reason": "Peaceful farming game to distract from worries"}
                        ],
                        'activities': [
                            "Try the 5-4-3-2-1 grounding technique: Name 5 things you can see, 4 things you can touch, 3 things you can hear, 2 things you can smell, and 1 thing you can taste",
                            "Practice deep breathing: Inhale for 4 counts, hold for 4, exhale for 4",
                            "Take a short walk outside and focus on your surroundings",
                            "Try progressive muscle relaxation: Tense and relax each muscle group"
                        ]
                    },
                    'Neutral': {
                        'songs': [
                            {"title": "Breathe", "artist": "Télépopmusik", "reason": "Calming electronic beats to help you relax"},
                            {"title": "Somewhere Over the Rainbow", "artist": "Israel Kamakawiwo'ole", "reason": "Soothing ukulele version to calm your nerves"}
                        ],
                        'games': [
                            {"name": "Animal Crossing", "reason": "Calm, social game to help you relax"},
                            {"name": "Journey", "reason": "Beautiful, meditative game to ease your mind"}
                        ],
                        'activities': [
                            "Practice mindfulness meditation for 5 minutes",
                            "Try a gentle stretching routine",
                            "Write down your thoughts in a journal",
                            "Listen to nature sounds or white noise"
                        ]
                    },
                    'Happy': {
                        'songs': [
                            {"title": "Good Vibrations", "artist": "Beach Boys", "reason": "Upbeat tune to maintain positive energy"},
                            {"title": "Walking on Sunshine", "artist": "Katrina & The Waves", "reason": "Energetic song to boost your mood"}
                        ],
                        'games': [
                            {"name": "Mario Kart", "reason": "Fun racing game to maintain good spirits"},
                            {"name": "Just Dance", "reason": "Active game to keep your energy up"}
                        ],
                        'activities': [
                            "Share your positive coping strategies with others",
                            "Create a playlist of uplifting songs",
                            "Practice gratitude by listing 3 things you're thankful for",
                            "Try a new hobby or creative activity"
                        ]
                    }
                },
                'depression': {
                    'Sad': {
                        'songs': [
                            {"title": "Fix You", "artist": "Coldplay", "reason": "Emotional support through music"},
                            {"title": "The Sound of Silence", "artist": "Simon & Garfunkel", "reason": "Reflective song to process feelings"}
                        ],
                        'games': [
                            {"name": "Gris", "reason": "Beautiful, emotional journey about healing"},
                            {"name": "Flower", "reason": "Peaceful game about finding beauty in life"}
                        ],
                        'activities': [
                            "Take a short walk in nature",
                            "Write down one small goal for today",
                            "Try a simple art or craft activity",
                            "Practice self-compassion by writing kind words to yourself"
                        ]
                    },
                    'Neutral': {
                        'songs': [
                            {"title": "Here Comes the Sun", "artist": "The Beatles", "reason": "Hopeful melody to lift spirits"},
                            {"title": "Lean on Me", "artist": "Bill Withers", "reason": "Reminder that you're not alone"}
                        ],
                        'games': [
                            {"name": "Minecraft", "reason": "Creative outlet to express yourself"},
                            {"name": "The Sims", "reason": "Life simulation to regain control"}
                        ],
                        'activities': [
                            "Create a daily routine and stick to it",
                            "Try a new recipe or cooking activity",
                            "Start a gratitude journal",
                            "Practice gentle exercise like yoga or stretching"
                        ]
                    },
                    'Happy': {
                        'songs': [
                            {"title": "Happy", "artist": "Pharrell Williams", "reason": "Upbeat anthem to maintain positivity"},
                            {"title": "Don't Stop Believin'", "artist": "Journey", "reason": "Inspiring song to keep going"}
                        ],
                        'games': [
                            {"name": "Portal", "reason": "Puzzle game to challenge your mind"},
                            {"name": "Overcooked", "reason": "Fun cooperative game to connect with others"}
                        ],
                        'activities': [
                            "Share your progress with a friend or family member",
                            "Plan a small celebration for your achievements",
                            "Try a new hobby or skill",
                            "Create a vision board of your goals"
                        ]
                    }
                },
                'stress': {
                    'Sad': {
                        'songs': [
                            {"title": "Weightless", "artist": "Marconi Union", "reason": "Stress-reducing ambient music"},
                            {"title": "River Flows in You", "artist": "Yiruma", "reason": "Calming piano piece"}
                        ],
                        'games': [
                            {"name": "Zen Bound", "reason": "Meditative puzzle game to unwind"},
                            {"name": "Prune", "reason": "Minimalist game about growth and letting go"}
                        ],
                        'activities': [
                            "Try a 5-minute meditation break",
                            "Practice progressive muscle relaxation",
                            "Take a short walk or stretch break",
                            "Write down your stressors and possible solutions"
                        ]
                    },
                    'Neutral': {
                        'songs': [
                            {"title": "Peaceful Easy Feeling", "artist": "Eagles", "reason": "Relaxing country rock"},
                            {"title": "Morning Meditation", "artist": "Dan Gibson", "reason": "Nature sounds to reduce stress"}
                        ],
                        'games': [
                            {"name": "Monument Valley", "reason": "Peaceful puzzle game to distract from stress"},
                            {"name": "Alto's Adventure", "reason": "Calming endless runner with beautiful visuals"}
                        ],
                        'activities': [
                            "Create a stress management plan",
                            "Practice time management techniques",
                            "Try a new relaxation method",
                            "Organize your workspace or living area"
                        ]
                    },
                    'Happy': {
                        'songs': [
                            {"title": "Good Day Sunshine", "artist": "The Beatles", "reason": "Cheerful tune to brighten your day"},
                            {"title": "Walking on Sunshine", "artist": "Katrina & The Waves", "reason": "Energetic song to relieve stress"}
                        ],
                        'games': [
                            {"name": "Garden Paws", "reason": "Cute farming game to relax"},
                            {"name": "Slime Rancher", "reason": "Colorful, stress-free game about collecting slimes"}
                        ],
                        'activities': [
                            "Share your stress management tips with others",
                            "Create a self-care routine",
                            "Plan a small reward for yourself",
                            "Try a new hobby or creative outlet"
                        ]
                    }
                },
                'sleep': {
                    'Sad': {
                        'songs': [
                            {"title": "Weightless", "artist": "Marconi Union", "reason": "Sleep-inducing ambient music"},
                            {"title": "Clair de Lune", "artist": "Claude Debussy", "reason": "Peaceful classical piece"}
                        ],
                        'games': [
                            {"name": "Sleep Cycle", "reason": "Track and improve your sleep quality"},
                            {"name": "Calm", "reason": "Meditation and sleep stories app"}
                        ],
                        'activities': [
                            "Create a relaxing bedtime routine",
                            "Try a gentle stretching exercise before bed",
                            "Practice deep breathing for 5 minutes",
                            "Write down your thoughts to clear your mind"
                        ]
                    },
                    'Neutral': {
                        'songs': [
                            {"title": "Nocturne in E-flat major", "artist": "Frédéric Chopin", "reason": "Gentle piano piece for sleep"},
                            {"title": "Sleep", "artist": "Eric Whitacre", "reason": "Soothing choral music"}
                        ],
                        'games': [
                            {"name": "Sleep Town", "reason": "Build a town by maintaining good sleep habits"},
                            {"name": "Forest", "reason": "Stay focused and plant real trees while you sleep"}
                        ],
                        'activities': [
                            "Establish a consistent sleep schedule",
                            "Create a sleep-friendly environment",
                            "Try a sleep meditation",
                            "Practice relaxation techniques before bed"
                        ]
                    },
                    'Happy': {
                        'songs': [
                            {"title": "Lullaby", "artist": "Brahms", "reason": "Classic calming melody"},
                            {"title": "Goodnight Sweetheart", "artist": "The Spaniels", "reason": "Gentle doo-wop for peaceful sleep"}
                        ],
                        'games': [
                            {"name": "Pokemon Sleep", "reason": "Track sleep while collecting Pokemon"},
                            {"name": "Sleep Cycle", "reason": "Wake up feeling refreshed with smart alarm"}
                        ],
                        'activities': [
                            "Share your sleep success tips with others",
                            "Create a relaxing evening routine",
                            "Practice gratitude before bed",
                            "Try a new relaxation technique"
                        ]
                    }
                },
                'loneliness': {
                    'Sad': {
                        'songs': [
                            {"title": "Lean on Me", "artist": "Bill Withers", "reason": "Reminder that you're not alone"},
                            {"title": "You've Got a Friend", "artist": "Carole King", "reason": "Comforting message about friendship"}
                        ],
                        'games': [
                            {"name": "Among Us", "reason": "Social deduction game to connect with others"},
                            {"name": "Minecraft", "reason": "Build and explore with others online"}
                        ],
                        'activities': [
                            "Join an online community or forum",
                            "Try a virtual group activity or class",
                            "Reach out to an old friend or family member",
                            "Start a new hobby that can be done with others"
                        ]
                    },
                    'Neutral': {
                        'songs': [
                            {"title": "Count on Me", "artist": "Bruno Mars", "reason": "Upbeat song about friendship"},
                            {"title": "With a Little Help from My Friends", "artist": "The Beatles", "reason": "Classic about the importance of connection"}
                        ],
                        'games': [
                            {"name": "Stardew Valley", "reason": "Farming game with social elements"},
                            {"name": "Animal Crossing", "reason": "Virtual world to connect with others"}
                        ],
                        'activities': [
                            "Look for local community events or groups",
                            "Try a new social activity or hobby",
                            "Join a book club or discussion group",
                            "Volunteer for a cause you care about"
                        ]
                    },
                    'Happy': {
                        'songs': [
                            {"title": "Happy Together", "artist": "The Turtles", "reason": "Cheerful song about togetherness"},
                            {"title": "You've Got a Friend in Me", "artist": "Randy Newman", "reason": "Disney classic about friendship"}
                        ],
                        'games': [
                            {"name": "Overcooked", "reason": "Fun cooperative cooking game"},
                            {"name": "Fall Guys", "reason": "Playful multiplayer game to meet new people"}
                        ],
                        'activities': [
                            "Share your social success tips with others",
                            "Plan a small social gathering",
                            "Try a new group activity",
                            "Help others who might be feeling lonely"
                        ]
                    }
                }
            }
            
            if category in recommendations and mood in recommendations[category]:
                category_recs = recommendations[category][mood]
                song = random.choice(category_recs['songs'])
                game = random.choice(category_recs['games'])
                activity = random.choice(category_recs['activities'])
                
                return {
                    'song': f"🎵 Song Recommendation: '{song['title']}' by {song['artist']} - {song['reason']}",
                    'game': f"🎮 Game Recommendation: '{game['name']}' - {game['reason']}",
                    'activity': f"✨ Activity Suggestion: {activity}"
                }
            return None
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {str(e)}")
            return None

    def generate_response(self, category, mood):
        """Generate response based on category and mood"""
        try:
            # Define cute chatbot symbols based on mood
            chatbot_symbols = {
                'Sad': [
                    "🤗", "💝", "💫", "🌟", "✨", "💕", "💖", "💗", "💓", "💞"
                ],
                'Neutral': [
                    "🤔", "💭", "💫", "🌟", "✨", "💕", "💖", "💗", "💓", "💞"
                ],
                'Happy': [
                    "😊", "💝", "💫", "🌟", "✨", "💕", "💖", "💗", "💓", "💞"
                ]
            }
            
            # Get random chatbot symbol based on mood
            chatbot_symbol = random.choice(chatbot_symbols.get(mood, chatbot_symbols['Neutral']))
            
            # Define loading animation frames
            loading_frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
            
            # Define base responses for each category and mood
            base_responses = {
                'anxiety': {
                    'Sad': [
                        "I understand anxiety can be really challenging. Let's try a quick grounding exercise: Take 3 deep breaths, counting to 4 as you inhale and 4 as you exhale. Would you like to try this together?",
                        "It's okay to feel anxious. I'm here to listen. Could you tell me more about what's triggering these feelings? Sometimes talking about it can help us understand it better.",
                        "Remember that anxiety is a natural response, but we can work on managing it together. Would you like to learn about some practical techniques that might help?"
                    ],
                    'Neutral': [
                        "I notice you're mentioning anxiety. Would you like to explore some practical coping strategies? I can share some techniques that many people find helpful.",
                        "Anxiety can affect us in different ways. How has it been impacting your daily life? This can help me suggest more relevant coping strategies."
                    ],
                    'Happy': [
                        "I'm glad you're feeling good while discussing this! Would you like to share what's been helping you manage anxiety? Your experience could help others too.",
                        "That's great that you're open about your anxiety! What strategies have worked well for you? Sharing your journey can be inspiring for others."
                    ]
                },
                'depression': {
                    'Sad': [
                        "I hear you, and it's important to know that you're not alone. Have you considered talking to a mental health professional? They can provide specialized support and guidance.",
                        "Depression can be really difficult to deal with. Would you like to share more about what you're experiencing? Sometimes talking about it can help us understand our feelings better.",
                        "Your feelings are valid. Let's talk about what might help you feel better. Have you tried any activities that usually bring you joy?"
                    ],
                    'Neutral': [
                        "I notice you're mentioning depression. Would you like to talk about how you're feeling? Understanding your experience better can help me provide more relevant support.",
                        "Depression can affect people in different ways. How has it been affecting your daily life? This can help me suggest more appropriate coping strategies."
                    ],
                    'Happy': [
                        "I'm glad you're feeling better! Would you like to share what's been helping you? Your experience could be valuable for others going through similar challenges.",
                        "That's wonderful that you're feeling good! What strategies have been working for you? Sharing your success can help others find their own path to recovery."
                    ]
                },
                'stress': {
                    'Sad': [
                        "Stress can be really overwhelming. Let's try a quick stress management technique: Take a moment to tense and then relax each muscle group, starting from your toes. Would you like to try this together?",
                        "It's important to take care of yourself. Would you like to talk about what's causing your stress? Sometimes identifying the source can help us find solutions.",
                        "Remember to take breaks and practice self-care. What activities usually help you relax? We can explore some new relaxation techniques together."
                    ],
                    'Neutral': [
                        "I notice you're mentioning stress. Would you like to learn about some effective stress management techniques? I can share some practical strategies that might help.",
                        "Stress affects everyone differently. How has it been impacting your daily life? This can help me suggest more relevant coping strategies."
                    ],
                    'Happy': [
                        "I'm glad you're feeling good while managing stress! What's been working for you? Your experience could help others dealing with stress.",
                        "That's great that you're handling stress well! Would you like to share your strategies? Your approach might be helpful for others."
                    ]
                },
                'sleep': {
                    'Sad': [
                        "Sleep issues can be really frustrating. Let's try a simple sleep hygiene tip: Create a relaxing bedtime routine, like reading a book or taking a warm bath. Would you like to learn more about sleep hygiene practices?",
                        "Poor sleep can affect your mental health. Would you like to discuss what might be keeping you up? Together, we can explore some solutions.",
                        "Creating a peaceful sleep environment can help. Have you tried any relaxation techniques before bed? I can suggest some that might work for you."
                    ],
                    'Neutral': [
                        "I notice you're mentioning sleep issues. Would you like to learn about some sleep hygiene tips? I can share some practical strategies that might help.",
                        "Sleep problems can affect us in different ways. How has it been impacting your daily life? This can help me suggest more relevant solutions."
                    ],
                    'Happy': [
                        "I'm glad you're feeling good about your sleep! What's been helping you? Your experience could help others improve their sleep quality.",
                        "That's great that you're sleeping better! Would you like to share your tips? Your success could inspire others to improve their sleep habits."
                    ]
                },
                'loneliness': {
                    'Sad': [
                        "Feeling lonely can be really hard. Have you considered joining any social groups or activities? There are many ways to connect with others who share your interests.",
                        "Connection is important for mental health. Would you like to talk about ways to build more social connections? I can suggest some practical steps you could take.",
                        "Remember that it's okay to reach out to others. Have you tried connecting with friends or family? Sometimes taking the first step can be the hardest."
                    ],
                    'Neutral': [
                        "I notice you're mentioning loneliness. Would you like to discuss ways to build connections? I can suggest some practical steps you could take.",
                        "Loneliness affects everyone differently. How has it been affecting your daily life? This can help me suggest more relevant ways to connect."
                    ],
                    'Happy': [
                        "I'm glad you're feeling connected! What's been helping you build relationships? Your experience could help others who are feeling lonely.",
                        "That's great that you're feeling good socially! Would you like to share your experiences? Your success could inspire others to build more connections."
                    ]
                }
            }
            
            # Get base response
            if category in base_responses and mood in base_responses[category]:
                base_response = random.choice(base_responses[category][mood])
            else:
                base_response = "I'm here to listen. Would you like to tell me more?"
            
            # Get recommendations
            recommendations = self.get_recommendations(category, mood)
            
            # Define fun, encouraging comments based on mood
            encouraging_comments = {
                'Sad': [
                    "🌟 You're stronger than you know! Taking the first step to talk about it is already a huge win!",
                    "💪 Hey, you're doing great! Just by reaching out, you're showing incredible courage!",
                    "✨ You're a warrior! Every small step forward is a victory worth celebrating!",
                    "🎯 You've got this! Remember, even superheroes need a moment to recharge!",
                    "🌈 Your strength is inspiring! You're making progress, even if it doesn't feel like it!"
                ],
                'Neutral': [
                    "🚀 You're on the right track! Keep that momentum going!",
                    "🎨 Your journey is unique and beautiful, just like you!",
                    "💫 You're making great progress! Every day is a new opportunity!",
                    "🌟 You're doing better than you think! Keep shining!",
                    "🎯 You're capable of amazing things! Believe in yourself!"
                ],
                'Happy': [
                    "🎉 Your positive energy is contagious! Keep spreading those good vibes!",
                    "✨ You're absolutely crushing it! Your progress is inspiring!",
                    "🌟 You're a ray of sunshine! Your attitude is making a difference!",
                    "🎨 You're creating your own beautiful story! Keep writing it!",
                    "💫 You're making the world a better place just by being you!"
                ]
            }
            
            # Get a random encouraging comment based on mood
            encouraging_comment = random.choice(encouraging_comments.get(mood, encouraging_comments['Neutral']))
            
            if recommendations:
                return f"""
{chatbot_symbol} {base_response}

{encouraging_comment}

🎵 Here's a song that might help:
{recommendations['song']}

🎮 Try this game to lift your spirits:
{recommendations['game']}

✨ Give this activity a try:
{recommendations['activity']}

Remember: You're doing better than you think! 🌟
"""
            
            return f"""
{chatbot_symbol} {base_response}

{encouraging_comment}

Remember: You're doing better than you think! 🌟
"""
                
        except Exception as e:
            logger.error(f"Response generation error: {str(e)}")
            return f"""
🤗 I'm here to listen. Would you like to tell me more?

🌟 You're doing better than you think! Every step forward is progress!
"""

    def save_conversation(self, user_message, bot_response, mood, categories):
        """Save conversation to database"""
        try:
            db, cursor = self.get_db()
            cursor.execute('''
                INSERT INTO conversations (user_message, bot_response, mood, categories, timestamp)
                VALUES (?, ?, ?, ?, ?)
            ''', (user_message, bot_response, mood, ','.join(categories), datetime.now()))
            db.commit()
        except Exception as e:
            logger.error(f"Error saving conversation: {str(e)}")

    def get_conversation_history(self, limit=5):
        """Retrieve recent conversation history"""
        try:
            db, cursor = self.get_db()
            cursor.execute('''
                SELECT user_message, bot_response, mood, categories, timestamp
                FROM conversations
                ORDER BY timestamp DESC
                LIMIT ?
            ''', (limit,))
            return cursor.fetchall()
        except Exception as e:
            logger.error(f"Error retrieving conversation history: {str(e)}")
            return []

    def process_message(self, message):
        """Process user message and generate response"""
        try:
            # Generate message hash for caching
            message_hash = hashlib.md5(message.encode()).hexdigest()
            
            # Analyze mood
            mood = self.enhanced_mood_analysis(message)
            
            # Identify keywords/categories
            categories = self.identify_keywords(message)
            
            # Get response from cache or generate new one
            category = categories[0] if categories else None
            response = self.get_cached_response(category, mood, message_hash)
            
            # Save conversation
            self.save_conversation(message, response, mood, categories)
            
            return {
                "response": response,
                "mood": mood,
                "categories": categories,
                "loading": False  # Indicate that response is ready
            }
        except Exception as e:
            logger.error(f"Message processing error: {str(e)}")
            return {
                "response": "I apologize, but I'm having trouble processing your message. Could you please try again?",
                "mood": "Neutral",
                "categories": [],
                "loading": False
            } 