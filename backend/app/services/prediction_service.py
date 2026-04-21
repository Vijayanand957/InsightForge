import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
import logging
from datetime import datetime, timedelta
import time
import math

from app.core.data_processor import DataProcessor, clean_dict_for_json
from app.core.model_manager import ModelManager
from app.core.gemini_client import GeminiClient

logger = logging.getLogger(__name__)

class PredictionService:
    def __init__(self, df: pd.DataFrame):
        self.df = df.copy()
        self.processor = DataProcessor(df)
        self.model_manager = None
        self.gemini_client = GeminiClient()
        
    def predict(self, target_column: str, features: List[str] = None, 
                model_type: str = 'regression', future_periods: int = 5) -> Dict[str, Any]:
        """Make predictions using machine learning models"""
        start_time = time.time()
        
        try:
            # Validate inputs
            if target_column not in self.df.columns:
                raise ValueError(f"Target column '{target_column}' not found in dataset")
            
            # Use all columns as features if not specified
            if not features:
                features = [col for col in self.df.columns if col != target_column]
            else:
                # Validate feature columns
                missing_features = [f for f in features if f not in self.df.columns]
                if missing_features:
                    raise ValueError(f"Feature columns not found: {missing_features}")
            
            # For large datasets, sample to speed up training
            df_sample = self.df
            if len(self.df) > 3000:
                df_sample = self.df.sample(n=min(3000, len(self.df)), random_state=42)
                logger.info(f"Sampled dataset from {len(self.df)} to {len(df_sample)} rows for faster training")
            
            # Prepare data for ML
            temp_processor = DataProcessor(df_sample)
            X, y, feature_report = temp_processor.prepare_for_ml(target_column)
            
            if X.shape[0] < 10:
                raise ValueError(f"Dataset too small for predictions. Need at least 10 samples, got {X.shape[0]}")
            
            # Initialize model manager
            self.model_manager = ModelManager(model_type=model_type)
            
            # Choose algorithm based on data size
            if X.shape[0] < 50:
                algorithm = 'linear_regression'
                logger.info(f"Using linear_regression for small dataset ({X.shape[0]} samples)")
            elif X.shape[0] < 500:
                algorithm = 'random_forest'
                logger.info(f"Using random_forest for medium dataset ({X.shape[0]} samples)")
            else:
                algorithm = 'linear_regression'
                logger.info(f"Using linear_regression for large dataset ({X.shape[0]} samples) for speed")
            
            # Adjust hyperparameters based on dataset size
            n_estimators = min(50, X.shape[0] // 10) if algorithm == 'random_forest' else 100
            n_estimators = max(10, n_estimators)
            max_depth = 10 if algorithm == 'random_forest' else None
            
            # Train model
            model_info = self.model_manager.train_model(
                X, y, 
                algorithm=algorithm,
                n_estimators=n_estimators,
                max_depth=max_depth,
                random_state=42,
                test_size=0.2,
                cv_folds=3
            )
            
            # Make predictions on the sampled dataset
            predictions = self.model_manager.predict(X)
            
            # Generate future predictions based on trend
            future_predictions = self._generate_future_predictions(
                X, target_column, features, min(future_periods, 10)
            )
            
            # Generate insights using Gemini
            try:
                ai_insights = self._generate_prediction_insights(
                    model_info, predictions, y if y is not None else None
                )
            except Exception as e:
                logger.warning(f"AI insight generation failed: {e}")
                ai_insights = {
                    "key_findings": ["AI insights temporarily unavailable"],
                    "summary": "Prediction results are available. AI explanation is currently unavailable."
                }
            
            elapsed_time = time.time() - start_time
            logger.info(f"Prediction completed in {elapsed_time:.2f} seconds")
            
            return clean_dict_for_json({
                "model_performance": model_info.get("metrics", {}),
                "feature_importance": model_info.get("feature_importance", {}),
                "predictions": {
                    "historical": predictions.tolist() if hasattr(predictions, 'tolist') else list(predictions),
                    "future": future_predictions
                },
                "model_details": {
                    "algorithm": algorithm,
                    "type": model_type,
                    "target_column": target_column,
                    "features_used": features[:10],
                    "total_features": len(features),
                    "training_samples": len(X),
                    "cross_validation_score": model_info.get("cross_validation_mean", 0),
                    "training_time_seconds": round(elapsed_time, 2)
                },
                "data_preparation": feature_report,
                "ai_insights": ai_insights,
                "recommendations": self._generate_recommendations(model_info, predictions)
            })
            
        except Exception as e:
            logger.error(f"Prediction error: {e}")
            elapsed_time = time.time() - start_time
            logger.error(f"Prediction failed after {elapsed_time:.2f} seconds")
            raise
    
    def forecast_time_series(self, time_column: str, value_column: str, 
                           periods: int = 10, frequency: str = 'D') -> Dict[str, Any]:
        """Forecast time series data"""
        start_time = time.time()
        
        try:
            # Ensure time column is datetime
            df_copy = self.df.copy()
            df_copy[time_column] = pd.to_datetime(df_copy[time_column], errors='coerce')
            
            # Sort by time
            df_clean = df_copy.dropna(subset=[time_column, value_column])
            df_clean = df_clean.sort_values(time_column)
            
            if len(df_clean) < 2:
                raise ValueError("Insufficient time series data for forecasting")
            
            # Prepare time series
            df_clean.set_index(time_column, inplace=True)
            series = df_clean[value_column]
            
            # Handle missing dates
            series = series.asfreq(frequency, method='pad')
            
            # For long series, use last 1000 points for speed
            if len(series) > 1000:
                series = series.iloc[-1000:]
                logger.info(f"Using last 1000 points for forecasting (original length: {len(series)})")
            
            # Simple forecasting methods
            # 1. Moving Average
            window = min(7, len(series) // 4)
            ma_forecast = series.rolling(window=window).mean().iloc[-1]
            
            # 2. Exponential Smoothing
            alpha = 0.3
            exp_smooth = series.ewm(alpha=alpha).mean()
            es_forecast = exp_smooth.iloc[-1]
            
            # 3. Linear Regression for trend
            X = np.arange(len(series)).reshape(-1, 1)
            y = series.values
            
            from sklearn.linear_model import LinearRegression
            lr_model = LinearRegression()
            lr_model.fit(X, y)
            
            # Generate future predictions
            future_X = np.arange(len(series), len(series) + periods).reshape(-1, 1)
            lr_predictions = lr_model.predict(future_X)
            
            # Calculate confidence intervals
            residuals = y - lr_model.predict(X)
            std_residuals = np.std(residuals)
            confidence_intervals = [
                [float(pred - 1.96 * std_residuals), float(pred + 1.96 * std_residuals)]
                for pred in lr_predictions
            ]
            
            # Generate future dates
            last_date = series.index[-1]
            if frequency == 'D':
                delta = timedelta(days=1)
            elif frequency == 'W':
                delta = timedelta(weeks=1)
            elif frequency == 'M':
                delta = timedelta(days=30)
            else:
                delta = timedelta(days=1)
            
            future_dates = [last_date + (i + 1) * delta for i in range(periods)]
            
            elapsed_time = time.time() - start_time
            logger.info(f"Time series forecast completed in {elapsed_time:.2f} seconds")
            
            return clean_dict_for_json({
                "time_column": time_column,
                "value_column": value_column,
                "frequency": frequency,
                "historical_data": {
                    "dates": series.index.strftime('%Y-%m-%d').tolist(),
                    "values": series.tolist()
                },
                "forecast": {
                    "dates": [d.strftime('%Y-%m-%d') for d in future_dates],
                    "values": lr_predictions.tolist(),
                    "confidence_intervals": confidence_intervals,
                    "moving_average_forecast": float(ma_forecast) if not pd.isna(ma_forecast) else None,
                    "exponential_smoothing_forecast": float(es_forecast) if not pd.isna(es_forecast) else None
                },
                "trend_analysis": {
                    "slope": float(lr_model.coef_[0]),
                    "intercept": float(lr_model.intercept_),
                    "r_squared": float(lr_model.score(X, y))
                },
                "accuracy_metrics": {
                    "mae": float(np.mean(np.abs(residuals))),
                    "rmse": float(np.sqrt(np.mean(residuals ** 2))),
                    "mape": float(np.mean(np.abs(residuals / (y + 1e-10))) * 100) if np.any(y != 0) else None
                },
                "processing_time_seconds": round(elapsed_time, 2)
            })
            
        except Exception as e:
            logger.error(f"Time series forecast error: {e}")
            raise
    
    def classify_data(self, target_column: str, features: List[str] = None) -> Dict[str, Any]:
        """Perform classification on data"""
        start_time = time.time()
        
        try:
            if features is None:
                features = [col for col in self.df.columns if col != target_column]
            
            # For large datasets, sample to speed up training
            df_sample = self.df
            if len(self.df) > 3000:
                df_sample = self.df.sample(n=min(3000, len(self.df)), random_state=42)
                logger.info(f"Sampled dataset from {len(self.df)} to {len(df_sample)} rows for faster classification")
            
            # Prepare data
            temp_processor = DataProcessor(df_sample)
            X, y, feature_report = temp_processor.prepare_for_ml(target_column)
            
            # Check if target is categorical
            if y is not None and y.nunique() > 10:
                logger.warning(f"Target column has {y.nunique()} unique values. Consider regression instead.")
            
            # Train classification model
            self.model_manager = ModelManager(model_type='classification')
            
            # Adjust hyperparameters based on dataset size
            n_estimators = min(50, X.shape[0] // 10)
            n_estimators = max(10, n_estimators)
            
            model_info = self.model_manager.train_model(
                X, y,
                algorithm='random_forest',
                n_estimators=n_estimators,
                max_depth=10,
                random_state=42,
                test_size=0.2,
                cv_folds=3
            )
            
            # Get predictions
            y_pred = self.model_manager.predict(X)
            y_proba = self.model_manager.predict_proba(X) if hasattr(self.model_manager.model, 'predict_proba') else None
            
            # Generate classification report
            from sklearn.metrics import classification_report
            report = classification_report(y, y_pred, output_dict=True, zero_division=0)
            
            # Get confusion matrix
            from sklearn.metrics import confusion_matrix
            cm = confusion_matrix(y, y_pred)
            
            # Get class distribution
            class_distribution = y.value_counts().to_dict()
            
            elapsed_time = time.time() - start_time
            logger.info(f"Classification completed in {elapsed_time:.2f} seconds")
            
            return clean_dict_for_json({
                "model_performance": model_info.get("metrics", {}),
                "classification_report": report,
                "confusion_matrix": cm.tolist(),
                "predictions": {
                    "actual": y.tolist() if hasattr(y, 'tolist') else list(y),
                    "predicted": y_pred.tolist() if hasattr(y_pred, 'tolist') else list(y_pred),
                    "probabilities": y_proba.tolist() if y_proba is not None and hasattr(y_proba, 'tolist') else None
                },
                "class_distribution": class_distribution,
                "feature_importance": model_info.get("feature_importance", {}),
                "model_details": {
                    "algorithm": "random_forest_classifier",
                    "target_column": target_column,
                    "classes": list(class_distribution.keys()),
                    "training_samples": len(X),
                    "processing_time_seconds": round(elapsed_time, 2)
                }
            })
            
        except Exception as e:
            logger.error(f"Classification error: {e}")
            raise
    
    def _generate_future_predictions(self, X: pd.DataFrame, target_column: str, 
                                   features: List[str], periods: int) -> List[Dict[str, Any]]:
        """Generate future predictions based on trend"""
        future_predictions = []
        
        try:
            if len(X) > 1:
                # Use first feature for trend
                first_feature = X.columns[0] if len(X.columns) > 0 else None
                
                if first_feature:
                    values = X[first_feature].values
                    x = np.arange(len(values))
                    
                    from sklearn.linear_model import LinearRegression
                    lr = LinearRegression()
                    lr.fit(x.reshape(-1, 1), values)
                    
                    for i in range(periods):
                        future_x = len(values) + i
                        pred_value = lr.predict([[future_x]])[0]
                        
                        # Calculate confidence based on prediction variance
                        pred_std = np.std(values) * 0.1  # Simple confidence calculation
                        
                        future_predictions.append({
                            "period": i + 1,
                            "estimated_value": float(pred_value),
                            "confidence_interval": [
                                float(pred_value - 1.96 * pred_std),
                                float(pred_value + 1.96 * pred_std)
                            ]
                        })
        except Exception as e:
            logger.warning(f"Future prediction generation failed: {e}")
            # Don't return placeholders - raise the error
            raise ValueError(f"Could not generate future predictions: {e}")
        
        return future_predictions
    
    def _generate_prediction_insights(self, model_info: Dict[str, Any], 
                                    predictions: np.ndarray, 
                                    actuals: Optional[pd.Series] = None) -> Dict[str, Any]:
        """Generate insights from predictions"""
        try:
            metrics = model_info.get("metrics", {})
            
            insights = {
                "key_findings": [],
                "summary": "Prediction analysis completed successfully."
            }
            
            # Add performance insights
            if 'r2_score' in metrics:
                r2 = metrics['r2_score']
                if r2 > 0.8:
                    insights["key_findings"].append(f"Excellent model fit (R² = {r2:.3f})")
                elif r2 > 0.6:
                    insights["key_findings"].append(f"Good model fit (R² = {r2:.3f})")
                elif r2 > 0.4:
                    insights["key_findings"].append(f"Moderate model fit (R² = {r2:.3f})")
                else:
                    insights["key_findings"].append(f"Weak model fit (R² = {r2:.3f})")
            
            if 'mean_absolute_error' in metrics:
                mae = metrics['mean_absolute_error']
                insights["key_findings"].append(f"Average prediction error: ±{mae:.2f}")
            
            if 'accuracy' in metrics:
                acc = metrics['accuracy']
                insights["key_findings"].append(f"Model accuracy: {acc:.1%}")
            
            # Prediction statistics
            if len(predictions) > 0:
                pred_mean = float(np.mean(predictions))
                pred_std = float(np.std(predictions))
                insights["key_findings"].append(f"Predictions range from {float(np.min(predictions)):.2f} to {float(np.max(predictions)):.2f}")
                
                if pred_std > 0 and pred_mean != 0:
                    cv = pred_std / pred_mean
                    if cv > 0.5:
                        insights["key_findings"].append("High variability in predictions detected")
            
            return insights
            
        except Exception as e:
            logger.warning(f"Insight generation error: {e}")
            raise ValueError(f"Could not generate prediction insights: {e}")
    
    def _generate_recommendations(self, model_info: Dict[str, Any], 
                                predictions: np.ndarray) -> List[str]:
        """Generate recommendations based on prediction results"""
        recommendations = []
        
        # Check model performance
        metrics = model_info.get("metrics", {})
        
        if 'r2_score' in metrics:
            r2 = metrics['r2_score']
            if r2 > 0.8:
                recommendations.append("Model shows high accuracy. Consider deploying for production use.")
            elif r2 > 0.6:
                recommendations.append("Model performance is acceptable. Could be improved with more data.")
            elif r2 > 0.4:
                recommendations.append("Model performance is moderate. Consider feature engineering.")
            else:
                recommendations.append("Model needs improvement. Try different algorithms or collect more data.")
        
        if 'mean_absolute_error' in metrics:
            mae = metrics['mean_absolute_error']
            pred_mean = float(np.mean(predictions)) if len(predictions) > 0 else 0
            if pred_mean > 0:
                error_pct = (mae / pred_mean) * 100
                if error_pct > 30:
                    recommendations.append(f"High relative error ({error_pct:.1f}%). Consider reviewing input features.")
        
        if 'accuracy' in metrics:
            acc = metrics['accuracy']
            if acc < 0.7:
                recommendations.append("Consider collecting more training data to improve accuracy.")
        
        # Feature importance recommendations
        feature_importance = model_info.get("feature_importance", {})
        if feature_importance and "importance" in feature_importance:
            top_features = sorted(
                zip(feature_importance["features"], feature_importance["importance"]),
                key=lambda x: x[1],
                reverse=True
            )[:3]
            if top_features:
                features_str = ", ".join([f[0] for f in top_features])
                recommendations.append(f"Key predictive features: {features_str}")
        
        # If no recommendations, provide default
        if not recommendations:
            recommendations.append("Model training completed. Review results for insights.")
        
        return recommendations