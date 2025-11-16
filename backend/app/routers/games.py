"""
Games router - handles game sessions and gameplay
"""
import logging
import random
from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Question, Player, GameSession, GameAnswer, GameSettings
from app.schemas import (
    PlayerCreate, PlayerResponse, GameSessionStart, GameSessionSubmit,
    GameSessionResponse, QuestionForGame, GameCompleteResponse, GameReview
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/players", response_model=PlayerResponse, status_code=status.HTTP_201_CREATED)
async def register_player(player: PlayerCreate, db: Session = Depends(get_db)):
    """
    Register a new player for the game
    Each registration creates a new player record, even if the email already exists.
    This ensures each game session has its own player identity.
    """
    logger.info(f"Registering new player: {player.email}")
    
    # Always create a new player for each game session
    # This allows the same email to be used for multiple game sessions
    # while maintaining separate player identities and names
    db_player = Player(**player.model_dump())
    db.add(db_player)
    
    try:
        db.commit()
        db.refresh(db_player)
        logger.info(f"Player registered successfully with ID: {db_player.id}")
        return db_player
    except Exception as e:
        db.rollback()
        logger.error(f"Error registering player: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error registering player"
        )


@router.post("/start", response_model=dict)
async def start_game(
    game_start: GameSessionStart,
    db: Session = Depends(get_db)
):
    """
    Start a new game session for a player
    Returns the game session ID and list of questions (without answers)
    """
    logger.info(f"Starting new game for player ID: {game_start.player_id}")
    
    # Verify player exists
    player = db.query(Player).filter(Player.id == game_start.player_id).first()
    if not player:
        logger.warning(f"Player not found: {game_start.player_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found"
        )
    
    # Get game settings
    game_settings = db.query(GameSettings).first()
    if not game_settings:
        logger.error("Game settings not found")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Game settings not configured"
        )
    
    # Get random active questions
    all_questions = db.query(Question).filter(Question.is_active == True).all()
    
    if len(all_questions) < game_settings.questions_per_game:
        logger.warning(f"Not enough questions available: {len(all_questions)} < {game_settings.questions_per_game}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Not enough questions available. Need {game_settings.questions_per_game}, found {len(all_questions)}"
        )
    
    # Randomly select questions
    selected_questions = random.sample(all_questions, game_settings.questions_per_game)
    
    # Create game session
    game_session = GameSession(
        player_id=game_start.player_id,
        status="in_progress",
        game_config={
            "questions_per_game": game_settings.questions_per_game,
            "timer_seconds": game_settings.timer_seconds,
            "points_correct": game_settings.points_correct,
            "points_wrong": game_settings.points_wrong,
            "time_bonus_max": game_settings.time_bonus_max
        }
    )
    db.add(game_session)
    db.flush()  # Get the game session ID
    
    # Create placeholder game answers
    for idx, question in enumerate(selected_questions):
        game_answer = GameAnswer(
            game_session_id=game_session.id,
            question_id=question.id,
            question_order=idx + 1,
            player_answer=None,
            is_correct=None,
            time_taken=None,
            points_earned=0
        )
        db.add(game_answer)
    
    try:
        db.commit()
        db.refresh(game_session)
        logger.info(f"Game session created with ID: {game_session.id}")
        
        # Return questions without correct answers
        questions_for_game = [
            QuestionForGame.model_validate(q) for q in selected_questions
        ]
        
        return {
            "game_session_id": game_session.id,
            "questions": questions_for_game,
            "timer_seconds": game_settings.timer_seconds
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error starting game: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error starting game"
        )


