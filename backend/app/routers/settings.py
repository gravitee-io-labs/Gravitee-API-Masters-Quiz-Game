"""
Settings router - manage game configuration (admin)
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import GameSettings
from app.schemas import GameSettingsUpdate, GameSettingsResponse
from app.auth import require_admin

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=GameSettingsResponse)
async def get_settings(db: Session = Depends(get_db)):
    """
    Get current game settings (public endpoint for game client)
    """
    logger.info("Fetching game settings")
    
    settings = db.query(GameSettings).first()
    if not settings:
        logger.error("Game settings not found")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Game settings not configured"
        )
    
    return settings


@router.put("/", response_model=GameSettingsResponse)
async def update_settings(
    settings_update: GameSettingsUpdate,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin)
):
    """
    Update game settings (admin only)
    """
    logger.info("Updating game settings")
    
    settings = db.query(GameSettings).first()
    if not settings:
        logger.error("Game settings not found")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Game settings not configured"
        )
    
    # Update only provided fields
    update_data = settings_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(settings, field, value)
    
    try:
        db.commit()
        db.refresh(settings)
        logger.info("Game settings updated successfully")
        return settings
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating game settings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating game settings"
        )
