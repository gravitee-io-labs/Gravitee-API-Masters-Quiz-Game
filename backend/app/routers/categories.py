"""
Categories router - CRUD operations for question categories
"""
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Category, Question
from app.schemas import CategoryCreate, CategoryUpdate, CategoryResponse, CategoryWithCount
from app.auth import require_admin

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=List[CategoryWithCount])
async def get_all_categories(
    include_inactive: bool = False,
    db: Session = Depends(get_db)
):
    """
    Get all categories with question counts (public endpoint)
    """
    logger.info(f"Fetching categories (include_inactive={include_inactive})")
    
    query = db.query(
        Category,
        func.count(Question.id).filter(Question.is_active == True).label('question_count')
    ).outerjoin(Question).group_by(Category.id)
    
    if not include_inactive:
        query = query.filter(Category.is_active == True)
    
    results = query.all()
    
    categories = []
    for category, count in results:
        cat_dict = CategoryResponse.model_validate(category).model_dump()
        cat_dict['question_count'] = count
        categories.append(CategoryWithCount(**cat_dict))
    
    logger.info(f"Retrieved {len(categories)} categories")
    return categories


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(
    category_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific category by ID
    """
    logger.info(f"Fetching category with ID: {category_id}")
    
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        logger.warning(f"Category not found: {category_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    return category


@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category: CategoryCreate,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin)
):
    """
    Create a new category (admin only)
    """
    logger.info(f"Creating new category: {category.name}")
    
    # Check for duplicate name
    existing = db.query(Category).filter(Category.name == category.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A category with this name already exists"
        )
    
    db_category = Category(**category.model_dump())
    db.add(db_category)
    
    try:
        db.commit()
        db.refresh(db_category)
        logger.info(f"Category created successfully with ID: {db_category.id}")
        return db_category
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating category: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating category"
        )


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int,
    category_update: CategoryUpdate,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin)
):
    """
    Update an existing category (admin only)
    """
    logger.info(f"Updating category with ID: {category_id}")
    
    db_category = db.query(Category).filter(Category.id == category_id).first()
    if not db_category:
        logger.warning(f"Category not found: {category_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Check for duplicate name if name is being updated
    update_data = category_update.model_dump(exclude_unset=True)
    if 'name' in update_data and update_data['name'] != db_category.name:
        existing = db.query(Category).filter(Category.name == update_data['name']).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A category with this name already exists"
            )
    
    # Update only provided fields
    for field, value in update_data.items():
        setattr(db_category, field, value)
    
    try:
        db.commit()
        db.refresh(db_category)
        logger.info(f"Category updated successfully: {category_id}")
        return db_category
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating category: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating category"
        )


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin)
):
    """
    Delete a category (admin only)
    Note: Questions in this category will have their category_id set to NULL
    """
    logger.info(f"Deleting category with ID: {category_id}")
    
    db_category = db.query(Category).filter(Category.id == category_id).first()
    if not db_category:
        logger.warning(f"Category not found: {category_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    try:
        # Set category_id to NULL for all questions in this category
        db.query(Question).filter(Question.category_id == category_id).update(
            {"category_id": None}
        )
        
        db.delete(db_category)
        db.commit()
        logger.info(f"Category deleted successfully: {category_id}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting category: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting category"
        )
