import pickle
import json
import numpy as np
from typing import Dict, Any, Optional, List
from datetime import datetime
from pydantic import BaseModel

class MLModelMetadata(BaseModel):
    """Metadata for a trained ML model"""
    model_id: str
    model_type: str  # regression, classification, clustering
    algorithm: str  # random_forest, linear_regression, etc.
    target_column: str
    features_used: List[str]
    training_samples: int
    validation_samples: int
    accuracy_score: Optional[float] = None
    r2_score: Optional[float] = None
    mse_score: Optional[float] = None
    created_at: datetime
    hyperparameters: Dict[str, Any]
    feature_importance: Optional[Dict[str, float]] = None
    model_size_bytes: int
    
    class Config:
        arbitrary_types_allowed = True

class TrainedModel:
    """Wrapper for a trained ML model with metadata"""
    
    def __init__(self, model_object: Any, metadata: MLModelMetadata):
        self.model = model_object
        self.metadata = metadata
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Make predictions using the model"""
        return self.model.predict(X)
    
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Get prediction probabilities (for classification)"""
        if hasattr(self.model, 'predict_proba'):
            return self.model.predict_proba(X)
        raise AttributeError("Model does not support probability predictions")
    
    def save(self, filepath: str):
        """Save model and metadata to file"""
        model_data = {
            'model': self.model,
            'metadata': self.metadata.dict()
        }
        
        with open(filepath, 'wb') as f:
            pickle.dump(model_data, f)
    
    @classmethod
    def load(cls, filepath: str) -> 'TrainedModel':
        """Load model and metadata from file"""
        with open(filepath, 'rb') as f:
            model_data = pickle.load(f)
        
        metadata = MLModelMetadata(**model_data['metadata'])
        return cls(model_data['model'], metadata)
    
    def get_summary(self) -> Dict[str, Any]:
        """Get model summary"""
        return {
            'metadata': self.metadata.dict(),
            'capabilities': {
                'can_predict': True,
                'can_predict_proba': hasattr(self.model, 'predict_proba'),
                'feature_names': self.metadata.features_used
            }
        }