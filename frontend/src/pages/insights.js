'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Brain,
  Sparkles,
  Target,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Database,
  Filter,
  Download,
  Share2,
  Bookmark,
  ThumbsUp,
  MessageSquare,
  Calendar,
  Clock,
  ChevronRight,
  Zap,
  Eye,
  MoreVertical
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { insightsAPI } from '@/lib/api';
import InsightCard from '@/components/insights/InsightCard';
import PredictionsDisplay from '@/components/insights/PredictionsDisplay';
import RecommendationsPanel from '@/components/insights/RecommendationsPanel';

export default function InsightsPage() {
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [insights, setInsights] = useState([]);
  const [predictions, setPredictions] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('insights');
  const [filterType, setFilterType] = useState('all');
  const [insightTypes, setInsightTypes] = useState([]);
  const [numericColumns, setNumericColumns] = useState([]);
  const [selectedTargetColumn, setSelectedTargetColumn] = useState('');
  const router = useRouter();
  const { datasets, fetchDatasets, isLoading: dataLoading, generateInsights: generateContextInsights } = useData();
  const { user } = useAuth();
  
  const initialFetchDone = useRef(false);

  useEffect(() => {
    if (user) {
      fetchDatasets();
    }
  }, [user, fetchDatasets]);

  useEffect(() => {
    if (datasets.length > 0 && !selectedDataset) {
      setSelectedDataset(datasets[0]);
    }
  }, [datasets]);

  // Extract numeric columns when dataset changes
  useEffect(() => {
    if (selectedDataset && selectedDataset.columns) {
      const numericCols = selectedDataset.columns.filter(col => 
        ['year', 'id', 'count', 'number', 'score', 'rating', 'amount', 'value', 'price', 'quantity', 'size', 'area', 'use', 'emissions', 'intensity', 'lat', 'long', 'sq ft', 'kgal', 'kbtu', 'ghg', 'co2', 'age', 'index'].some(keyword => 
          col.toLowerCase().includes(keyword.toLowerCase())
        )
      );
      
      const buildingIdCol = selectedDataset.columns.find(col => 
        col.toLowerCase().includes('building') || col.toLowerCase().includes('id')
      );
      
      if (buildingIdCol) {
        setSelectedTargetColumn(buildingIdCol);
      } else if (numericCols.length > 0) {
        setSelectedTargetColumn(numericCols[0]);
      } else if (selectedDataset.columns.length > 0) {
        setSelectedTargetColumn(selectedDataset.columns[0]);
      }
      
      setNumericColumns(numericCols);
    }
  }, [selectedDataset]);

  useEffect(() => {
    if (selectedDataset && !initialFetchDone.current) {
      initialFetchDone.current = true;
    } else if (selectedDataset && initialFetchDone.current) {
      fetchInsights(selectedDataset.id);
    }
  }, [selectedDataset]);

  const fetchInsights = async (datasetId) => {
    if (!datasetId) return;
    
    setLoading(true);
    try {
      const response = await insightsAPI.listInsights(datasetId);
      
      let insightsList = [];
      if (Array.isArray(response)) {
        insightsList = response;
      } else if (response && typeof response === 'object') {
        insightsList = response.insights || [];
      }
      
      setInsights(insightsList);
      
      // Extract predictions
      const predictionInsights = insightsList.filter(i => i.insight_type === 'prediction');
      if (predictionInsights.length > 0) {
        const sorted = [...predictionInsights].sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        );
        try {
          const latestPrediction = sorted[0];
          const predictionData = typeof latestPrediction.content === 'string' 
            ? JSON.parse(latestPrediction.content) 
            : latestPrediction.content;
          setPredictions(predictionData);
        } catch (e) {
          console.error('Error parsing prediction data:', e);
          setPredictions(null);
        }
      } else {
        setPredictions(null);
      }
      
      // Extract recommendations
      const recommendationInsights = insightsList.filter(i => i.insight_type === 'recommendation');
      if (recommendationInsights.length > 0) {
        const allRecommendations = [];
        recommendationInsights.forEach(recInsight => {
          try {
            const recData = typeof recInsight.content === 'string'
              ? JSON.parse(recInsight.content)
              : recInsight.content;
            
            if (recData.recommendations && Array.isArray(recData.recommendations)) {
              allRecommendations.push(...recData.recommendations);
            } else if (recData.data && recData.data.recommendations && Array.isArray(recData.data.recommendations)) {
              allRecommendations.push(...recData.data.recommendations);
            } else if (Array.isArray(recData)) {
              allRecommendations.push(...recData);
            } else {
              if (recData.title || recData.description) {
                allRecommendations.push(recData);
              }
            }
          } catch (e) {
            console.error('Error parsing recommendation data:', e);
          }
        });
        setRecommendations(allRecommendations);
      } else {
        setRecommendations([]);
      }
      
      // Calculate insight type counts
      const typeCounts = {};
      insightsList.forEach(insight => {
        const type = insight.insight_type || 'unknown';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });
      
      const types = [
        { id: 'all', label: 'All Insights', icon: Brain, count: insightsList.length },
        ...Object.entries(typeCounts).map(([type, count]) => ({
          id: type,
          label: type === 'ai_generated' ? 'Ai Generated' : 
                 type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
          icon: getIconForType(type),
          count
        }))
      ];
      setInsightTypes(types);
      
    } catch (error) {
      console.error('Failed to fetch insights:', error);
      setInsights([]);
      setPredictions(null);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const getIconForType = (type) => {
    switch (type) {
      case 'prediction': return Target;
      case 'trend': return TrendingUp;
      case 'anomaly': return AlertTriangle;
      case 'recommendation': return Lightbulb;
      case 'ai_generated': return Brain;
      default: return Brain;
    }
  };

  const handleGenerateInsights = async () => {
    if (!selectedDataset) {
      toast.error('Please select a dataset first');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Generating AI insights...');
    
    try {
      const result = await generateContextInsights(selectedDataset.id);
      
      if (result && result.success) {
        toast.success('AI insights generated successfully!', { id: toastId });
        await fetchInsights(selectedDataset.id);
      } else {
        toast.error(result?.error || 'Failed to generate insights', { id: toastId });
      }
    } catch (error) {
      toast.error('Failed to generate insights', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePredictions = async () => {
    if (!selectedDataset) {
      toast.error('Please select a dataset first');
      return;
    }

    let targetColumn = selectedTargetColumn;
    
    if (!targetColumn) {
      if (selectedDataset.columns && selectedDataset.columns.length > 0) {
        targetColumn = selectedDataset.columns[0];
      } else {
        toast.error('No columns available for prediction');
        return;
      }
    }

    setLoading(true);
    const toastId = toast.loading(
      'Generating predictions... This may take 1-2 minutes for large datasets.', 
      { duration: 300000 }
    );
    
    try {
      const response = await insightsAPI.predict(
        selectedDataset.id,
        targetColumn,
        null,
        'regression',
        10
      );
      
      toast.success('Predictions generated successfully!', { id: toastId });
      setPredictions(response);
      await fetchInsights(selectedDataset.id);
      setActiveTab('predictions');
    } catch (error) {
      console.error('Prediction error:', error);
      
      if (error.code === 'ECONNABORTED') {
        toast.error(
          'Prediction timed out. The dataset may be too large. Try with a smaller dataset or different target column.',
          { id: toastId, duration: 8000 }
        );
      } else if (error.response?.status === 500) {
        toast.error(
          'Server error during prediction. The dataset might be too complex. Try with fewer columns.',
          { id: toastId, duration: 8000 }
        );
      } else {
        toast.error(
          error.response?.data?.detail || error.message || 'Failed to generate predictions',
          { id: toastId }
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRecommendations = async () => {
    if (!selectedDataset) {
      toast.error('Please select a dataset first');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Generating recommendations...');
    
    try {
      const response = await insightsAPI.recommend(
        selectedDataset.id,
        'Improve business performance and efficiency',
        []
      );
      
      toast.success('Recommendations generated successfully!', { id: toastId });
      setRecommendations(response.recommendations || []);
      await fetchInsights(selectedDataset.id);
      setActiveTab('recommendations');
    } catch (error) {
      console.error('Recommendation error:', error);
      toast.error(error.response?.data?.detail || error.message || 'Failed to generate recommendations', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleBookmark = (insightId) => {
    toast.success('Bookmark toggled');
  };

  const handleLike = (insightId) => {
    toast.success('Insight liked');
  };

  const filteredInsights = filterType === 'all' 
    ? insights 
    : insights.filter(i => i.insight_type === filterType);

  const predictionCount = insights.filter(i => i.insight_type === 'prediction').length;
  const recommendationCount = insights.filter(i => i.insight_type === 'recommendation').length;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Not Authenticated</h2>
          <p className="mb-4">Please log in to access insights</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Insights</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Discover AI-generated insights and recommendations from your data
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateInsights}
            disabled={loading || !selectedDataset}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Insights
              </>
            )}
          </button>
        </div>
      </div>

      {/* Dataset Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg">
              <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Select Dataset</h2>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {datasets.length} dataset(s) available
          </span>
        </div>

        <div className="flex flex-wrap gap-3">
          {datasets.map((dataset) => (
            <button
              key={dataset.id}
              onClick={() => {
                setSelectedDataset(dataset);
                initialFetchDone.current = true;
              }}
              className={`px-4 py-3 rounded-xl border transition-all duration-300 flex items-center gap-3 ${
                selectedDataset?.id === dataset.id
                  ? 'border-blue-300 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <div className="p-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg">
                <Database className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                  {dataset.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {dataset.row_count?.toLocaleString() || 0} rows • 
                  {dataset.file_size ? ` ${(dataset.file_size / (1024 * 1024)).toFixed(1)} MB` : ' Unknown size'}
                </p>
              </div>
              {selectedDataset?.id === dataset.id && (
                <div className="h-2 w-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full animate-pulse" />
              )}
            </button>
          ))}
          
          {datasets.length === 0 && (
            <div className="w-full text-center py-4">
              <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No datasets found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Upload a dataset to generate AI insights
              </p>
              <button
                onClick={() => router.push('/upload')}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg"
              >
                Upload Dataset
              </button>
            </div>
          )}
        </div>

        {/* Target Column Selector for Predictions */}
        {selectedDataset && selectedDataset.columns && selectedDataset.columns.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <label htmlFor="target-column" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Target Column for Predictions:
            </label>
            <select
              id="target-column"
              value={selectedTargetColumn}
              onChange={(e) => setSelectedTargetColumn(e.target.value)}
              className="w-full md:w-96 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              {selectedDataset.columns.map(col => (
                <option key={col} value={col}>
                  {col} {numericColumns.includes(col) ? '✓ (numeric)' : '⚠️ (may not be numeric)'}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Choose a numeric column to predict. For best results, select a column with numerical values like "Building ID", "Year", or "Energy Score".
            </p>
          </div>
        )}

        {/* Action Buttons for selected dataset */}
        {selectedDataset && (
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={handleGeneratePredictions}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Target className="h-4 w-4" />
              Generate Predictions
            </button>
            <button
              onClick={handleGenerateRecommendations}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Lightbulb className="h-4 w-4" />
              Get Recommendations
            </button>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('insights')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'insights'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Insights ({insights.length})
          </button>
          <button
            onClick={() => setActiveTab('predictions')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'predictions'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Predictions ({predictionCount})
          </button>
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'recommendations'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Recommendations ({recommendationCount})
          </button>
        </nav>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'insights' && (
        <>
          {insightTypes.length > 1 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filter by Type</h2>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Click to filter</span>
                </div>
              </div>
              
              {/* IMPROVED: Made this section scrollable with fixed height */}
              <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {insightTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setFilterType(type.id)}
                      className={`p-4 rounded-xl border transition-all duration-300 ${
                        filterType === type.id
                          ? 'border-blue-300 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <type.icon className={`h-5 w-5 ${
                          filterType === type.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
                        }`} />
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                          {type.count}
                        </span>
                      </div>
                      <h3 className="font-medium text-gray-900 dark:text-white mb-1">{type.label}</h3>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading insights...</p>
              </div>
            ) : !selectedDataset ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center">
                <Database className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No Dataset Selected
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Please upload or select a dataset to view insights
                </p>
              </div>
            ) : filteredInsights.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center">
                <Brain className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No Insights Found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Generate insights to see AI-powered analysis for this dataset
                </p>
                <button
                  onClick={handleGenerateInsights}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg"
                >
                  Generate Insights
                </button>
              </div>
            ) : (
              filteredInsights.map((insight) => {
                let description = 'No description available';
                
                if (typeof insight.content === 'object') {
                  if (insight.insight_type === 'prediction') {
                    description = 'Prediction results';
                  } else if (insight.insight_type === 'recommendation') {
                    description = 'Recommendation insights';
                  } else {
                    description = insight.content?.summary || 
                                insight.content?.description || 
                                'Insight content';
                  }
                } else if (typeof insight.content === 'string') {
                  try {
                    const parsed = JSON.parse(insight.content);
                    description = parsed?.summary || parsed?.description || 'Insight content';
                  } catch {
                    description = insight.content.slice(0, 200);
                  }
                }
                
                const processedInsight = {
                  id: insight.id,
                  title: insight.title || 'Untitled Insight',
                  description: description,
                  insight_type: insight.insight_type || 'ai_generated',
                  confidence_score: insight.confidence_score || 0.85,
                  priority: insight.priority || 'medium',
                  tags: insight.tags || [],
                  created_at: insight.created_at || new Date().toISOString()
                };
                
                return (
                  <InsightCard
                    key={processedInsight.id}
                    insight={processedInsight}
                    onAction={(action, data) => {
                      if (action === 'bookmark') handleBookmark(data.id);
                      if (action === 'like') handleLike(data.id);
                    }}
                  />
                );
              })
            )}
          </div>
        </>
      )}

      {activeTab === 'predictions' && (
        <PredictionsDisplay 
          predictions={predictions} 
          loading={loading}
        />
      )}

      {activeTab === 'recommendations' && (
        <RecommendationsPanel
          recommendations={recommendations}
          loading={loading}
          hasRecommendationInsight={insights.some(i => i.insight_type === 'recommendation')}
        />
      )}

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        
        .dark .custom-scrollbar::-webkit-scrollbar-track {
          background: #1f2937;
        }
        
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #4b5563;
        }
        
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
      `}</style>
    </div>
  );
}