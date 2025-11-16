"""
Results router - view and manage game results (admin)
"""
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import GameSession, Player
from app.schemas import GameResultDetail, GameAnswerResponse, PlayerResponse
from app.auth import require_admin

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=List[GameResultDetail])
async def get_all_results(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin)
):
    """
    Get all game results with details (admin only)
    """
    logger.info(f"Fetching game results (skip={skip}, limit={limit})")
    
    game_sessions = db.query(GameSession).filter(
        GameSession.status == "completed"
    ).order_by(GameSession.completed_at.desc()).offset(skip).limit(limit).all()
    
    results = []
    for session in game_sessions:
        player_response = PlayerResponse.model_validate(session.player)
        answers = [GameAnswerResponse.model_validate(a) for a in session.answers]
        
        results.append(GameResultDetail(
            id=session.id,
            player=player_response,
            status=session.status,
            total_score=session.total_score,
            correct_answers=session.correct_answers,
            wrong_answers=session.wrong_answers,
            unanswered=session.unanswered,
            started_at=session.started_at,
            completed_at=session.completed_at,
            answers=answers
        ))
    
    logger.info(f"Retrieved {len(results)} game results")
    return results


@router.get("/{game_session_id}", response_model=GameResultDetail)
async def get_result(
    game_session_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin)
):
    """
    Get a specific game result with details (admin only)
    """
    logger.info(f"Fetching game result for session: {game_session_id}")
    
    session = db.query(GameSession).filter(GameSession.id == game_session_id).first()
    if not session:
        logger.warning(f"Game session not found: {game_session_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game session not found"
        )
    
    player_response = PlayerResponse.model_validate(session.player)
    answers = [GameAnswerResponse.model_validate(a) for a in session.answers]
    
    return GameResultDetail(
        id=session.id,
        player=player_response,
        status=session.status,
        total_score=session.total_score,
        correct_answers=session.correct_answers,
        wrong_answers=session.wrong_answers,
        unanswered=session.unanswered,
        started_at=session.started_at,
        completed_at=session.completed_at,
        answers=answers
    )


@router.delete("/{game_session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_result(
    game_session_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin)
):
    """
    Delete a game result (admin only)
    """
    logger.info(f"Deleting game result for session: {game_session_id}")
    
    session = db.query(GameSession).filter(GameSession.id == game_session_id).first()
    if not session:
        logger.warning(f"Game session not found: {game_session_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game session not found"
        )
    
    try:
        db.delete(session)
        db.commit()
        logger.info(f"Game result deleted successfully: {game_session_id}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting game result: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting game result"
        )


@router.patch("/{game_session_id}/score")
async def update_score(
    game_session_id: int,
    score_update: dict,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin)
):
    """
    Update the total score for a game result (admin only)
    """
    logger.info(f"Updating score for game session: {game_session_id}")
    
    session = db.query(GameSession).filter(GameSession.id == game_session_id).first()
    if not session:
        logger.warning(f"Game session not found: {game_session_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game session not found"
        )
    
    new_score = score_update.get("total_score")
    if new_score is None or not isinstance(new_score, int) or new_score < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid score value"
        )
    
    try:
        session.total_score = new_score
        db.commit()
        db.refresh(session)
        logger.info(f"Score updated successfully for session {game_session_id}: {new_score}")
        
        return {"id": session.id, "total_score": session.total_score}
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating score: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating score"
        )
