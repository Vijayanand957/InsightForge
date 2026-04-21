from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import json

from app.database import get_db
from app.models.database_models import User, Insight, UserAction
from app.models.action_schemas import (
    UserActionCreate, UserActionResponse, UserActionUpdate,
    ScheduleRequest, ActionType, ActionStatus
)
from app.api import auth

router = APIRouter(prefix="/actions", tags=["actions"])

def safe_json_loads(data):
    """Safely parse JSON string or return as is"""
    if data is None:
        return None
    if isinstance(data, dict):
        return data
    if isinstance(data, str):
        try:
            return json.loads(data)
        except:
            return {"raw": data}
    return None

@router.post("/implement/{insight_id}", response_model=UserActionResponse)
async def implement_insight(
    insight_id: int,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Mark an insight as implemented"""
    
    # Verify insight exists and belongs to user
    insight = db.query(Insight).filter(
        Insight.id == insight_id,
        Insight.user_id == current_user.id
    ).first()
    
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")
    
    # Check if already implemented
    existing = db.query(UserAction).filter(
        UserAction.insight_id == insight_id,
        UserAction.user_id == current_user.id,
        UserAction.action_type == ActionType.IMPLEMENT.value,
        UserAction.status.in_([ActionStatus.PENDING.value, ActionStatus.COMPLETED.value])
    ).first()
    
    if existing:
        return existing
    
    # Create new action
    action = UserAction(
        user_id=current_user.id,
        insight_id=insight_id,
        action_type=ActionType.IMPLEMENT.value,
        status=ActionStatus.COMPLETED.value,
        completed_at=datetime.utcnow(),
        action_metadata=json.dumps({"title": insight.title})
    )
    
    db.add(action)
    db.commit()
    db.refresh(action)
    
    return UserActionResponse(
        id=action.id,
        user_id=action.user_id,
        insight_id=action.insight_id,
        recommendation_id=action.recommendation_id,
        action_type=action.action_type,
        status=action.status,
        scheduled_for=action.scheduled_for,
        completed_at=action.completed_at,
        notes=action.notes,
        action_metadata=safe_json_loads(action.action_metadata),
        created_at=action.created_at,
        updated_at=action.updated_at
    )

@router.post("/schedule", response_model=UserActionResponse)
async def schedule_action(
    request: ScheduleRequest,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Schedule an insight or recommendation"""
    
    # Verify insight exists if provided
    if request.insight_id:
        insight = db.query(Insight).filter(
            Insight.id == request.insight_id,
            Insight.user_id == current_user.id
        ).first()
        if not insight:
            raise HTTPException(status_code=404, detail="Insight not found")
    
    # Create scheduled action
    action = UserAction(
        user_id=current_user.id,
        insight_id=request.insight_id,
        recommendation_id=request.recommendation_id,
        action_type=ActionType.SCHEDULE.value,
        status=ActionStatus.PENDING.value,
        scheduled_for=request.scheduled_for,
        notes=request.notes
    )
    
    db.add(action)
    db.commit()
    db.refresh(action)
    
    return UserActionResponse(
        id=action.id,
        user_id=action.user_id,
        insight_id=action.insight_id,
        recommendation_id=action.recommendation_id,
        action_type=action.action_type,
        status=action.status,
        scheduled_for=action.scheduled_for,
        completed_at=action.completed_at,
        notes=action.notes,
        action_metadata=safe_json_loads(action.action_metadata),
        created_at=action.created_at,
        updated_at=action.updated_at
    )

@router.post("/dismiss/{insight_id}", response_model=UserActionResponse)
async def dismiss_insight(
    insight_id: int,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Dismiss an insight"""
    
    # Verify insight exists
    insight = db.query(Insight).filter(
        Insight.id == insight_id,
        Insight.user_id == current_user.id
    ).first()
    
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")
    
    # Check if already dismissed
    existing = db.query(UserAction).filter(
        UserAction.insight_id == insight_id,
        UserAction.user_id == current_user.id,
        UserAction.action_type == ActionType.DISMISS.value
    ).first()
    
    if existing:
        return existing
    
    # Create dismiss action
    action = UserAction(
        user_id=current_user.id,
        insight_id=insight_id,
        action_type=ActionType.DISMISS.value,
        status=ActionStatus.COMPLETED.value,
        completed_at=datetime.utcnow()
    )
    
    db.add(action)
    db.commit()
    db.refresh(action)
    
    return UserActionResponse(
        id=action.id,
        user_id=action.user_id,
        insight_id=action.insight_id,
        recommendation_id=action.recommendation_id,
        action_type=action.action_type,
        status=action.status,
        scheduled_for=action.scheduled_for,
        completed_at=action.completed_at,
        notes=action.notes,
        action_metadata=safe_json_loads(action.action_metadata),
        created_at=action.created_at,
        updated_at=action.updated_at
    )

@router.get("/my-actions", response_model=List[UserActionResponse])
async def get_my_actions(
    action_type: Optional[ActionType] = None,
    status: Optional[ActionStatus] = None,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get all actions for current user"""
    
    query = db.query(UserAction).filter(UserAction.user_id == current_user.id)
    
    if action_type:
        query = query.filter(UserAction.action_type == action_type.value)
    
    if status:
        query = query.filter(UserAction.status == status.value)
    
    actions = query.order_by(UserAction.created_at.desc()).all()
    
    # Convert to response format
    result = []
    for action in actions:
        result.append(UserActionResponse(
            id=action.id,
            user_id=action.user_id,
            insight_id=action.insight_id,
            recommendation_id=action.recommendation_id,
            action_type=action.action_type,
            status=action.status,
            scheduled_for=action.scheduled_for,
            completed_at=action.completed_at,
            notes=action.notes,
            action_metadata=safe_json_loads(action.action_metadata),
            created_at=action.created_at,
            updated_at=action.updated_at
        ))
    
    return result

@router.put("/actions/{action_id}", response_model=UserActionResponse)
async def update_action(
    action_id: int,
    update: UserActionUpdate,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Update an action (e.g., mark as completed)"""
    
    action = db.query(UserAction).filter(
        UserAction.id == action_id,
        UserAction.user_id == current_user.id
    ).first()
    
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    
    update_data = update.dict(exclude_unset=True)
    for key, value in update_data.items():
        if key == 'status' and value:
            setattr(action, 'status', value.value)
        elif key == 'action_metadata':
            setattr(action, 'action_metadata', json.dumps(value) if value else None)
        else:
            setattr(action, key, value)
    
    if update.status == ActionStatus.COMPLETED and not action.completed_at:
        action.completed_at = datetime.utcnow()
    
    db.commit()
    db.refresh(action)
    
    return UserActionResponse(
        id=action.id,
        user_id=action.user_id,
        insight_id=action.insight_id,
        recommendation_id=action.recommendation_id,
        action_type=action.action_type,
        status=action.status,
        scheduled_for=action.scheduled_for,
        completed_at=action.completed_at,
        notes=action.notes,
        action_metadata=safe_json_loads(action.action_metadata),
        created_at=action.created_at,
        updated_at=action.updated_at
    )

@router.delete("/actions/{action_id}")
async def delete_action(
    action_id: int,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an action"""
    
    action = db.query(UserAction).filter(
        UserAction.id == action_id,
        UserAction.user_id == current_user.id
    ).first()
    
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    
    db.delete(action)
    db.commit()
    
    return {"message": "Action deleted successfully"}