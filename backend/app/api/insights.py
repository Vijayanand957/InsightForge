import os
import json
import pandas as pd
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
import logging
import traceback
import numpy as np

from app.database import get_db
from app.models.database_models import User, Dataset, Insight
from app.models.schemas import (
    InsightRequest, InsightResponse, 
    PredictionRequest, PredictionResponse,
    RecommendationRequest, RecommendationResponse
)
from app.core.gemini_client import GeminiClient
from app.services.insight_service import InsightService
from app.services.prediction_service import PredictionService
from app.core.data_processor import clean_dict_for_json

# Import auth properly
from . import auth

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/insights", tags=["insights"])

def safe_json_serialize(obj):
    """Safely serialize objects to JSON"""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif pd.isna(obj):
        return None
    return obj

@router.post("/generate", response_model=InsightResponse)
async def generate_insights(
    request: InsightRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Generate AI-powered insights from data using Gemini AI"""
    logger.info(f"Generating insights for dataset {request.dataset_id}")
    
    # Validate request
    if not request.dataset_id:
        raise HTTPException(status_code=400, detail="dataset_id is required")
    
    # Check if user is authenticated
    if not current_user:
        logger.error("User not authenticated")
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get dataset
    dataset = db.query(Dataset).filter(
        Dataset.id == request.dataset_id,
        Dataset.user_id == current_user.id
    ).first()
    
    if not dataset:
        logger.error(f"Dataset {request.dataset_id} not found for user {current_user.id}")
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    try:
        # Check if file exists
        if not os.path.exists(dataset.file_path):
            logger.error(f"File not found: {dataset.file_path}")
            raise HTTPException(status_code=404, detail="Dataset file not found")
        
        # Load data with error handling
        try:
            if dataset.file_path.endswith('.csv'):
                df = pd.read_csv(dataset.file_path)
            elif dataset.file_path.endswith('.json'):
                df = pd.read_json(dataset.file_path)
            else:
                df = pd.read_excel(dataset.file_path)
        except Exception as e:
            logger.error(f"Error loading file: {e}")
            raise HTTPException(status_code=400, detail=f"Error loading dataset: {str(e)}")
        
        # Check if dataframe is empty
        if df.empty:
            raise HTTPException(status_code=400, detail="Dataset is empty")
        
        # Initialize services
        try:
            gemini_client = GeminiClient()
        except ValueError as e:
            logger.error(f"Gemini client initialization failed: {e}")
            raise HTTPException(status_code=500, detail="Gemini API key not configured")
        except Exception as e:
            logger.error(f"Error initializing Gemini client: {e}")
            raise HTTPException(status_code=500, detail="AI service unavailable")
        
        insight_service = InsightService(df, gemini_client)
        
        # Generate insights
        try:
            insights = await insight_service.generate_data_insights(
                focus_areas=request.focus_areas or [],
                business_context=request.business_context or ""
            )
        except Exception as e:
            logger.error(f"Error generating insights: {e}")
            logger.error(traceback.format_exc())
            raise HTTPException(status_code=500, detail=f"Error generating insights: {str(e)}")
        
        # Clean insights for JSON serialization
        insights = clean_dict_for_json(insights)
        
        # Save insight to database
        insight = Insight(
            dataset_id=dataset.id,
            user_id=current_user.id,
            insight_type="ai_generated",
            title=insights.get("title", "Data Insights"),
            content=json.dumps(insights, default=safe_json_serialize),
            confidence_score=float(insights.get("confidence", 0.8)),
            tags=json.dumps(request.focus_areas) if request.focus_areas else None
        )
        
        db.add(insight)
        db.commit()
        db.refresh(insight)
        
        # Convert to response model
        response = InsightResponse(
            id=insight.id,
            dataset_id=insight.dataset_id,
            user_id=insight.user_id,
            insight_type=insight.insight_type,
            title=insight.title,
            content=json.loads(insight.content),
            confidence_score=insight.confidence_score,
            priority=insight.priority,
            tags=json.loads(insight.tags) if insight.tags else None,
            created_at=insight.created_at
        )
        
        logger.info(f"Successfully generated insights for dataset {request.dataset_id}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Insight generation failed: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Insight generation failed: {str(e)}")

@router.post("/predict", response_model=PredictionResponse)
async def predict(
    request: PredictionRequest,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Generate predictions using machine learning models"""
    logger.info(f"Generating predictions for dataset {request.dataset_id}")
    
    # Validate request
    if not request.dataset_id:
        raise HTTPException(status_code=400, detail="dataset_id is required")
    if not request.target_column:
        raise HTTPException(status_code=400, detail="target_column is required")
    
    # Check if user is authenticated
    if not current_user:
        logger.error("User not authenticated")
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get dataset
    dataset = db.query(Dataset).filter(
        Dataset.id == request.dataset_id,
        Dataset.user_id == current_user.id
    ).first()
    
    if not dataset:
        logger.error(f"Dataset {request.dataset_id} not found for user {current_user.id}")
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    try:
        # Check if file exists
        if not os.path.exists(dataset.file_path):
            logger.error(f"File not found: {dataset.file_path}")
            raise HTTPException(status_code=404, detail="Dataset file not found")
        
        # Load data
        try:
            if dataset.file_path.endswith('.csv'):
                df = pd.read_csv(dataset.file_path)
            elif dataset.file_path.endswith('.json'):
                df = pd.read_json(dataset.file_path)
            else:
                df = pd.read_excel(dataset.file_path)
        except Exception as e:
            logger.error(f"Error loading file: {e}")
            raise HTTPException(status_code=400, detail=f"Error loading dataset: {str(e)}")
        
        # Check if target column exists
        if request.target_column not in df.columns:
            available_cols = df.columns.tolist()[:10]
            raise HTTPException(
                status_code=400, 
                detail=f"Target column '{request.target_column}' not found. Available columns: {available_cols}"
            )
        
        # Initialize prediction service
        prediction_service = PredictionService(df)
        
        # Generate predictions
        try:
            predictions = prediction_service.predict(
                target_column=request.target_column,
                features=request.features or [],
                model_type=request.model_type or 'regression',
                future_periods=request.future_periods or 5
            )
        except ValueError as e:
            logger.error(f"Validation error: {e}")
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            logger.error(f"Error generating predictions: {e}")
            logger.error(traceback.format_exc())
            raise HTTPException(status_code=500, detail=f"Error generating predictions: {str(e)}")
        
        # Clean predictions for JSON serialization
        predictions = clean_dict_for_json(predictions)
        
        # Save as insight
        insight = Insight(
            dataset_id=dataset.id,
            user_id=current_user.id,
            insight_type="prediction",
            title=f"Predictions for {request.target_column}",
            content=json.dumps(predictions, default=safe_json_serialize),
            confidence_score=float(predictions.get("model_performance", {}).get("r2_score", 0.7)),
            tags=json.dumps(["prediction", request.model_type or "regression"])
        )
        
        db.add(insight)
        db.commit()
        db.refresh(insight)
        
        response = PredictionResponse(
            id=insight.id,
            predictions=predictions,
            insights=json.loads(insight.content),
            confidence_score=insight.confidence_score,
            created_at=insight.created_at
        )
        
        logger.info(f"Successfully generated predictions for dataset {request.dataset_id}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prediction failed: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@router.post("/recommend", response_model=RecommendationResponse)
async def recommend(
    request: RecommendationRequest,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Generate business recommendations based on data analysis using Gemini AI"""
    logger.info(f"Generating recommendations for dataset {request.dataset_id}")
    
    # Validate request
    if not request.dataset_id:
        raise HTTPException(status_code=400, detail="dataset_id is required")
    
    # Check if user is authenticated
    if not current_user:
        logger.error("User not authenticated")
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get dataset
    dataset = db.query(Dataset).filter(
        Dataset.id == request.dataset_id,
        Dataset.user_id == current_user.id
    ).first()
    
    if not dataset:
        logger.error(f"Dataset {request.dataset_id} not found for user {current_user.id}")
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    try:
        # Check if file exists
        if not os.path.exists(dataset.file_path):
            logger.error(f"File not found: {dataset.file_path}")
            raise HTTPException(status_code=404, detail="Dataset file not found")
        
        # Load data
        try:
            if dataset.file_path.endswith('.csv'):
                df = pd.read_csv(dataset.file_path)
            elif dataset.file_path.endswith('.json'):
                df = pd.read_json(dataset.file_path)
            else:
                df = pd.read_excel(dataset.file_path)
        except Exception as e:
            logger.error(f"Error loading file: {e}")
            raise HTTPException(status_code=400, detail=f"Error loading dataset: {str(e)}")
        
        # Initialize services
        try:
            gemini_client = GeminiClient()
        except ValueError as e:
            logger.error(f"Gemini client initialization failed: {e}")
            raise HTTPException(status_code=500, detail="Gemini API key not configured")
        except Exception as e:
            logger.error(f"Error initializing Gemini client: {e}")
            raise HTTPException(status_code=500, detail="AI service unavailable")
        
        insight_service = InsightService(df, gemini_client)
        
        # Generate recommendations using Gemini AI
        try:
            recommendations = await insight_service.generate_recommendations(
                business_goal=request.business_goal or "Improve business performance",
                constraints=request.constraints or []
            )
        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
            logger.error(traceback.format_exc())
            raise HTTPException(status_code=500, detail=f"Error generating recommendations: {str(e)}")
        
        # Clean recommendations for JSON serialization
        recommendations = clean_dict_for_json(recommendations)
        
        # Save as insight
        insight = Insight(
            dataset_id=dataset.id,
            user_id=current_user.id,
            insight_type="recommendation",
            title=f"Recommendations for {request.business_goal[:50] if request.business_goal else 'Business'}",
            content=json.dumps(recommendations, default=safe_json_serialize),
            confidence_score=recommendations.get("confidence", 0.8),
            tags=json.dumps(["recommendation"])
        )
        
        db.add(insight)
        db.commit()
        db.refresh(insight)
        
        # Extract recommendation data
        rec_data = recommendations if isinstance(recommendations, dict) else {}
        
        response = RecommendationResponse(
            id=insight.id,
            title=rec_data.get("title", "AI Recommendations"),
            description=rec_data.get("description", "Based on your data analysis"),
            impact=rec_data.get("impact", "medium"),
            effort=rec_data.get("effort", "medium"),
            timeframe=rec_data.get("timeframe", "short_term"),
            confidence=rec_data.get("confidence", 0.8),
            priority=rec_data.get("priority", "medium"),
            created_at=insight.created_at
        )
        
        logger.info(f"Successfully generated recommendations for dataset {request.dataset_id}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Recommendation generation failed: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Recommendation generation failed: {str(e)}")

@router.get("/by-dataset/{dataset_id}", response_model=List[InsightResponse])
async def get_insights_by_dataset(
    dataset_id: int,
    insight_type: Optional[str] = None,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get all insights for a specific dataset"""
    logger.info(f"Fetching insights for dataset {dataset_id}")
    
    # Check if user is authenticated
    if not current_user:
        logger.error("User not authenticated")
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Verify dataset exists and belongs to user
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.user_id == current_user.id
    ).first()
    
    if not dataset:
        logger.info(f"Dataset {dataset_id} not found for user {current_user.id}")
        return []
    
    # Build query
    query = db.query(Insight).filter(Insight.dataset_id == dataset_id)
    
    if insight_type:
        query = query.filter(Insight.insight_type == insight_type)
    
    insights = query.order_by(Insight.created_at.desc()).all()
    
    response = []
    for insight in insights:
        try:
            # Safely parse content
            content = {}
            if insight.content:
                try:
                    content = json.loads(insight.content)
                except json.JSONDecodeError:
                    content = {"raw": insight.content}
            
            # Safely parse tags
            tags = None
            if insight.tags:
                try:
                    tags = json.loads(insight.tags)
                except json.JSONDecodeError:
                    tags = [insight.tags]
            
            response.append(InsightResponse(
                id=insight.id,
                dataset_id=insight.dataset_id,
                user_id=insight.user_id,
                insight_type=insight.insight_type,
                title=insight.title,
                content=content,
                confidence_score=insight.confidence_score,
                priority=insight.priority,
                tags=tags,
                created_at=insight.created_at
            ))
        except Exception as e:
            logger.error(f"Error parsing insight {insight.id}: {e}")
            continue
    
    logger.info(f"Returning {len(response)} insights for dataset {dataset_id}")
    return response

@router.get("/{insight_id}", response_model=InsightResponse)
async def get_insight_by_id(
    insight_id: int,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific insight by ID"""
    logger.info(f"Fetching insight {insight_id}")
    
    # Check if user is authenticated
    if not current_user:
        logger.error("User not authenticated")
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    insight = db.query(Insight).filter(
        Insight.id == insight_id,
        Insight.user_id == current_user.id
    ).first()
    
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")
    
    # Safely parse content
    content = {}
    if insight.content:
        try:
            content = json.loads(insight.content)
        except json.JSONDecodeError:
            content = {"raw": insight.content}
    
    # Safely parse tags
    tags = None
    if insight.tags:
        try:
            tags = json.loads(insight.tags)
        except json.JSONDecodeError:
            tags = [insight.tags]
    
    return InsightResponse(
        id=insight.id,
        dataset_id=insight.dataset_id,
        user_id=insight.user_id,
        insight_type=insight.insight_type,
        title=insight.title,
        content=content,
        confidence_score=insight.confidence_score,
        priority=insight.priority,
        tags=tags,
        created_at=insight.created_at
    )

@router.delete("/{insight_id}")
async def delete_insight(
    insight_id: int,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an insight"""
    # Check if user is authenticated
    if not current_user:
        logger.error("User not authenticated")
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    insight = db.query(Insight).filter(
        Insight.id == insight_id,
        Insight.user_id == current_user.id
    ).first()
    
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")
    
    db.delete(insight)
    db.commit()
    
    return {"message": "Insight deleted successfully"}