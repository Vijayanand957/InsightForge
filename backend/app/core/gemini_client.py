import google.generativeai as genai
import json
from typing import Dict, Any, List, Optional
from app.config import settings
import logging

logger = logging.getLogger(__name__)

class GeminiClient:
    def __init__(self):
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not set in environment variables")
        
        # Configure the Gemini API
        genai.configure(api_key=settings.GEMINI_API_KEY)
        
        # Get the model
        try:
            self.model = genai.GenerativeModel(settings.GEMINI_MODEL)
            logger.info(f"Gemini client initialized with model: {settings.GEMINI_MODEL}")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini model: {e}")
            raise
        
    async def generate_insights(self, data_summary: Dict[str, Any], context: str = "") -> Dict[str, Any]:
        """Generate insights from data using Gemini AI"""
        try:
            prompt = self._build_insight_prompt(data_summary, context)
            
            response = await self.model.generate_content_async(prompt)
            
            if not response or not response.text:
                raise ValueError("Empty response from Gemini API")
            
            # Parse the response
            insights = self._parse_ai_response(response.text)
            
            return {
                "insights": insights,
                "raw_response": response.text,
                "model": settings.GEMINI_MODEL
            }
            
        except Exception as e:
            logger.error(f"Gemini AI error: {e}")
            raise
    
    async def generate_recommendations(self, analysis_results: Dict[str, Any], business_context: str = "") -> Dict[str, Any]:
        """Generate business recommendations based on analysis"""
        try:
            prompt = self._build_recommendation_prompt(analysis_results, business_context)
            
            response = await self.model.generate_content_async(prompt)
            
            if not response or not response.text:
                raise ValueError("Empty response from Gemini API")
            
            recommendations = self._parse_recommendations(response.text)
            
            return {
                "recommendations": recommendations,
                "business_context": business_context,
                "model": settings.GEMINI_MODEL
            }
            
        except Exception as e:
            logger.error(f"Gemini AI recommendations error: {e}")
            raise
    
    async def explain_analysis(self, analysis_data: Dict[str, Any], audience: str = "business") -> str:
        """Explain analysis results in simple terms"""
        try:
            prompt = self._build_explanation_prompt(analysis_data, audience)
            
            response = await self.model.generate_content_async(prompt)
            
            if not response or not response.text:
                raise ValueError("Empty response from Gemini API")
            
            return response.text
            
        except Exception as e:
            logger.error(f"Gemini AI explanation error: {e}")
            raise
    
    async def predict_trends(self, historical_data: Dict[str, Any], periods: int = 5) -> Dict[str, Any]:
        """Predict future trends based on historical data"""
        try:
            prompt = self._build_prediction_prompt(historical_data, periods)
            
            response = await self.model.generate_content_async(prompt)
            
            if not response or not response.text:
                raise ValueError("Empty response from Gemini API")
            
            trends = self._parse_trend_predictions(response.text)
            
            return {
                "predictions": trends,
                "periods": periods,
                "model": settings.GEMINI_MODEL
            }
            
        except Exception as e:
            logger.error(f"Gemini AI prediction error: {e}")
            raise
    
    def _build_insight_prompt(self, data_summary: Dict[str, Any], context: str) -> str:
        """Build prompt for insight generation"""
        return f"""
        You are a data analyst AI assistant. Analyze the following data summary and provide insights:
        
        DATA SUMMARY:
        {json.dumps(data_summary, indent=2)}
        
        CONTEXT: {context}
        
        Provide insights in the following JSON format:
        {{
            "key_findings": ["finding1", "finding2", ...],
            "trends": ["trend1", "trend2", ...],
            "anomalies": ["anomaly1", "anomaly2", ...],
            "recommendations": ["rec1", "rec2", ...],
            "confidence": 0.85,
            "summary": "Brief summary of insights"
        }}
        
        Focus on actionable insights that would help in decision-making.
        Return ONLY the JSON object, no additional text.
        """
    
    def _build_recommendation_prompt(self, analysis_results: Dict[str, Any], business_context: str) -> str:
        """Build prompt for recommendation generation"""
        return f"""
        You are a business strategy AI assistant. Based on the analysis results, provide strategic recommendations:
        
        ANALYSIS RESULTS:
        {json.dumps(analysis_results, indent=2)}
        
        BUSINESS CONTEXT: {business_context}
        
        Provide recommendations in the following JSON format:
        {{
            "title": "Overall recommendation title",
            "description": "Overall description",
            "recommendations": [
                {{
                    "title": "Recommendation title",
                    "description": "Detailed description",
                    "impact": "high/medium/low",
                    "effort": "high/medium/low",
                    "timeframe": "short/medium/long term",
                    "confidence": 0.85
                }}
            ],
            "priority_order": ["recommendation1", "recommendation2", ...],
            "summary": "Overall recommendation summary",
            "impact": "high/medium/low",
            "effort": "high/medium/low",
            "timeframe": "short_term/medium_term/long_term",
            "confidence": 0.85,
            "priority": "high/medium/low"
        }}
        
        Consider business impact, feasibility, and alignment with business goals.
        Return ONLY the JSON object, no additional text.
        """
    
    def _build_explanation_prompt(self, analysis_data: Dict[str, Any], audience: str) -> str:
        """Build prompt for explaining analysis"""
        audience_level = "non-technical business executives" if audience == "business" else "technical team"
        
        return f"""
        Explain the following analysis results to {audience_level}:
        
        ANALYSIS DATA:
        {json.dumps(analysis_data, indent=2)}
        
        Provide a clear, concise explanation that focuses on:
        1. What the data shows
        2. Why it matters
        3. What actions should be considered
        
        Use simple language and avoid technical jargon for non-technical audiences.
        Return ONLY the explanation text, no JSON formatting.
        """
    
    def _build_prediction_prompt(self, historical_data: Dict[str, Any], periods: int) -> str:
        """Build prompt for trend prediction"""
        return f"""
        Based on the historical data, predict trends for the next {periods} periods:
        
        HISTORICAL DATA:
        {json.dumps(historical_data, indent=2)}
        
        Provide predictions in the following JSON format:
        {{
            "predictions": [
                {{
                    "period": "Period name",
                    "expected_value": 123.45,
                    "confidence_interval": [100.0, 150.0],
                    "trend": "increasing/decreasing/stable",
                    "explanation": "Why this prediction"
                }}
            ],
            "overall_trend": "overall trend description",
            "risks": ["risk1", "risk2", ...],
            "opportunities": ["opportunity1", "opportunity2", ...]
        }}
        
        Be realistic and consider seasonality, trends, and patterns in the data.
        Return ONLY the JSON object, no additional text.
        """
    
    def _parse_ai_response(self, response_text: str) -> Dict[str, Any]:
        """Parse AI response into structured JSON"""
        try:
            # Try to find JSON in the response
            import re
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            
            if json_match:
                json_str = json_match.group()
                return json.loads(json_str)
            else:
                # If no JSON found, create a structured response
                return {
                    "key_findings": [response_text.strip()],
                    "summary": response_text[:200] + "..." if len(response_text) > 200 else response_text,
                    "confidence": 0.7
                }
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response as JSON: {e}")
            return {
                "key_findings": [response_text.strip()],
                "summary": response_text[:200] + "..." if len(response_text) > 200 else response_text,
                "confidence": 0.7,
                "raw": response_text
            }
    
    def _parse_recommendations(self, response_text: str) -> List[Dict[str, Any]]:
        """Parse recommendations from AI response"""
        try:
            parsed = self._parse_ai_response(response_text)
            if "recommendations" in parsed and isinstance(parsed["recommendations"], list):
                return parsed["recommendations"]
            elif isinstance(parsed, list):
                return parsed
            else:
                # Try to extract recommendations from other structures
                recommendations = []
                if "title" in parsed and "description" in parsed:
                    recommendations.append(parsed)
                return recommendations
        except Exception as e:
            logger.error(f"Error parsing recommendations: {e}")
            return []
    
    def _parse_trend_predictions(self, response_text: str) -> Dict[str, Any]:
        """Parse trend predictions from AI response"""
        try:
            return self._parse_ai_response(response_text)
        except Exception as e:
            logger.error(f"Error parsing trend predictions: {e}")
            return {"predictions": [], "overall_trend": "Unable to parse predictions"}