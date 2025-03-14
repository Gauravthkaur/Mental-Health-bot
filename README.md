# Mental Health Chatbot

> An AI-powered mental health companion that provides empathetic responses, personalized recommendations, and a calming interface to support users through anxiety, depression, stress, and other emotional challenges.

A supportive chatbot designed to help users with mental health concerns, providing empathetic responses and helpful resources.

## Deployment Guide

### Backend Deployment (Render)

1. Create a Render account at [render.com](https://render.com)

2. Create a new Web Service:
   - Click "New" and select "Web Service"
   - Connect your GitHub repository or use the "Public Git repository" option
   - Enter your repository URL

3. Configure your Web Service:
   - Name: `your-mental-health-chatbot-api`
   - Environment: Python 3
   - Build Command: `pip install -r requirements.txt && python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords')"`
   - Start Command: `gunicorn backend.app:app`
   - Select the appropriate plan (Free tier is available)

4. Set up environment variables:
   - Add `PYTHON_VERSION`: `3.9.0` (or your preferred version)
   - Add `FLASK_ENV`: `production`

5. Click "Create Web Service" and wait for deployment to complete

6. Note your service URL (e.g., `https://your-mental-health-chatbot-api.onrender.com`)

### Frontend Deployment (Netlify)

1. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Login to Netlify:
```bash
netlify login
```

3. Initialize Netlify:
```bash
netlify init
```

4. Deploy to Netlify:
```bash
netlify deploy --prod
```

5. Set up environment variables in Netlify:
   - Go to Site settings > Build & deploy > Environment
   - Add `REACT_APP_API_URL` with your Render backend URL

### Alternative Deployment Options

#### Backend (PythonAnywhere)

1. Create a PythonAnywhere account
2. Upload your backend files
3. Set up a web app using the Flask framework
4. Configure your virtual environment with requirements.txt
5. Set up your domain and SSL certificate

#### Frontend (Vercel)

1. Create a Vercel account
2. Connect your GitHub repository
3. Configure build settings:
   - Build command: `npm run build`
   - Output directory: `build`
4. Set up environment variables
5. Deploy

## Environment Variables

### Backend
- `FLASK_ENV`: Set to 'production' for deployment
- `PYTHON_VERSION`: Your Python version (for Render)

### Frontend
- `REACT_APP_API_URL`: Your backend API URL

## Local Development

1. Clone the repository:
```bash
git clone https://github.com/yourusername/mental-health-chatbot.git
cd mental-health-chatbot
```

2. Set up the backend:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

3. Set up the frontend:
```bash
cd frontend
npm install
npm start
```

4. Access the application:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## Features

- Real-time chat interface
- Mood analysis
- Personalized responses
- Calming background music
- Responsive design
- Category-based recommendations

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 