"""
Questions router - CRUD operations for quiz questions
"""
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Question
from app.schemas import QuestionCreate, QuestionUpdate, QuestionResponse
from app.auth import require_admin

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=List[QuestionResponse])
async def get_all_questions(
    skip: int = 0,
    limit: int = 100,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin)
):
    """
    Get all questions (admin only)
    """
    logger.info(f"Fetching questions (skip={skip}, limit={limit}, include_inactive={include_inactive})")
    
    query = db.query(Question)
    if not include_inactive:
        query = query.filter(Question.is_active == True)
    
    questions = query.offset(skip).limit(limit).all()
    logger.info(f"Retrieved {len(questions)} questions")
    
    return questions


@router.get("/{question_id}", response_model=QuestionResponse)
async def get_question(
    question_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin)
):
    """
    Get a specific question by ID (admin only)
    """
    logger.info(f"Fetching question with ID: {question_id}")
    
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        logger.warning(f"Question not found: {question_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    
    return question


@router.post("/", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
async def create_question(
    question: QuestionCreate,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin)
):
    """
    Create a new question (admin only)
    """
    logger.info(f"Creating new question: {question.question_text_en[:50]}...")
    
    db_question = Question(**question.model_dump())
    db.add(db_question)
    
    try:
        db.commit()
        db.refresh(db_question)
        logger.info(f"Question created successfully with ID: {db_question.id}")
        return db_question
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating question: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating question"
        )


@router.put("/{question_id}", response_model=QuestionResponse)
async def update_question(
    question_id: int,
    question_update: QuestionUpdate,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin)
):
    """
    Update an existing question (admin only)
    """
    logger.info(f"Updating question with ID: {question_id}")
    
    db_question = db.query(Question).filter(Question.id == question_id).first()
    if not db_question:
        logger.warning(f"Question not found: {question_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    
    # Update only provided fields
    update_data = question_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_question, field, value)
    
    try:
        db.commit()
        db.refresh(db_question)
        logger.info(f"Question updated successfully: {question_id}")
        return db_question
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating question: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating question"
        )


@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin)
):
    """
    Delete a question (admin only)
    """
    logger.info(f"Deleting question with ID: {question_id}")
    
    db_question = db.query(Question).filter(Question.id == question_id).first()
    if not db_question:
        logger.warning(f"Question not found: {question_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    
    try:
        db.delete(db_question)
        db.commit()
        logger.info(f"Question deleted successfully: {question_id}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting question: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting question"
        )


@router.get("/count/total")
async def get_question_count(
    db: Session = Depends(get_db)
):
    """
    Get total count of active questions (public endpoint)
    """
    count = db.query(Question).filter(Question.is_active == True).count()
    return {"total": count, "active": count}
