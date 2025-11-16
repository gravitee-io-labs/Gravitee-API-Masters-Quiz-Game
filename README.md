# API Masters Quiz Game

Become THE API Master! A complete quiz game system with real-time scoring, admin console, and multilingual support.

## Components

- **Backend API**: Python FastAPI server managing questions, sessions, and scoring
- **Game Client**: Player-facing quiz interface with registration and gameplay
- **Admin Console**: Management interface for questions, results, and settings
- **Scoreboard**: Real-time display of top scores

## Features

- 🌍 Multilingual support (English/French)
- 🌓 Light/Dark theme support
- ⚡ Real-time scoreboard updates
- 🎮 Keyboard support (G/R keys) for physical buzzer buttons
- 🔒 Admin authentication
- 🐳 Fully containerized with Docker

## Quick Start

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

## Access Points

- **Game Client**: http://localhost:8080
- **Admin Console**: http://localhost:8081 (admin/admin)
- **Scoreboard**: http://localhost:8082
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Game Flow

1. Player visits home page and clicks "Play"
2. Registration (First Name, Last Name, Email)
3. Game rules explanation
4. 15 questions with 20-second timer each
5. Score calculation based on correctness and response time
6. Display score, rank, and review wrong answers

## Admin Features

- Create, edit, and delete questions
- View all game results and player details
- Configure game settings (number of questions, timer duration)
- Manage scoreboard entries

## Technical Details

- Backend: Python FastAPI with PostgreSQL
- Frontend: Vanilla HTML/CSS/JavaScript
- Real-time updates: Server-Sent Events (SSE)
- Containerization: Docker & Docker Compose
- Resilient: Automatic retries and timeout handling

## Development

Each component can be developed independently:

```bash
# Backend development
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend development (use any HTTP server)
cd game-client
python -m http.server 8080
```

## Configuration

Game settings can be modified through the Admin Console or by editing environment variables in `docker-compose.yml`.

Default credentials: `admin` / `admin` (change in production!)

---

Made with ❤️ by **Dorian BLANC**
