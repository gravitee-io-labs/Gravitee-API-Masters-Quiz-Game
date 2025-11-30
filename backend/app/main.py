"""
Main FastAPI application for Gravitee AI Quiz Game
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.database import engine, init_db
from app.routers import questions, games, results, settings, auth, scoreboard, categories
from app.config import settings as app_settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager - handles startup and shutdown events
    """
    # Startup
    logger.info("Starting Gravitee AI Quiz Backend...")
    logger.info("Initializing database...")
    init_db()
    logger.info("Database initialized successfully")
    yield
    # Shutdown
    logger.info("Shutting down Gravitee AI Quiz Backend...")


app = FastAPI(
    title="API Masters Quiz API",
    description="Backend API for the API Masters Quiz Game - Become THE API Master!",
    version="1.0.0",
    lifespan=lifespan,
    root_path=app_settings.BASE_PATH
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=app_settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(categories.router, prefix="/api/categories", tags=["Categories"])
app.include_router(questions.router, prefix="/api/questions", tags=["Questions"])
app.include_router(games.router, prefix="/api/games", tags=["Games"])
app.include_router(results.router, prefix="/api/results", tags=["Results"])
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])
app.include_router(scoreboard.router, prefix="/api/scoreboard", tags=["Scoreboard"])


@app.get("/")
async def root():
    """
    Root endpoint - health check
    """
    return {
        "message": "Gravitee AI Quiz API",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
async def health():
    """
    Health check endpoint
    """
    return {"status": "healthy"}


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """
    Global exception handler for unexpected errors
    """
    logger.error(f"Unexpected error: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again later."}
    )
