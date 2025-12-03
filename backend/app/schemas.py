"""
Pydantic schemas for request/response validation
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field, field_validator


# Authentication schemas
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str


# Category schemas
class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    color: str = Field(default="#FC5607", pattern="^#[0-9A-Fa-f]{6}$")
    is_active: bool = True


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    is_active: Optional[bool] = None


class CategoryResponse(CategoryBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CategoryWithCount(CategoryResponse):
    """Category with question count"""
    question_count: int = 0


# Player schemas
class PlayerCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone_number: Optional[str] = Field(None, max_length=20)
    
    @field_validator('first_name', 'last_name')
    @classmethod
    def validate_name_not_email(cls, v):
        """Prevent email addresses from being stored in name fields"""
        if '@' in v:
            raise ValueError('Name cannot contain @ symbol or be an email address')
        return v.strip()


class PlayerResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    phone_number: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# Question schemas
class QuestionCreate(BaseModel):
    question_text_en: str = Field(..., min_length=1)
    question_text_fr: str = Field(..., min_length=1)
    question_type: str = "text"
    media_url: Optional[str] = None
    correct_answer: str = Field(..., pattern="^(green|red)$")
    green_label_en: str = "Green"
    green_label_fr: str = "Vert"
    red_label_en: str = "Red"
    red_label_fr: str = "Rouge"
    explanation_en: Optional[str] = None
    explanation_fr: Optional[str] = None
    is_active: bool = True
    difficulty: int = Field(default=1, ge=1, le=5)
    category_id: Optional[int] = None


class QuestionUpdate(BaseModel):
    question_text_en: Optional[str] = None
    question_text_fr: Optional[str] = None
    question_type: Optional[str] = None
    media_url: Optional[str] = None
    correct_answer: Optional[str] = Field(None, pattern="^(green|red)$")
    green_label_en: Optional[str] = None
    green_label_fr: Optional[str] = None
    red_label_en: Optional[str] = None
    red_label_fr: Optional[str] = None
    explanation_en: Optional[str] = None
    explanation_fr: Optional[str] = None
    is_active: Optional[bool] = None
    difficulty: Optional[int] = Field(None, ge=1, le=5)
    category_id: Optional[int] = None


class QuestionResponse(BaseModel):
    id: int
    question_text_en: str
    question_text_fr: str
    question_type: str
    media_url: Optional[str]
    correct_answer: str
    green_label_en: str
    green_label_fr: str
    red_label_en: str
    red_label_fr: str
    explanation_en: Optional[str]
    explanation_fr: Optional[str]
    is_active: bool
    difficulty: int
    category_id: Optional[int]
    category: Optional[CategoryResponse] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class QuestionForGame(BaseModel):
    """
    Question schema for game play - does NOT include correct answer or explanation
    """
    id: int
    question_text_en: str
    question_text_fr: str
    question_type: str
    media_url: Optional[str]
    green_label_en: str
    green_label_fr: str
    red_label_en: str
    red_label_fr: str
    category_id: Optional[int]
    category: Optional[CategoryResponse] = None
    
    class Config:
        from_attributes = True


# Game Answer schemas
class AnswerSubmission(BaseModel):
    question_id: int
    player_answer: Optional[str] = None  # None for unanswered
    time_taken: float = Field(..., ge=0)  # Time in seconds
    
    @field_validator('player_answer')
    @classmethod
    def validate_player_answer(cls, v):
        if v is not None and v not in ['green', 'red']:
            raise ValueError('player_answer must be "green", "red", or null')
        return v


class GameAnswerResponse(BaseModel):
    id: int
    question_id: int
    player_answer: Optional[str]
    is_correct: Optional[bool]
    time_taken: Optional[float]
    points_earned: int
    question_order: int
    
    class Config:
        from_attributes = True


# Game Session schemas
class GameSessionStart(BaseModel):
    player_id: int


class GameSessionSubmit(BaseModel):
    answers: List[AnswerSubmission]


class GameSessionResponse(BaseModel):
    id: int
    player_id: int
    status: str
    total_score: int
    correct_answers: int
    wrong_answers: int
    unanswered: int
    started_at: datetime
    completed_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class GameResultDetail(BaseModel):
    """
    Detailed game result including player info and answers
    """
    id: int
    player: PlayerResponse
    status: str
    total_score: int
    correct_answers: int
    wrong_answers: int
    unanswered: int
    started_at: datetime
    completed_at: Optional[datetime]
    answers: List[GameAnswerResponse]
    
    class Config:
        from_attributes = True


class GameReview(BaseModel):
    """
    Game review showing questions with correct answers and explanations
    """
    question_id: int
    question_text_en: str
    question_text_fr: str
    correct_answer: str
    player_answer: Optional[str]
    is_correct: Optional[bool]
    explanation_en: Optional[str]
    explanation_fr: Optional[str]
    time_taken: Optional[float]
    points_earned: int
    green_label_en: str
    green_label_fr: str
    red_label_en: str
    red_label_fr: str
    category_id: Optional[int] = None
    category: Optional[CategoryResponse] = None


class GameCompleteResponse(BaseModel):
    """
    Response after completing a game with score, rank, and review
    """
    game_session: GameSessionResponse
    rank: int
    total_players: int
    review: List[GameReview]


# Scoreboard schemas
class ScoreboardEntry(BaseModel):
    rank: int
    player_name: str
    email: str
    phone_number: Optional[str] = None
    score: int
    correct_answers: int
    wrong_answers: int
    completed_at: datetime
    
    class Config:
        from_attributes = True


# Settings schemas
class GameSettingsUpdate(BaseModel):
    questions_per_game: Optional[int] = Field(None, ge=1, le=50)
    timer_seconds: Optional[int] = Field(None, ge=5, le=120)
    points_correct: Optional[int] = Field(None, ge=0)
    points_wrong: Optional[int] = Field(None, ge=0)
    time_bonus_max: Optional[int] = Field(None, ge=0)
    category_distribution: Optional[Dict[str, int]] = None  # {"category_id": percentage}


class GameSettingsResponse(BaseModel):
    id: int
    questions_per_game: int
    timer_seconds: int
    points_correct: int
    points_wrong: int
    time_bonus_max: int
    category_distribution: Optional[Dict[str, int]] = None
    updated_at: datetime
    
    class Config:
        from_attributes = True
