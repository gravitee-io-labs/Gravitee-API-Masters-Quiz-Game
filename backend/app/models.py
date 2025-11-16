"""
Database models for the API Masters Quiz application
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, 
    ForeignKey, Text, Float, JSON
)
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    """
    User model - stores admin users (currently just for admin console)
    """
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Question(Base):
    """
    Question model - stores quiz questions with multilingual support
    """
    __tablename__ = "questions"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Question content (multilingual)
    question_text_en = Column(Text, nullable=False)
    question_text_fr = Column(Text, nullable=False)
    
    # Question type (text, image, video, etc.)
    question_type = Column(String(50), default="text")
    
    # Media URL for image/video questions (optional)
    media_url = Column(String(500), nullable=True)
    
    # Correct answer: "green" or "red"
    correct_answer = Column(String(10), nullable=False)
    
    # Answer labels (multilingual) - what "Green" and "Red" represent
    green_label_en = Column(String(100), default="Green")
    green_label_fr = Column(String(100), default="Vert")
    red_label_en = Column(String(100), default="Red")
    red_label_fr = Column(String(100), default="Rouge")
    
    # Explanation shown after answer (multilingual)
    explanation_en = Column(Text, nullable=True)
    explanation_fr = Column(Text, nullable=True)
    
    # Metadata
    is_active = Column(Boolean, default=True)
    difficulty = Column(Integer, default=1)  # 1-5 scale
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    game_answers = relationship("GameAnswer", back_populates="question")


class Player(Base):
    """
    Player model - stores player registration information
    """
    __tablename__ = "players"
    
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    game_sessions = relationship("GameSession", back_populates="player")


class GameSession(Base):
    """
    GameSession model - stores individual game sessions
    """
    __tablename__ = "game_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Player information
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    
    # Game state
    status = Column(String(20), default="in_progress")  # in_progress, completed, abandoned
    
    # Scoring
    total_score = Column(Integer, default=0)
    correct_answers = Column(Integer, default=0)
    wrong_answers = Column(Integer, default=0)
    unanswered = Column(Integer, default=0)
    
    # Timing
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    # Game configuration snapshot (JSON)
    game_config = Column(JSON, nullable=True)
    
    # Relationships
    player = relationship("Player", back_populates="game_sessions")
    answers = relationship("GameAnswer", back_populates="game_session", cascade="all, delete-orphan")


class GameAnswer(Base):
    """
    GameAnswer model - stores individual answers within a game session
    """
    __tablename__ = "game_answers"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # References
    game_session_id = Column(Integer, ForeignKey("game_sessions.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    
    # Answer data
    player_answer = Column(String(10), nullable=True)  # "green", "red", or None for unanswered
    is_correct = Column(Boolean, nullable=True)
    
    # Timing
    time_taken = Column(Float, nullable=True)  # Time in seconds
    
    # Scoring
    points_earned = Column(Integer, default=0)
    
    # Order in the game
    question_order = Column(Integer, nullable=False)
    
    answered_at = Column(DateTime, nullable=True)
    
    # Relationships
    game_session = relationship("GameSession", back_populates="answers")
    question = relationship("Question", back_populates="game_answers")


class GameSettings(Base):
    """
    GameSettings model - stores configurable game parameters
    """
    __tablename__ = "game_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Game configuration
    questions_per_game = Column(Integer, default=15)
    timer_seconds = Column(Integer, default=20)
    
    # Scoring configuration
    points_correct = Column(Integer, default=100)
    points_wrong = Column(Integer, default=0)
    time_bonus_max = Column(Integer, default=50)  # Max bonus points for fast answers
    
    # Updated timestamp
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<GameSettings(questions={self.questions_per_game}, timer={self.timer_seconds})>"
