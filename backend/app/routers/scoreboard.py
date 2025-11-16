"""
Scoreboard router - real-time scoreboard with SSE support
"""
import logging
import asyncio
from typing import List
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import GameSession
from app.schemas import ScoreboardEntry

logger = logging.getLogger(__name__)

router = APIRouter()

# Store for SSE clients and update flag
scoreboard_clients = []
scoreboard_update_event = asyncio.Event()


@router.get("/", response_model=List[ScoreboardEntry])
async def get_scoreboard(
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """
    Get top scoreboard entries
    """
    logger.info(f"Fetching scoreboard (limit={limit})")
    
    # Get top scores
    sessions = db.query(GameSession).filter(
        GameSession.status == "completed"
    ).order_by(
        GameSession.total_score.desc(),
        GameSession.completed_at.asc()
    ).limit(limit).all()
    
    scoreboard = []
    for rank, session in enumerate(sessions, 1):
        player = session.player
        scoreboard.append(ScoreboardEntry(
            rank=rank,
            player_name=f"{player.first_name} {player.last_name}",
            email=player.email,
            score=session.total_score,
            correct_answers=session.correct_answers,
            wrong_answers=session.wrong_answers,
            completed_at=session.completed_at
        ))
    
    logger.info(f"Retrieved {len(scoreboard)} scoreboard entries")
    return scoreboard


def get_scoreboard_data(db: Session):
    """
    Helper function to fetch scoreboard data
    """
    sessions = db.query(GameSession).filter(
        GameSession.status == "completed"
    ).order_by(
        GameSession.total_score.desc(),
        GameSession.completed_at.asc()
    ).limit(10).all()
    
    scoreboard = []
    for rank, session in enumerate(sessions, 1):
        player = session.player
        scoreboard.append({
            "rank": rank,
            "player_name": f"{player.first_name} {player.last_name}",
            "email": player.email,
            "score": session.total_score,
            "correct_answers": session.correct_answers,
            "wrong_answers": session.wrong_answers,
            "completed_at": session.completed_at.isoformat() if session.completed_at else None
        })
    
    return scoreboard


def notify_scoreboard_update():
    """
    Notify all connected clients that scoreboard has been updated
    """
    scoreboard_update_event.set()
    logger.info("Scoreboard update event triggered")


@router.get("/stream")
async def scoreboard_stream(request: Request, db: Session = Depends(get_db)):
    """
    Server-Sent Events (SSE) endpoint for real-time scoreboard updates
    """
    async def event_generator():
        """
        Generator function that yields SSE events
        """
        logger.info("New SSE client connected to scoreboard")
        
        import json
        
        # Send initial scoreboard data
        scoreboard = get_scoreboard_data(db)
        yield f"data: {json.dumps(scoreboard)}\n\n"
        
        # Keep connection alive and wait for updates
        try:
            while True:
                if await request.is_disconnected():
                    logger.info("SSE client disconnected from scoreboard")
                    break
                
                # Wait for update event or timeout after 30 seconds (for keepalive)
                try:
                    await asyncio.wait_for(scoreboard_update_event.wait(), timeout=30.0)
                    scoreboard_update_event.clear()
                    
                    # Fetch and send updated scoreboard
                    scoreboard = get_scoreboard_data(db)
                    yield f"data: {json.dumps(scoreboard)}\n\n"
                    logger.info("Sent updated scoreboard to client")
                    
                except asyncio.TimeoutError:
                    # Send keepalive comment to prevent connection timeout
                    yield f": keepalive\n\n"
                
        except asyncio.CancelledError:
            logger.info("SSE client connection cancelled")
            raise
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
