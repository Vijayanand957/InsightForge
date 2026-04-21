'use client';

import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { motion } from 'framer-motion';
import {
  TrendingUp, Target, BarChart3, Download, Share2, ChevronDown, ChevronUp, 
  AlertCircle, CheckCircle, Clock, Zap, Brain
} from 'lucide-react';
import toast from 'react-hot-toast';

const PredictionsDisplay = ({ predictions, loading = false }) => {
  const [expandedSections, setExpandedSections] = useState({
    forecast: true,
    importance: true,
    insights: true,
    metrics: true
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleExport = () => {
    if (!predictions) {
      toast.error('No predictions to export');
      return;
    }
    
    try {
      const dataStr = JSON.stringify(predictions, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `predictions-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Predictions exported successfully');
    } catch (error) {
      toast.error('Failed to export predictions');
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      </div>
    );
  }

  if (!predictions || Object.keys(predictions).length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center">
        <Brain className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          No Predictions Available
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Click "Generate Predictions" to analyze your data and see forecasts.
        </p>
      </div>
    );
  }

  const {
    model_performance = {},
    feature_importance = {},
    predictions: predData = {},
    model_details = {},
    ai_insights = {},
    recommendations = []
  } = predictions;

  // Prepare forecast chart data
  const forecastData = (predData.future || []).map((p, idx) => ({
    period: p.period || `Period ${idx + 1}`,
    value: p.estimated_value || p.value || 0,
    lower: p.confidence_interval?.[0] || (p.estimated_value || 0) * 0.9,
    upper: p.confidence_interval?.[1] || (p.estimated_value || 0) * 1.1
  }));

  // Add historical values if present
  if (predData.historical) {
    const historical = Array.isArray(predData.historical) 
      ? predData.historical 
      : (predData.historical.values || []);
    
    historical.forEach((val, idx) => {
      forecastData.unshift({
        period: `t-${historical.length - idx}`,
        value: typeof val === 'object' ? val.value : val,
        historical: true
      });
    });
  }

  // Feature importance for bar chart
  const importanceData = feature_importance?.importance && feature_importance?.features
    ? feature_importance.features.map((f, i) => ({
        feature: typeof f === 'string' && f.length > 20 ? f.substring(0, 17) + '...' : f,
        importance: feature_importance.importance[i]
      })).sort((a, b) => b.importance - a.importance).slice(0, 10)
    : [];

  return (
    <div className="space-y-8">
      {/* Header with model info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Target className="h-6 w-6 text-primary-600" />
              Prediction Results
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Model: {model_details?.algorithm || 'Random Forest'} · 
              Target: {model_details?.target_column || 'Value'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">R² Score</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {model_performance?.r2_score?.toFixed(3) || model_performance?.R2?.toFixed(3) || 'N/A'}
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">MAE</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {model_performance?.mean_absolute_error?.toFixed(2) || model_performance?.MAE?.toFixed(2) || 'N/A'}
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">RMSE</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {model_performance?.root_mean_squared_error?.toFixed(2) || model_performance?.RMSE?.toFixed(2) || 'N/A'}
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">Training Samples</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {model_details?.training_samples?.toLocaleString() || model_details?.n_samples || 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Forecast Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary-600" />
            Forecast
          </h3>
          <button onClick={() => toggleSection('forecast')}>
            {expandedSections.forecast ? <ChevronUp /> : <ChevronDown />}
          </button>
        </div>

        {expandedSections.forecast && forecastData.length > 0 && (
          <>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={forecastData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#8884d8"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Predicted"
                />
                {forecastData[0]?.upper && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="upper"
                      stroke="#82ca9d"
                      strokeDasharray="3 3"
                      dot={false}
                      name="Upper CI"
                    />
                    <Line
                      type="monotone"
                      dataKey="lower"
                      stroke="#82ca9d"
                      strokeDasharray="3 3"
                      dot={false}
                      name="Lower CI"
                    />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
            <p className="text-sm text-gray-500 mt-4">
              * Shaded area represents 95% confidence interval.
            </p>
          </>
        )}
      </div>

      {/* Feature Importance */}
      {importanceData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary-600" />
              Feature Importance
            </h3>
            <button onClick={() => toggleSection('importance')}>
              {expandedSections.importance ? <ChevronUp /> : <ChevronDown />}
            </button>
          </div>
          {expandedSections.importance && (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={importanceData} 
                layout="vertical" 
                margin={{ left: 100, right: 30, top: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 1]} />
                <YAxis type="category" dataKey="feature" width={150} />
                <Tooltip />
                <Bar dataKey="importance" fill="#8884d8">
                  {importanceData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.importance > 0.1 ? '#82ca9d' : '#ffc658'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* AI Insights */}
      {ai_insights && Object.keys(ai_insights).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary-600" />
              AI Interpretation
            </h3>
            <button onClick={() => toggleSection('insights')}>
              {expandedSections.insights ? <ChevronUp /> : <ChevronDown />}
            </button>
          </div>
          {expandedSections.insights && (
            <div className="space-y-4">
              {ai_insights.key_findings && Array.isArray(ai_insights.key_findings) && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Key Findings</h4>
                  <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">
                    {ai_insights.key_findings.map((f, idx) => (
                      <li key={idx}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
              {ai_insights.summary && (
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {ai_insights.summary}
                </p>
              )}
              {/* Fallback if no structured insights but there is raw text */}
              {!ai_insights.key_findings && !ai_insights.summary && typeof ai_insights === 'string' && (
                <p className="text-gray-700 dark:text-gray-300">{ai_insights}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary-600" />
              Recommendations
            </h3>
            <button onClick={() => toggleSection('recommendations')}>
              {expandedSections.recommendations ? <ChevronUp /> : <ChevronDown />}
            </button>
          </div>
          {expandedSections.recommendations && (
            <div className="space-y-3">
              {recommendations.map((rec, idx) => (
                <div key={idx} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      {rec.title || 'Recommendation'}
                    </h4>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      rec.impact === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                      rec.impact === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    }`}>
                      {rec.impact || 'medium'} impact
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">{rec.description || ''}</p>
                  {rec.timeframe && (
                    <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {rec.timeframe}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PredictionsDisplay;