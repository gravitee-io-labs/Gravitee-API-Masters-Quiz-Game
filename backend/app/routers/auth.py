"""
Authentication router for admin login
"""
import logging
from datetime import timedelta
from fastapi import APIRouter, HTTPException, status

from app.schemas import UserLogin, Token
from app.auth import authenticate_admin, create_access_token
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/login", response_model=Token)
async def login(user_login: UserLogin):
    """
    Admin login endpoint
    Returns JWT access token on successful authentication
    """
    logger.info(f"Login attempt for user: {user_login.username}")
    
    if not authenticate_admin(user_login.username, user_login.password):
        logger.warning(f"Failed login attempt for user: {user_login.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_login.username}, expires_delta=access_token_expires
    )
    
    logger.info(f"Successful login for user: {user_login.username}")
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout")
async def logout():
    """
    Logout endpoint (client-side token removal)
    """
    return {"message": "Successfully logged out"}
