import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import json
import logging
from scipy import stats

logger = logging.getLogger(__name__)

class AnalyticsService:
    def __init__(self, data_processor):
        self.processor = data_processor
        self.df = data_processor.df
        
    def descriptive_statistics(self, columns: List[str] = None) -> Dict[str, Any]:
        """Generate descriptive statistics for specified columns"""
        try:
            if columns:
                # Filter to specified columns
                valid_columns = [col for col in columns if col in self.df.columns]
                if not valid_columns:
                    valid_columns = self.df.columns.tolist()
                df_subset = self.df[valid_columns]
            else:
                df_subset = self.df
                valid_columns = self.df.columns.tolist()
            
            # Get basic statistics
            numeric_cols = df_subset.select_dtypes(include=[np.number]).columns
            categorical_cols = df_subset.select_dtypes(include=['object']).columns
            
            stats_result = {
                "columns_analyzed": valid_columns,
                "total_rows": len(df_subset),
                "numeric_columns": {},
                "categorical_columns": {},
                "correlation_matrix": {},
                "distribution_info": {}
            }
            
            # Numeric column statistics
            for col in numeric_cols:
                col_stats = {
                    "count": int(df_subset[col].count()),
                    "mean": float(df_subset[col].mean()),
                    "std": float(df_subset[col].std()),
                    "min": float(df_subset[col].min()),
                    "25_percentile": float(df_subset[col].quantile(0.25)),
                    "median": float(df_subset[col].median()),
                    "75_percentile": float(df_subset[col].quantile(0.75)),
                    "max": float(df_subset[col].max()),
                    "range": float(df_subset[col].max() - df_subset[col].min()),
                    "variance": float(df_subset[col].var()),
                    "skewness": float(df_subset[col].skew()),
                    "kurtosis": float(df_subset[col].kurtosis()),
                    "missing_values": int(df_subset[col].isnull().sum()),
                    "missing_percentage": float((df_subset[col].isnull().sum() / len(df_subset)) * 100),
                    "zeros_count": int((df_subset[col] == 0).sum()),
                    "outliers_iqr": self._detect_outliers_iqr(df_subset[col])
                }
                
                # Add histogram data for distribution
                hist, bins = np.histogram(df_subset[col].dropna(), bins='auto')
                col_stats["histogram"] = {
                    "counts": hist.tolist(),
                    "bin_edges": bins.tolist()
                }
                
                stats_result["numeric_columns"][col] = col_stats
            
            # Categorical column statistics
            for col in categorical_cols:
                value_counts = df_subset[col].value_counts()
                top_values = value_counts.head(10)
                
                col_stats = {
                    "unique_values": int(df_subset[col].nunique()),
                    "missing_values": int(df_subset[col].isnull().sum()),
                    "missing_percentage": float((df_subset[col].isnull().sum() / len(df_subset)) * 100),
                    "top_categories": top_values.to_dict(),
                    "entropy": float(self._calculate_entropy(value_counts)),
                    "most_common": value_counts.index[0] if not value_counts.empty else None,
                    "most_common_percentage": float((value_counts.iloc[0] / len(df_subset)) * 100) if not value_counts.empty else 0
                }
                
                stats_result["categorical_columns"][col] = col_stats
            
            # Correlation matrix for numeric columns
            if len(numeric_cols) > 1:
                correlation_matrix = df_subset[numeric_cols].corr()
                stats_result["correlation_matrix"] = correlation_matrix.to_dict()
                
                # Find strong correlations
                strong_correlations = self._find_strong_correlations(correlation_matrix)
                stats_result["strong_correlations"] = strong_correlations
            
            return stats_result
            
        except Exception as e:
            logger.error(f"Descriptive statistics error: {e}")
            raise
    
    def correlation_analysis(self, columns: List[str], method: str = 'pearson') -> Dict[str, Any]:
        """Perform correlation analysis on specified columns"""
        try:
            # Filter to numeric columns only
            numeric_cols = [col for col in columns if col in self.df.columns and 
                           pd.api.types.is_numeric_dtype(self.df[col])]
            
            if len(numeric_cols) < 2:
                return {
                    "error": "Need at least 2 numeric columns for correlation analysis",
                    "available_numeric_columns": self.df.select_dtypes(include=[np.number]).columns.tolist()
                }
            
            df_subset = self.df[numeric_cols].dropna()
            
            # Calculate correlation matrix
            if method == 'pearson':
                corr_matrix = df_subset.corr(method='pearson')
            elif method == 'spearman':
                corr_matrix = df_subset.corr(method='spearman')
            elif method == 'kendall':
                corr_matrix = df_subset.corr(method='kendall')
            else:
                raise ValueError(f"Unsupported correlation method: {method}")
            
            # Find significant correlations
            significant_correlations = []
            p_values = {}
            
            if method == 'pearson':
                for i, col1 in enumerate(numeric_cols):
                    for j, col2 in enumerate(numeric_cols[i+1:], i+1):
                        # Remove NaN pairs
                        valid_data = df_subset[[col1, col2]].dropna()
                        if len(valid_data) > 2:
                            corr, p_value = stats.pearsonr(valid_data[col1], valid_data[col2])
                            p_values[f"{col1}_{col2}"] = float(p_value)
                            
                            if abs(corr) > 0.5 and p_value < 0.05:  # Strong and significant
                                significant_correlations.append({
                                    "variables": [col1, col2],
                                    "correlation": float(corr),
                                    "p_value": float(p_value),
                                    "strength": self._get_correlation_strength(corr),
                                    "direction": "positive" if corr > 0 else "negative",
                                    "sample_size": len(valid_data)
                                })
            
            return {
                "method": method,
                "columns_analyzed": numeric_cols,
                "correlation_matrix": corr_matrix.to_dict(),
                "significant_correlations": significant_correlations,
                "p_values": p_values,
                "summary": {
                    "total_pairs": len(numeric_cols) * (len(numeric_cols) - 1) // 2,
                    "strong_correlations": len([c for c in significant_correlations if abs(c["correlation"]) > 0.7]),
                    "moderate_correlations": len([c for c in significant_correlations if 0.5 <= abs(c["correlation"]) <= 0.7]),
                    "weak_correlations": len([c for c in significant_correlations if abs(c["correlation"]) < 0.5])
                }
            }
            
        except Exception as e:
            logger.error(f"Correlation analysis error: {e}")
            raise
    
    def trend_analysis(self, time_column: str, value_column: str, period: str = 'daily') -> Dict[str, Any]:
        """Perform trend analysis on time series data"""
        try:
            if time_column not in self.df.columns or value_column not in self.df.columns:
                raise ValueError(f"Columns not found: {time_column} or {value_column}")
            
            # Ensure time column is datetime
            df_copy = self.df.copy()
            df_copy[time_column] = pd.to_datetime(df_copy[time_column], errors='coerce')
            df_clean = df_copy.dropna(subset=[time_column, value_column])
            
            if df_clean.empty:
                return {"error": "No valid time-value pairs found after cleaning"}
            
            # Sort by time
            df_clean = df_clean.sort_values(time_column)
            
            # Resample based on period
            df_clean.set_index(time_column, inplace=True)
            
            if period == 'daily':
                resampled = df_clean[value_column].resample('D').mean()
            elif period == 'weekly':
                resampled = df_clean[value_column].resample('W').mean()
            elif period == 'monthly':
                resampled = df_clean[value_column].resample('M').mean()
            elif period == 'quarterly':
                resampled = df_clean[value_column].resample('Q').mean()
            elif period == 'yearly':
                resampled = df_clean[value_column].resample('Y').mean()
            else:
                resampled = df_clean[value_column]  # Use original frequency
            
            # Calculate trend metrics
            from scipy import stats
            
            # Linear trend
            x = np.arange(len(resampled))
            y = resampled.values
            valid_mask = ~np.isnan(y)
            
            if np.sum(valid_mask) < 2:
                return {"error": "Insufficient data points for trend analysis"}
            
            slope, intercept, r_value, p_value, std_err = stats.linregress(
                x[valid_mask], y[valid_mask]
            )
            
            # Moving averages
            window = min(7, len(resampled) // 4)  # Adaptive window size
            moving_avg = resampled.rolling(window=window, min_periods=1).mean()
            
            # Seasonality detection (simple)
            if len(resampled) >= 2 * window:
                seasonal = resampled.rolling(window=window, min_periods=1).apply(
                    lambda x: x.iloc[-1] - x.mean() if len(x) == window else np.nan
                )
            else:
                seasonal = pd.Series([np.nan] * len(resampled), index=resampled.index)
            
            # Forecast next period
            if slope is not None and not np.isnan(slope):
                last_idx = x[-1]
                forecast_value = slope * (last_idx + 1) + intercept
                forecast_interval = [
                    forecast_value - 1.96 * std_err,
                    forecast_value + 1.96 * std_err
                ]
            else:
                forecast_value = None
                forecast_interval = None
            
            return {
                "time_column": time_column,
                "value_column": value_column,
                "period": period,
                "time_range": {
                    "start": str(resampled.index[0]),
                    "end": str(resampled.index[-1]),
                    "days": (resampled.index[-1] - resampled.index[0]).days
                },
                "statistics": {
                    "total_points": len(resampled),
                    "mean": float(resampled.mean()),
                    "std": float(resampled.std()),
                    "min": float(resampled.min()),
                    "max": float(resampled.max()),
                    "trend": {
                        "slope": float(slope),
                        "intercept": float(intercept),
                        "r_squared": float(r_value ** 2),
                        "p_value": float(p_value),
                        "trend_direction": "increasing" if slope > 0 else "decreasing" if slope < 0 else "stable",
                        "trend_strength": "strong" if abs(r_value) > 0.7 else "moderate" if abs(r_value) > 0.5 else "weak"
                    }
                },
                "time_series_data": {
                    "timestamps": resampled.index.strftime('%Y-%m-%d').tolist(),
                    "values": resampled.tolist(),
                    "moving_average": moving_avg.tolist(),
                    "seasonal_component": seasonal.tolist()
                },
                "forecast": {
                    "next_period_value": float(forecast_value) if forecast_value else None,
                    "confidence_interval": [float(v) for v in forecast_interval] if forecast_interval else None,
                    "trend_continues": slope > 0 if slope else None
                },
                "recommendations": self._generate_trend_recommendations(slope, r_value, resampled)
            }
            
        except Exception as e:
            logger.error(f"Trend analysis error: {e}")
            raise
    
    def _detect_outliers_iqr(self, series: pd.Series) -> Dict[str, Any]:
        """Detect outliers using IQR method"""
        q1 = series.quantile(0.25)
        q3 = series.quantile(0.75)
        iqr = q3 - q1
        
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        
        outliers = series[(series < lower_bound) | (series > upper_bound)]
        
        return {
            "lower_bound": float(lower_bound),
            "upper_bound": float(upper_bound),
            "outliers_count": int(len(outliers)),
            "outliers_percentage": float((len(outliers) / len(series)) * 100),
            "outlier_values": outliers.tolist() if len(outliers) <= 10 else outliers.head(10).tolist()
        }
    
    def _calculate_entropy(self, value_counts: pd.Series) -> float:
        """Calculate entropy of a categorical distribution"""
        probabilities = value_counts / value_counts.sum()
        entropy = -np.sum(probabilities * np.log2(probabilities + 1e-10))
        return entropy
    
    def _find_strong_correlations(self, corr_matrix: pd.DataFrame, threshold: float = 0.7) -> List[Dict[str, Any]]:
        """Find strong correlations in correlation matrix"""
        strong_corrs = []
        columns = corr_matrix.columns
        
        for i in range(len(columns)):
            for j in range(i+1, len(columns)):
                corr = corr_matrix.iloc[i, j]
                if abs(corr) >= threshold:
                    strong_corrs.append({
                        "variable1": columns[i],
                        "variable2": columns[j],
                        "correlation": float(corr),
                        "strength": self._get_correlation_strength(corr),
                        "direction": "positive" if corr > 0 else "negative"
                    })
        
        # Sort by absolute correlation value
        strong_corrs.sort(key=lambda x: abs(x["correlation"]), reverse=True)
        return strong_corrs
    
    def _get_correlation_strength(self, corr: float) -> str:
        """Get correlation strength description"""
        abs_corr = abs(corr)
        if abs_corr >= 0.8:
            return "very strong"
        elif abs_corr >= 0.6:
            return "strong"
        elif abs_corr >= 0.4:
            return "moderate"
        elif abs_corr >= 0.2:
            return "weak"
        else:
            return "very weak"
    
    def _generate_trend_recommendations(self, slope: float, r_squared: float, series: pd.Series) -> List[str]:
        """Generate recommendations based on trend analysis"""
        recommendations = []
        
        if slope > 0 and r_squared > 0.5:
            recommendations.append("Strong upward trend detected. Consider capitalizing on growth opportunities.")
            recommendations.append("Monitor for sustainability of growth rate.")
        elif slope < 0 and r_squared > 0.5:
            recommendations.append("Strong downward trend detected. Investigate causes and consider corrective actions.")
            recommendations.append("Review underlying factors contributing to decline.")
        elif abs(slope) < 0.01:
            recommendations.append("Trend appears stable. Focus on maintaining current performance.")
        else:
            recommendations.append("Weak or inconsistent trend. Further analysis recommended.")
        
        # Check for volatility
        volatility = series.std() / series.mean() if series.mean() != 0 else 0
        if volatility > 0.3:
            recommendations.append("High volatility detected. Consider risk mitigation strategies.")
        
        return recommendations