@router.post("/{game_session_id}/submit", response_model=GameCompleteResponse)
async def submit_game(
    game_session_id: int,
    submission: GameSessionSubmit,
    db: Session = Depends(get_db)
):
    """
    Submit answers for a completed game
    Calculates score and returns results with review
    """
    logger.info(f"Submitting game answers for session: {game_session_id}")
    
    # Get game session
    game_session = db.query(GameSession).filter(GameSession.id == game_session_id).first()
    if not game_session:
        logger.warning(f"Game session not found: {game_session_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game session not found"
        )
    
    if game_session.status != "in_progress":
        logger.warning(f"Game session already completed: {game_session_id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Game session already completed"
        )
    
    # Get game settings from session config
    config = game_session.game_config
    points_correct = config.get("points_correct", 100)
    points_wrong = config.get("points_wrong", 0)
    time_bonus_max = config.get("time_bonus_max", 50)
    timer_seconds = config.get("timer_seconds", 20)
    
    # Process each answer
    total_score = 0
    correct_count = 0
    wrong_count = 0
    unanswered_count = 0
    
    for answer_submission in submission.answers:
        # Get the game answer record
        game_answer = db.query(GameAnswer).filter(
            GameAnswer.game_session_id == game_session_id,
            GameAnswer.question_id == answer_submission.question_id
        ).first()
        
        if not game_answer:
            logger.warning(f"Game answer not found for question: {answer_submission.question_id}")
            continue
        
        # Get the question to check correct answer
        question = db.query(Question).filter(Question.id == answer_submission.question_id).first()
        if not question:
            continue
        
        # Update game answer
        game_answer.player_answer = answer_submission.player_answer
        game_answer.time_taken = answer_submission.time_taken
        game_answer.answered_at = datetime.utcnow()
        
        # Calculate if correct
        if answer_submission.player_answer is None:
            # Unanswered
            game_answer.is_correct = None
            game_answer.points_earned = 0
            unanswered_count += 1
        else:
            is_correct = answer_submission.player_answer == question.correct_answer
            game_answer.is_correct = is_correct
            
            if is_correct:
                # Calculate points with time bonus
                base_points = points_correct
                # Time bonus: faster = more points (linear scale)
                if answer_submission.time_taken < timer_seconds:
                    time_ratio = 1 - (answer_submission.time_taken / timer_seconds)
                    time_bonus = int(time_bonus_max * time_ratio)
                else:
                    time_bonus = 0
                
                game_answer.points_earned = base_points + time_bonus
                total_score += game_answer.points_earned
                correct_count += 1
            else:
                game_answer.points_earned = points_wrong
                total_score += points_wrong
                wrong_count += 1
    
    # Update game session
    game_session.status = "completed"
    game_session.completed_at = datetime.utcnow()
    game_session.total_score = total_score
    game_session.correct_answers = correct_count
    game_session.wrong_answers = wrong_count
    game_session.unanswered = unanswered_count
    
    try:
        db.commit()
        db.refresh(game_session)
        logger.info(f"Game completed - Score: {total_score}, Correct: {correct_count}, Wrong: {wrong_count}")
        
        # Notify scoreboard of update
        from app.routers.scoreboard import notify_scoreboard_update
        notify_scoreboard_update()
        
        # Calculate rank
        rank = db.query(func.count(GameSession.id)).filter(
            GameSession.status == "completed",
            GameSession.total_score > total_score
        ).scalar() + 1
        
        total_players = db.query(func.count(GameSession.id)).filter(
            GameSession.status == "completed"
        ).scalar()
        
        # Build review with correct answers
        review = []
        for game_answer in game_session.answers:
            question = game_answer.question
            review.append(GameReview(
                question_id=question.id,
                question_text_en=question.question_text_en,
                question_text_fr=question.question_text_fr,
                correct_answer=question.correct_answer,
                player_answer=game_answer.player_answer,
                is_correct=game_answer.is_correct,
                explanation_en=question.explanation_en,
                explanation_fr=question.explanation_fr,
                time_taken=game_answer.time_taken,
                points_earned=game_answer.points_earned,
                green_label_en=question.green_label_en,
                green_label_fr=question.green_label_fr,
                red_label_en=question.red_label_en,
                red_label_fr=question.red_label_fr
            ))
        
        return GameCompleteResponse(
            game_session=GameSessionResponse.model_validate(game_session),
            rank=rank,
            total_players=total_players,
            review=review
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Error submitting game: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error submitting game"
        )
