from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum

class ActionType(str, Enum):
    IMPLEMENT = "implement"
    SCHEDULE = "schedule"
    DISMISS = "dismiss"
    BOOKMARK = "bookmark"
    LIKE = "like"

class ActionStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ACTIVE = "active"

class UserActionBase(BaseModel):
    insight_id: Optional[int] = None
    recommendation_id: Optional[int] = None
    action_type: ActionType
    status: ActionStatus = ActionStatus.PENDING
    scheduled_for: Optional[datetime] = None
    notes: Optional[str] = None
    action_metadata: Optional[Dict[str, Any]] = Field(None, alias="metadata")  # Changed from 'metadata' to 'action_metadata' with alias

    class Config:
        populate_by_name = True  # Allows both 'action_metadata' and 'metadata' as field names
        from_attributes = True

class UserActionCreate(UserActionBase):
    pass

class UserActionUpdate(BaseModel):
    status: Optional[ActionStatus] = None
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    action_metadata: Optional[Dict[str, Any]] = Field(None, alias="metadata")

    class Config:
        populate_by_name = True

class UserActionResponse(BaseModel):
    id: int
    user_id: int
    insight_id: Optional[int] = None
    recommendation_id: Optional[int] = None
    action_type: str
    status: str
    scheduled_for: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    action_metadata: Optional[Dict[str, Any]] = Field(None, alias="metadata")
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        from_attributes = True

class ScheduleRequest(BaseModel):
    insight_id: Optional[int] = None
    recommendation_id: Optional[int] = None
    scheduled_for: datetime
    notes: Optional[str] = None