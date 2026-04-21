import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
import json
import logging
from datetime import datetime

from app.core.gemini_client import GeminiClient
from app.core.data_processor import clean_dict_for_json

logger = logging.getLogger(__name__)

class InsightService:
    def __init__(self, df: pd.DataFrame, gemini_client: GeminiClient):
        self.df = df.copy()
        self.gemini = gemini_client
        
    async def generate_data_insights(self, focus_areas: List[str] = None, 
                             business_context: str = "") -> Dict[str, Any]:
        """Generate comprehensive data insights using AI"""
        try:
            # Prepare data summary for AI
            data_summary = self._prepare_data_summary()
            
            # Add focus areas to context
            context = f"Focus areas: {', '.join(focus_areas) if focus_areas else 'General analysis'}. "
            context += f"Business context: {business_context}" if business_context else ""
            
            # Generate insights using Gemini AI
            ai_response = await self.gemini.generate_insights(data_summary, context)
            
            # Enhance with statistical insights
            statistical_insights = self._generate_statistical_insights()
            
            # Combine AI and statistical insights
            combined_insights = {
                "generated_at": datetime.utcnow().isoformat(),
                "data_overview": data_summary.get("overview", {}),
                "ai_insights": ai_response.get("insights", {}),
                "statistical_insights": statistical_insights,
                "key_findings": self._extract_key_findings(ai_response, statistical_insights),
                "recommendations": ai_response.get("insights", {}).get("recommendations", []),
                "confidence_metrics": {
                    "data_quality_score": self._calculate_data_quality_score(),
                    "insight_confidence": ai_response.get("insights", {}).get("confidence", 0.7),
                    "sample_size_adequacy": self._check_sample_size_adequacy()
                }
            }
            
            return clean_dict_for_json(combined_insights)
            
        except Exception as e:
            logger.error(f"Data insight generation error: {e}")
            raise
    
    async def generate_recommendations(self, business_goal: str, constraints: List[str] = None) -> Dict[str, Any]:
        """Generate business recommendations based on data using Gemini AI"""
        try:
            # Analyze data for recommendations
            data_analysis = self._analyze_for_recommendations(business_goal)
            
            # Generate recommendations using Gemini
            ai_recommendations = await self.gemini.generate_recommendations(
                data_analysis,
                business_context=business_goal
            )
            
            # Process recommendations
            recommendations = ai_recommendations.get("recommendations", [])
            
            return {
                "title": ai_recommendations.get("title", "AI Recommendations"),
                "description": ai_recommendations.get("description", "Based on your data analysis"),
                "recommendations": recommendations,
                "priority_order": ai_recommendations.get("priority_order", []),
                "summary": ai_recommendations.get("summary", ""),
                "impact": ai_recommendations.get("impact", "medium"),
                "effort": ai_recommendations.get("effort", "medium"),
                "timeframe": ai_recommendations.get("timeframe", "medium_term"),
                "confidence": ai_recommendations.get("confidence", 0.8),
                "priority": ai_recommendations.get("priority", "medium"),
                "business_goal": business_goal,
                "constraints": constraints or []
            }
            
        except Exception as e:
            logger.error(f"Recommendation generation error: {e}")
            raise
    
    def _prepare_data_summary(self) -> Dict[str, Any]:
        """Prepare comprehensive data summary for AI analysis"""
        numeric_cols = self.df.select_dtypes(include=[np.number]).columns
        categorical_cols = self.df.select_dtypes(include=['object']).columns
        
        summary = {
            "overview": {
                "total_rows": len(self.df),
                "total_columns": len(self.df.columns),
                "numeric_columns": len(numeric_cols),
                "categorical_columns": len(categorical_cols),
                "missing_values_total": int(self.df.isnull().sum().sum()),
                "missing_percentage": float((self.df.isnull().sum().sum() / np.prod(self.df.shape)) * 100)
            },
            "numeric_summary": {},
            "categorical_summary": {},
            "key_metrics": self._calculate_key_metrics(),
            "data_distributions": self._get_data_distributions(),
            "time_series_info": self._extract_time_series_info()
        }
        
        # Numeric column summaries
        for col in numeric_cols:
            summary["numeric_summary"][col] = {
                "mean": float(self.df[col].mean()),
                "std": float(self.df[col].std()),
                "min": float(self.df[col].min()),
                "max": float(self.df[col].max()),
                "median": float(self.df[col].median()),
                "skewness": float(self.df[col].skew()),
                "missing": int(self.df[col].isnull().sum())
            }
        
        # Categorical column summaries
        for col in categorical_cols:
            value_counts = self.df[col].value_counts()
            summary["categorical_summary"][col] = {
                "unique_values": int(self.df[col].nunique()),
                "top_values": value_counts.head(5).to_dict(),
                "entropy": float(-np.sum((value_counts / value_counts.sum()) * 
                                      np.log2(value_counts / value_counts.sum() + 1e-10))),
                "missing": int(self.df[col].isnull().sum())
            }
        
        return clean_dict_for_json(summary)
    
    def _generate_statistical_insights(self) -> Dict[str, Any]:
        """Generate statistical insights from data"""
        insights = {
            "distributions": {},
            "outliers": {},
            "trends": {},
            "relationships": {}
        }
        
        # Analyze distributions
        numeric_cols = self.df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            skew = self.df[col].skew()
            kurt = self.df[col].kurtosis()
            
            insights["distributions"][col] = {
                "skewness": float(skew),
                "kurtosis": float(kurt),
                "distribution_type": self._classify_distribution(skew, kurt),
                "normality_test": self._test_normality(self.df[col])
            }
        
        # Detect outliers
        for col in numeric_cols:
            outliers = self._detect_column_outliers(self.df[col])
            if outliers["count"] > 0:
                insights["outliers"][col] = outliers
        
        # Find trends in time series
        time_cols = [col for col in self.df.columns if 'date' in col.lower() or 'time' in col.lower()]
        for time_col in time_cols[:1]:
            numeric_targets = numeric_cols[:3]
            for target in numeric_targets:
                trend = self._analyze_trend(time_col, target)
                if trend:
                    insights["trends"][f"{time_col}_{target}"] = trend
        
        # Find relationships
        if len(numeric_cols) > 1:
            correlations = self.df[numeric_cols].corr()
            strong_corrs = self._find_strong_correlations(correlations)
            insights["relationships"]["correlations"] = strong_corrs
        
        return clean_dict_for_json(insights)
    
    def _calculate_key_metrics(self) -> Dict[str, Any]:
        """Calculate key business metrics from data"""
        metrics = {}
        
        # Identify potential metric columns
        metric_keywords = ['revenue', 'sales', 'profit', 'cost', 'price', 'quantity', 'rate']
        
        for col in self.df.columns:
            col_lower = col.lower()
            for keyword in metric_keywords:
                if keyword in col_lower and self.df[col].dtype in [np.int64, np.float64]:
                    metrics[col] = {
                        "total": float(self.df[col].sum()),
                        "average": float(self.df[col].mean()),
                        "growth_rate": self._calculate_growth_rate(col),
                        "variability": float(self.df[col].std() / self.df[col].mean() if self.df[col].mean() != 0 else 0)
                    }
                    break
        
        return metrics
    
    def _get_data_distributions(self) -> Dict[str, Any]:
        """Get data distributions for visualization"""
        distributions = {}
        
        numeric_cols = self.df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols[:5]:
            hist, bins = np.histogram(self.df[col].dropna(), bins=10)
            distributions[col] = {
                "histogram": {
                    "counts": hist.tolist(),
                    "bin_edges": bins.tolist()
                },
                "percentiles": {
                    "p10": float(self.df[col].quantile(0.1)),
                    "p25": float(self.df[col].quantile(0.25)),
                    "p50": float(self.df[col].quantile(0.5)),
                    "p75": float(self.df[col].quantile(0.75)),
                    "p90": float(self.df[col].quantile(0.9))
                }
            }
        
        return distributions
    
    def _extract_time_series_info(self) -> Dict[str, Any]:
        """Extract time series information if available"""
        time_cols = [col for col in self.df.columns if 'date' in col.lower() or 'time' in col.lower()]
        
        if not time_cols:
            return {"has_time_series": False}
        
        time_col = time_cols[0]
        try:
            self.df[time_col] = pd.to_datetime(self.df[time_col])
            time_info = {
                "has_time_series": True,
                "time_column": time_col,
                "time_range": {
                    "start": str(self.df[time_col].min()),
                    "end": str(self.df[time_col].max()),
                    "days": (self.df[time_col].max() - self.df[time_col].min()).days
                },
                "granularity": self._determine_time_granularity(self.df[time_col]),
                "completeness": float(self.df[time_col].notnull().sum() / len(self.df))
            }
            
            # Check for seasonality patterns
            if len(self.df) > 30:
                numeric_cols = self.df.select_dtypes(include=[np.number]).columns
                if len(numeric_cols) > 0:
                    time_info["seasonality_check"] = self._check_seasonality(time_col, numeric_cols[0])
            
            return time_info
            
        except:
            return {"has_time_series": False}
    
    def _calculate_growth_rate(self, column: str) -> Optional[float]:
        """Calculate growth rate for a numeric column if time series"""
        time_cols = [col for col in self.df.columns if 'date' in col.lower()]
        if not time_cols or column not in self.df.columns:
            return None
        
        try:
            time_col = time_cols[0]
            df_sorted = self.df.sort_values(time_col)
            if len(df_sorted) < 2:
                return None
            
            first_val = df_sorted[column].iloc[0]
            last_val = df_sorted[column].iloc[-1]
            
            if first_val == 0:
                return None
            
            growth_rate = ((last_val - first_val) / first_val) * 100
            return float(growth_rate)
        except:
            return None
    
    def _classify_distribution(self, skew: float, kurtosis: float) -> str:
        """Classify distribution based on skewness and kurtosis"""
        if abs(skew) < 0.5 and abs(kurtosis) < 0.5:
            return "approximately normal"
        elif skew > 1:
            return "right skewed"
        elif skew < -1:
            return "left skewed"
        elif kurtosis > 3:
            return "leptokurtic (heavy-tailed)"
        elif kurtosis < 3:
            return "platykurtic (light-tailed)"
        else:
            return "undefined"
    
    def _test_normality(self, series: pd.Series) -> Dict[str, Any]:
        """Perform normality test on a series"""
        from scipy import stats
        
        try:
            # Remove NaN values
            clean_series = series.dropna()
            if len(clean_series) < 3:
                return {"test": "insufficient_data"}
            
            # Shapiro-Wilk test (limited to 5000 samples)
            test_sample = clean_series[:5000] if len(clean_series) > 5000 else clean_series
            stat, p_value = stats.shapiro(test_sample)
            
            return {
                "test": "shapiro_wilk",
                "statistic": float(stat),
                "p_value": float(p_value),
                "is_normal": p_value > 0.05
            }
        except:
            return {"test": "failed"}
    
    def _detect_column_outliers(self, series: pd.Series) -> Dict[str, Any]:
        """Detect outliers in a column using IQR method"""
        q1 = series.quantile(0.25)
        q3 = series.quantile(0.75)
        iqr = q3 - q1
        
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        
        outliers = series[(series < lower_bound) | (series > upper_bound)]
        
        return {
            "count": int(len(outliers)),
            "percentage": float((len(outliers) / len(series)) * 100),
            "bounds": {"lower": float(lower_bound), "upper": float(upper_bound)},
            "outlier_values": outliers.tolist() if len(outliers) <= 5 else outliers.head(5).tolist()
        }
    
    def _analyze_trend(self, time_col: str, value_col: str) -> Optional[Dict[str, Any]]:
        """Analyze trend between time and value columns"""
        try:
            df_clean = self.df[[time_col, value_col]].dropna()
            if len(df_clean) < 2:
                return None
            
            # Convert to datetime if needed
            if not pd.api.types.is_datetime64_any_dtype(df_clean[time_col]):
                df_clean[time_col] = pd.to_datetime(df_clean[time_col])
            
            df_clean = df_clean.sort_values(time_col)
            
            # Calculate linear trend
            x = np.arange(len(df_clean))
            y = df_clean[value_col].values
            
            from scipy import stats
            slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)
            
            return {
                "slope": float(slope),
                "intercept": float(intercept),
                "r_squared": float(r_value ** 2),
                "p_value": float(p_value),
                "trend": "increasing" if slope > 0 else "decreasing" if slope < 0 else "stable",
                "strength": "strong" if abs(r_value) > 0.7 else "moderate" if abs(r_value) > 0.5 else "weak"
            }
        except:
            return None
    
    def _find_strong_correlations(self, correlation_matrix: pd.DataFrame, 
                                 threshold: float = 0.7) -> List[Dict[str, Any]]:
        """Find strong correlations in correlation matrix"""
        strong_corrs = []
        columns = correlation_matrix.columns
        
        for i in range(len(columns)):
            for j in range(i+1, len(columns)):
                corr = correlation_matrix.iloc[i, j]
                if abs(corr) >= threshold:
                    strong_corrs.append({
                        "variables": [columns[i], columns[j]],
                        "correlation": float(corr),
                        "strength": self._get_correlation_strength(corr)
                    })
        
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
    
    def _determine_time_granularity(self, time_series: pd.Series) -> str:
        """Determine the granularity of time series data"""
        if len(time_series) < 2:
            return "unknown"
        
        time_diffs = time_series.diff().dropna()
        if len(time_diffs) == 0:
            return "unknown"
        
        median_diff = time_diffs.median()
        
        if median_diff.days >= 365:
            return "yearly"
        elif median_diff.days >= 30:
            return "monthly"
        elif median_diff.days >= 7:
            return "weekly"
        elif median_diff.days >= 1:
            return "daily"
        elif median_diff.seconds >= 3600:
            return "hourly"
        elif median_diff.seconds >= 60:
            return "minutely"
        else:
            return "secondly"
    
    def _check_seasonality(self, time_col: str, value_col: str) -> Dict[str, Any]:
        """Check for seasonality in time series"""
        try:
            df_clean = self.df[[time_col, value_col]].dropna()
            if len(df_clean) < 30:
                return {"detected": False, "reason": "insufficient_data"}
            
            # Convert to datetime and sort
            df_clean[time_col] = pd.to_datetime(df_clean[time_col])
            df_clean = df_clean.sort_values(time_col)
            
            # Set time as index
            df_clean.set_index(time_col, inplace=True)
            
            # Resample to daily if needed
            if len(df_clean) > 365:
                df_resampled = df_clean.resample('D').mean()
            else:
                df_resampled = df_clean
            
            # Simple seasonality check
            from statsmodels.tsa.seasonal import seasonal_decompose
            
            if len(df_resampled) >= 2 * 7:
                decomposition = seasonal_decompose(
                    df_resampled[value_col].fillna(method='ffill'),
                    model='additive',
                    period=7
                )
                
                seasonal_strength = np.std(decomposition.seasonal) / np.std(decomposition.trend + decomposition.seasonal)
                
                return {
                    "detected": seasonal_strength > 0.1,
                    "seasonal_strength": float(seasonal_strength),
                    "period": 7,
                    "seasonality_type": "weekly"
                }
            
            return {"detected": False, "reason": "insufficient_periods"}
            
        except Exception as e:
            return {"detected": False, "reason": f"analysis_error: {str(e)}"}
    
    def _calculate_data_quality_score(self) -> float:
        """Calculate data quality score (0-1)"""
        scores = []
        
        # Completeness score
        completeness = 1 - (self.df.isnull().sum().sum() / np.prod(self.df.shape))
        scores.append(completeness * 0.3)
        
        # Consistency score (check for duplicates)
        duplicates = self.df.duplicated().sum()
        consistency = 1 - (duplicates / len(self.df)) if len(self.df) > 0 else 1
        scores.append(consistency * 0.2)
        
        # Validity score (check numeric ranges)
        numeric_cols = self.df.select_dtypes(include=[np.number]).columns
        validity_scores = []
        for col in numeric_cols:
            infinite = np.isinf(self.df[col]).sum()
            mean = self.df[col].mean()
            std = self.df[col].std()
            if std > 0:
                extreme_outliers = ((self.df[col] - mean).abs() > 5 * std).sum()
                validity = 1 - ((infinite + extreme_outliers) / len(self.df))
                validity_scores.append(validity)
        
        avg_validity = np.mean(validity_scores) if validity_scores else 1
        scores.append(avg_validity * 0.25)
        
        # Timeliness score (if time column exists)
        time_cols = [col for col in self.df.columns if 'date' in col.lower()]
        if time_cols:
            try:
                time_col = time_cols[0]
                self.df[time_col] = pd.to_datetime(self.df[time_col], errors='coerce')
                latest_date = self.df[time_col].max()
                if pd.notnull(latest_date):
                    days_old = (pd.Timestamp.now() - latest_date).days
                    timeliness = max(0, 1 - (days_old / 365))
                    scores.append(timeliness * 0.25)
                else:
                    scores.append(0.25)
            except:
                scores.append(0.25)
        else:
            scores.append(0.25)
        
        return float(np.mean(scores))
    
    def _check_sample_size_adequacy(self) -> Dict[str, Any]:
        """Check if sample size is adequate for analysis"""
        total_samples = len(self.df)
        numeric_cols = self.df.select_dtypes(include=[np.number]).columns
        
        # Rule of thumb: 10-20 samples per predictor for regression
        min_samples_regression = len(numeric_cols) * 10
        
        # For classification: at least 10 samples per class per predictor
        categorical_cols = self.df.select_dtypes(include=['object']).columns
        if len(categorical_cols) > 0:
            target_col = categorical_cols[0]
            n_classes = self.df[target_col].nunique()
            min_samples_classification = n_classes * len(numeric_cols) * 10
        else:
            min_samples_classification = 0
        
        adequacy = {
            "total_samples": total_samples,
            "numeric_predictors": len(numeric_cols),
            "minimum_recommended_regression": min_samples_regression,
            "minimum_recommended_classification": min_samples_classification,
            "adequate_for_regression": total_samples >= min_samples_regression,
            "adequate_for_classification": total_samples >= min_samples_classification if min_samples_classification > 0 else None,
            "recommendation": self._generate_sample_size_recommendation(
                total_samples, min_samples_regression, min_samples_classification
            )
        }
        
        return adequacy
    
    def _generate_sample_size_recommendation(self, current: int, min_reg: int, min_clf: int) -> str:
        """Generate recommendation based on sample size"""
        if current >= min_reg and (min_clf == 0 or current >= min_clf):
            return "Sample size is adequate for most analyses."
        elif current < min_reg:
            shortage = min_reg - current
            return f"Consider collecting {shortage} more samples for reliable regression analysis."
        else:
            shortage = min_clf - current
            return f"Consider collecting {shortage} more samples for reliable classification analysis."
    
    def _extract_key_findings(self, ai_insights: Dict[str, Any], 
                             statistical_insights: Dict[str, Any]) -> List[str]:
        """Extract key findings from insights"""
        findings = []
        
        # Extract from AI insights
        ai_key_findings = ai_insights.get("insights", {}).get("key_findings", [])
        if isinstance(ai_key_findings, list):
            findings.extend(ai_key_findings[:5])
        
        # Extract from statistical insights
        if statistical_insights.get("outliers"):
            outlier_cols = list(statistical_insights["outliers"].keys())
            if outlier_cols:
                findings.append(f"Outliers detected in columns: {', '.join(outlier_cols[:3])}")
        
        if statistical_insights.get("relationships", {}).get("correlations"):
            strong_corrs = statistical_insights["relationships"]["correlations"]
            if strong_corrs:
                strongest = strong_corrs[0]
                findings.append(f"Strong correlation found between {strongest['variables'][0]} and {strongest['variables'][1]}")
        
        # Add data quality finding
        dq_score = self._calculate_data_quality_score()
        if dq_score < 0.7:
            findings.append(f"Data quality score is {dq_score:.2f}. Consider data cleaning.")
        
        return findings
    
    def _analyze_for_recommendations(self, business_goal: str) -> Dict[str, Any]:
        """Analyze data specifically for recommendation generation"""
        return {
            "business_goal": business_goal,
            "data_summary": self._prepare_data_summary(),
            "key_metrics": self._calculate_key_metrics(),
            "trends": self._extract_trends_for_goal(business_goal),
            "opportunities": self._identify_opportunities(business_goal),
            "constraints": self._identify_constraints(business_goal)
        }
    
    def _extract_trends_for_goal(self, business_goal: str) -> List[Dict[str, Any]]:
        """Extract trends relevant to business goal"""
        trends = []
        
        # Look for time-based trends
        time_cols = [col for col in self.df.columns if 'date' in col.lower()]
        if time_cols:
            time_col = time_cols[0]
            numeric_cols = self.df.select_dtypes(include=[np.number]).columns
            
            for value_col in numeric_cols[:3]:
                trend = self._analyze_trend(time_col, value_col)
                if trend and trend["p_value"] < 0.05:
                    trends.append({
                        "metric": value_col,
                        "trend": trend["trend"],
                        "strength": trend["strength"],
                        "r_squared": trend["r_squared"]
                    })
        
        return trends
    
    def _identify_opportunities(self, business_goal: str) -> List[str]:
        """Identify opportunities based on business goal"""
        opportunities = []
        
        numeric_cols = self.df.select_dtypes(include=[np.number]).columns
        
        for col in numeric_cols:
            # Look for high-growth potential
            growth_rate = self._calculate_growth_rate(col)
            if growth_rate and growth_rate > 20:
                opportunities.append(f"High growth observed in {col} ({growth_rate:.1f}%)")
            
            # Look for underutilized resources (low variance relative to mean)
            cv = self.df[col].std() / self.df[col].mean() if self.df[col].mean() != 0 else 0
            if cv < 0.1:
                opportunities.append(f"Consistent performance in {col} (low variability)")
        
        return opportunities[:5]
    
    def _identify_constraints(self, business_goal: str) -> List[str]:
        """Identify constraints based on business goal"""
        constraints = []
        
        # Data quality constraints
        dq_score = self._calculate_data_quality_score()
        if dq_score < 0.7:
            constraints.append(f"Data quality limitations (score: {dq_score:.2f})")
        
        # Sample size constraints
        sample_adequacy = self._check_sample_size_adequacy()
        if not sample_adequacy["adequate_for_regression"]:
            constraints.append("Insufficient sample size for robust analysis")
        
        # Missing data constraints
        missing_total = self.df.isnull().sum().sum()
        if missing_total > 0:
            missing_pct = (missing_total / np.prod(self.df.shape)) * 100
            constraints.append(f"Missing data ({missing_pct:.1f}% of values)")
        
        return constraints