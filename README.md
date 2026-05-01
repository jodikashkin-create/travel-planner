# ✈️ Travel Planner AI

An AI-powered travel planning app that generates trip itineraries, finds hotels, and discovers local restaurants — all powered by Claude with real-time web search.

## Features

- 🗺️ **AI Trip Itineraries** — Day-by-day plans with activities, meals, and budget estimates
- 🏨 **Hotel Search** — Real hotel recommendations across budget ranges using web search
- 🍽️ **Restaurant Discovery** — Local dining spots from street food to fine dining
- 💾 **Save & Manage Trips** — Persistent trip storage with SQLite
- 🎨 **Fun, Colorful UI** — Vibrant card-based React interface

## Tech Stack

- **Backend:** Python / FastAPI
- **AI:** Anthropic Claude SDK with web search tool
- **Frontend:** React 18 + Vite
- **Database:** SQLite with async SQLAlchemy
- **Deployment:** Render

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Anthropic API key

### Setup

```bash
# Clone
git clone https://github.com/jodikashkin-create/travel-planner.git
cd travel-planner

# Backend
pip install -r backend/requirements.txt

# Frontend
cd frontend && npm install && npm run build && cd ..

# Run
export ANTHROPIC_API_KEY=your_key_here
uvicorn backend.main:app --host 0.0.0.0 --port 10000
```

Visit `http://localhost:10000` 🎉

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/users | Create user |
| GET | /api/users/:username | Get user |
| POST | /api/trips | Create trip |
| GET | /api/trips?user_id=X | List trips |
| GET | /api/trips/:id | Get trip details |
| DELETE | /api/trips/:id | Delete trip |
| POST | /api/trips/:id/itinerary | Generate AI itinerary |
| POST | /api/trips/:id/hotels | Search hotels |
| POST | /api/trips/:id/restaurants | Search restaurants |
| GET | /api/health | Health check |

## Deploy to Render

1. Push to GitHub
2. Create a new Web Service on Render
3. Connect your GitHub repo
4. Set build command: `bash build.sh`
5. Set start command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
6. Add environment variable: `ANTHROPIC_API_KEY`
7. Deploy! 🚀

## License

MIT
