import pickle
import json
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (
    mean_squared_error, mean_absolute_error, r2_score,
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report
)
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.tree import DecisionTreeRegressor, DecisionTreeClassifier
from sklearn.svm import SVR, SVC
from sklearn.cluster import KMeans
import logging
import os
import math

logger = logging.getLogger(__name__)

def safe_float_conversion(value):
    """Convert numpy float values to Python float, handling NaN and inf"""
    if value is None:
        return None
    if pd.isna(value):
        return None
    if isinstance(value, (np.float16, np.float32, np.float64, float)):
        if math.isinf(value) or math.isnan(value):
            return None
        # Check for extremely large values that might cause JSON issues
        if abs(value) > 1e308:
            return None
        return float(value)
    if isinstance(value, (np.int16, np.int32, np.int64, int)):
        # Check for integer overflow
        if abs(value) > 2**63 - 1:
            return None
        return int(value)
    return value

class ModelManager:
    def __init__(self, model_type: str = 'regression'):
        self.model_type = model_type
        self.model = None
        self.model_info = {}
        self.scaler = None
        self.feature_importance = {}
        
    def train_model(self, X: pd.DataFrame, y: pd.Series, algorithm: str = 'random_forest', **kwargs) -> Dict[str, Any]:
        """Train a machine learning model"""
        try:
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=kwargs.get('test_size', 0.2), random_state=kwargs.get('random_state', 42)
            )
            
            # Initialize model based on algorithm
            self.model = self._get_model(algorithm, kwargs)
            
            # Train model
            self.model.fit(X_train, y_train)
            
            # Make predictions
            y_pred = self.model.predict(X_test)
            
            # Calculate metrics
            metrics = self._calculate_metrics(y_test, y_pred)
            
            # Get feature importance if available
            if hasattr(self.model, 'feature_importances_'):
                self.feature_importance = {
                    'features': [str(f) for f in X.columns.tolist()],
                    'importance': [safe_float_conversion(i) for i in self.model.feature_importances_.tolist()]
                }
            
            # Cross-validation scores
            cv_scores = cross_val_score(self.model, X, y, cv=5, scoring=self._get_scoring_metric())
            
            # Store model info
            self.model_info = {
                'algorithm': algorithm,
                'model_type': self.model_type,
                'training_samples': len(X_train),
                'testing_samples': len(X_test),
                'features_used': [str(f) for f in X.columns.tolist()],
                'hyperparameters': self._get_model_params(),
                'cross_validation_scores': [safe_float_conversion(s) for s in cv_scores.tolist()],
                'cross_validation_mean': safe_float_conversion(cv_scores.mean()),
                'cross_validation_std': safe_float_conversion(cv_scores.std()),
                'metrics': {k: safe_float_conversion(v) for k, v in metrics.items()},
                'feature_importance': self.feature_importance
            }
            
            return self.model_info
            
        except Exception as e:
            logger.error(f"Model training error: {e}")
            raise
    
    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """Make predictions using trained model"""
        if self.model is None:
            raise ValueError("Model not trained. Call train_model first.")
        
        return self.model.predict(X)
    
    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        """Get prediction probabilities (for classification)"""
        if self.model is None:
            raise ValueError("Model not trained. Call train_model first.")
        
        if hasattr(self.model, 'predict_proba'):
            return self.model.predict_proba(X)
        else:
            raise ValueError("Model does not support probability predictions")
    
    def save_model(self, filepath: str):
        """Save trained model to file"""
        if self.model is None:
            raise ValueError("No model to save")
        
        model_data = {
            'model': self.model,
            'model_info': self.model_info,
            'feature_importance': self.feature_importance,
            'model_type': self.model_type
        }
        
        with open(filepath, 'wb') as f:
            pickle.dump(model_data, f)
        
        logger.info(f"Model saved to {filepath}")
    
    def load_model(self, filepath: str):
        """Load model from file"""
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Model file not found: {filepath}")
        
        with open(filepath, 'rb') as f:
            model_data = pickle.load(f)
        
        self.model = model_data['model']
        self.model_info = model_data.get('model_info', {})
        self.feature_importance = model_data.get('feature_importance', {})
        self.model_type = model_data.get('model_type', 'regression')
        
        logger.info(f"Model loaded from {filepath}")
    
    def get_model_summary(self) -> Dict[str, Any]:
        """Get comprehensive model summary"""
        if not self.model_info:
            return {"error": "Model not trained"}
        
        summary = {
            'model': {
                'algorithm': self.model_info.get('algorithm'),
                'type': self.model_info.get('model_type'),
                'hyperparameters': self.model_info.get('hyperparameters', {})
            },
            'performance': {
                'metrics': self.model_info.get('metrics', {}),
                'cross_validation': {
                    'mean_score': self.model_info.get('cross_validation_mean'),
                    'std_score': self.model_info.get('cross_validation_std'),
                    'scores': self.model_info.get('cross_validation_scores', [])
                }
            },
            'data_info': {
                'training_samples': self.model_info.get('training_samples'),
                'testing_samples': self.model_info.get('testing_samples'),
                'features_used': self.model_info.get('features_used', [])
            }
        }
        
        if self.feature_importance:
            summary['feature_importance'] = self.feature_importance
        
        return summary
    
    def _get_model(self, algorithm: str, params: Dict[str, Any]):
        """Get model instance based on algorithm"""
        # Extract random_state only for models that support it
        random_state = params.get('random_state', 42)
        n_jobs = params.get('n_jobs', -1)
        
        if self.model_type == 'regression':
            models = {
                'linear_regression': LinearRegression(),  # LinearRegression doesn't accept random_state
                'random_forest': RandomForestRegressor(
                    n_estimators=params.get('n_estimators', 100),
                    max_depth=params.get('max_depth', None),
                    random_state=random_state,
                    n_jobs=n_jobs
                ),
                'decision_tree': DecisionTreeRegressor(
                    max_depth=params.get('max_depth', None),
                    random_state=random_state
                ),
                'svm': SVR(
                    kernel=params.get('kernel', 'rbf'),
                    C=params.get('C', 1.0)
                )
            }
        else:  # classification
            models = {
                'logistic_regression': LogisticRegression(
                    max_iter=params.get('max_iter', 1000),
                    random_state=random_state,
                    n_jobs=n_jobs
                ),
                'random_forest': RandomForestClassifier(
                    n_estimators=params.get('n_estimators', 100),
                    max_depth=params.get('max_depth', None),
                    random_state=random_state,
                    n_jobs=n_jobs
                ),
                'decision_tree': DecisionTreeClassifier(
                    max_depth=params.get('max_depth', None),
                    random_state=random_state
                ),
                'svm': SVC(
                    kernel=params.get('kernel', 'rbf'),
                    C=params.get('C', 1.0),
                    probability=True,
                    random_state=random_state
                )
            }
        
        if algorithm not in models:
            raise ValueError(f"Unsupported algorithm: {algorithm}")
        
        return models[algorithm]
    
    def _calculate_metrics(self, y_true: pd.Series, y_pred: np.ndarray) -> Dict[str, Any]:
        """Calculate appropriate metrics based on model type"""
        if self.model_type == 'regression':
            return {
                'mean_squared_error': float(mean_squared_error(y_true, y_pred)),
                'root_mean_squared_error': float(np.sqrt(mean_squared_error(y_true, y_pred))),
                'mean_absolute_error': float(mean_absolute_error(y_true, y_pred)),
                'r2_score': float(r2_score(y_true, y_pred)),
                'explained_variance': float(np.var(y_pred) / np.var(y_true)) if np.var(y_true) > 0 else 0,
                'mean_absolute_percentage_error': float(np.mean(np.abs((y_true - y_pred) / y_true)) * 100) if np.all(y_true != 0) else None
            }
        else:  # classification
            # Convert predictions to class labels if needed
            if len(y_pred.shape) > 1:
                y_pred = np.argmax(y_pred, axis=1)
            
            return {
                'accuracy': float(accuracy_score(y_true, y_pred)),
                'precision': float(precision_score(y_true, y_pred, average='weighted', zero_division=0)),
                'recall': float(recall_score(y_true, y_pred, average='weighted', zero_division=0)),
                'f1_score': float(f1_score(y_true, y_pred, average='weighted', zero_division=0)),
                'confusion_matrix': confusion_matrix(y_true, y_pred).tolist(),
                'classification_report': classification_report(y_true, y_pred, output_dict=True, zero_division=0)
            }
    
    def _get_scoring_metric(self) -> str:
        """Get appropriate scoring metric for cross-validation"""
        if self.model_type == 'regression':
            return 'r2'
        else:
            return 'accuracy'
    
    def _get_model_params(self) -> Dict[str, Any]:
        """Get model parameters"""
        if self.model is None:
            return {}
        
        params = self.model.get_params()
        # Convert numpy types to Python types for JSON serialization
        for key, value in params.items():
            if isinstance(value, np.integer):
                params[key] = int(value)
            elif isinstance(value, np.floating):
                params[key] = float(value)
            elif isinstance(value, np.ndarray):
                params[key] = value.tolist()
        
        return params
    
    def cluster_data(self, X: pd.DataFrame, n_clusters: int = 3, algorithm: str = 'kmeans') -> Dict[str, Any]:
        """Perform clustering on data"""
        try:
            if algorithm == 'kmeans':
                clusterer = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            else:
                raise ValueError(f"Unsupported clustering algorithm: {algorithm}")
            
            # Fit clusters
            clusters = clusterer.fit_predict(X)
            
            # Calculate cluster metrics
            from sklearn.metrics import silhouette_score, davies_bouldin_score
            
            try:
                silhouette = silhouette_score(X, clusters)
                db_index = davies_bouldin_score(X, clusters)
            except:
                silhouette = None
                db_index = None
            
            # Get cluster statistics
            cluster_stats = {}
            X_with_clusters = X.copy()
            X_with_clusters['cluster'] = clusters
            
            for cluster_num in range(n_clusters):
                cluster_data = X_with_clusters[X_with_clusters['cluster'] == cluster_num]
                cluster_stats[f'cluster_{cluster_num}'] = {
                    'size': len(cluster_data),
                    'percentage': (len(cluster_data) / len(X)) * 100,
                    'centroid': [safe_float_conversion(c) for c in clusterer.cluster_centers_[cluster_num].tolist()] if hasattr(clusterer, 'cluster_centers_') else None
                }
            
            return {
                'algorithm': algorithm,
                'n_clusters': n_clusters,
                'cluster_labels': clusters.tolist(),
                'inertia': float(clusterer.inertia_) if hasattr(clusterer, 'inertia_') else None,
                'silhouette_score': float(silhouette) if silhouette else None,
                'davies_bouldin_index': float(db_index) if db_index else None,
                'cluster_statistics': cluster_stats,
                'cluster_centers': [safe_float_conversion(c) for c in clusterer.cluster_centers_.tolist()] if hasattr(clusterer, 'cluster_centers_') else None
            }
            
        except Exception as e:
            logger.error(f"Clustering error: {e}")
            raise