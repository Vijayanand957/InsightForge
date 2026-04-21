'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Clock,
  Zap,
  Shield,
  DollarSign,
  Users,
  BarChart3,
  Filter,
  Download,
  Share2,
  ChevronDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  Lightbulb,
  ArrowRight,
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import { actionsAPI } from '@/lib/api';

const RecommendationsPanel = ({ 
  recommendations = [],
  filters = {},
  onFilterChange,
  loading = false,
  hasRecommendationInsight = false,
  onUpdate
}) => {
  const [selectedFilters, setSelectedFilters] = useState({
    impact: 'all',
    effort: 'all',
    timeframe: 'all',
    status: 'all',
    ...filters
  });

  const [expandedId, setExpandedId] = useState(null);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [currentRecommendation, setCurrentRecommendation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const filterOptions = {
    impact: [
      { value: 'all', label: 'All Impact Levels' },
      { value: 'high', label: 'High Impact', color: 'bg-red-500' },
      { value: 'medium', label: 'Medium Impact', color: 'bg-yellow-500' },
      { value: 'low', label: 'Low Impact', color: 'bg-green-500' }
    ],
    effort: [
      { value: 'all', label: 'All Effort Levels' },
      { value: 'high', label: 'High Effort', icon: <TrendingUp className="h-4 w-4" /> },
      { value: 'medium', label: 'Medium Effort', icon: <TrendingUp className="h-4 w-4" /> },
      { value: 'low', label: 'Low Effort', icon: <TrendingDown className="h-4 w-4" /> }
    ],
    timeframe: [
      { value: 'all', label: 'All Timeframes' },
      { value: 'short_term', label: 'Short-term (< 1 month)', icon: <Zap className="h-4 w-4" /> },
      { value: 'medium_term', label: 'Medium-term (1-3 months)', icon: <Clock className="h-4 w-4" /> },
      { value: 'long_term', label: 'Long-term (> 3 months)', icon: <Target className="h-4 w-4" /> }
    ],
    status: [
      { value: 'all', label: 'All Statuses' },
      { value: 'pending', label: 'Pending', color: 'bg-yellow-500' },
      { value: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
      { value: 'completed', label: 'Completed', color: 'bg-green-500' },
      { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-500' }
    ]
  };

  const getImpactColor = (impact) => {
    switch (impact?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getEffortColor = (effort) => {
    switch (effort?.toLowerCase()) {
      case 'high': return 'text-red-600 dark:text-red-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'low': return 'text-green-600 dark:text-green-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in_progress': return <AlertCircle className="h-5 w-5 text-blue-500" />;
      case 'cancelled': return <XCircle className="h-5 w-5 text-gray-500" />;
      default: return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getCategoryIcon = (category) => {
    switch (category?.toLowerCase()) {
      case 'marketing': return <TrendingUp className="h-4 w-4" />;
      case 'operations': return <Shield className="h-4 w-4" />;
      case 'customer_service': return <Users className="h-4 w-4" />;
      case 'analytics': return <BarChart3 className="h-4 w-4" />;
      case 'finance': return <DollarSign className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  const handleFilterChange = (filterType, value) => {
    const newFilters = { ...selectedFilters, [filterType]: value };
    setSelectedFilters(newFilters);
    
    if (onFilterChange) {
      onFilterChange(newFilters);
    }
  };

  const handleImplement = async (recommendation) => {
    if (!recommendation.id && !recommendation.insight_id) {
      toast.error('Cannot implement: No recommendation ID');
      return;
    }

    setIsLoading(true);
    try {
      // For recommendations, we need to create a temporary insight ID or use a separate endpoint
      // This assumes you have an insight_id associated with the recommendation
      if (recommendation.insight_id) {
        await actionsAPI.implement(recommendation.insight_id);
        toast.success('Recommendation marked as implemented!');
      } else {
        // If no insight_id, store in localStorage
        const implemented = JSON.parse(localStorage.getItem('implemented_recommendations') || '[]');
        implemented.push({
          ...recommendation,
          implementedAt: new Date().toISOString()
        });
        localStorage.setItem('implemented_recommendations', JSON.stringify(implemented));
        toast.success('Recommendation implementation tracked locally');
      }
      
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Implement error:', error);
      toast.error('Failed to implement recommendation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!currentRecommendation) {
      toast.error('No recommendation selected');
      return;
    }

    if (!scheduleDate) {
      toast.error('Please select a date');
      return;
    }

    const scheduledFor = `${scheduleDate}T${scheduleTime}:00`;
    setIsLoading(true);
    
    try {
      if (currentRecommendation.insight_id) {
        await actionsAPI.schedule(currentRecommendation.insight_id, scheduledFor);
        toast.success(`Scheduled for ${new Date(scheduledFor).toLocaleString()}`);
      } else {
        // Store in localStorage as fallback
        const scheduledItems = JSON.parse(localStorage.getItem('scheduled_recommendations') || '[]');
        scheduledItems.push({
          ...currentRecommendation,
          scheduledFor,
          createdAt: new Date().toISOString()
        });
        localStorage.setItem('scheduled_recommendations', JSON.stringify(scheduledItems));
        toast.success(`Scheduled locally for ${new Date(scheduledFor).toLocaleString()}`);
      }
      
      setShowSchedulePicker(false);
      setCurrentRecommendation(null);
      setScheduleDate('');
      setScheduleTime('09:00');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Schedule error:', error);
      toast.error('Failed to schedule');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = async (recommendation) => {
    if (!window.confirm('Are you sure you want to dismiss this recommendation? It will be hidden from your view.')) {
      return;
    }

    setIsLoading(true);
    try {
      if (recommendation.insight_id) {
        await actionsAPI.dismiss(recommendation.insight_id);
        toast.success('Recommendation dismissed');
      } else {
        // Store dismissed IDs in localStorage
        const dismissed = JSON.parse(localStorage.getItem('dismissed_recommendations') || '[]');
        dismissed.push(recommendation.id || Date.now());
        localStorage.setItem('dismissed_recommendations', JSON.stringify(dismissed));
        toast.success('Recommendation dismissed locally');
      }
      
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Dismiss error:', error);
      toast.error('Failed to dismiss recommendation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    if (recommendations.length === 0) {
      toast.error('No recommendations to export');
      return;
    }
    
    try {
      const dataStr = JSON.stringify(recommendations, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recommendations-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Recommendations exported successfully');
    } catch (error) {
      toast.error('Failed to export recommendations');
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Recommendations link copied to clipboard');
  };

  // Apply filters to recommendations - FIXED: use recommendations directly
  const filteredRecommendations = recommendations.filter(rec => {
    return (
      (selectedFilters.impact === 'all' || rec.impact === selectedFilters.impact) &&
      (selectedFilters.effort === 'all' || rec.effort === selectedFilters.effort) &&
      (selectedFilters.timeframe === 'all' || rec.timeframe === selectedFilters.timeframe) &&
      (selectedFilters.status === 'all' || rec.status === selectedFilters.status)
    );
  });

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Unknown date';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-lg bg-gradient-to-r from-primary-500 to-purple-500">
              <Target className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                AI Recommendations
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {filteredRecommendations.length} actionable recommendation{filteredRecommendations.length !== 1 ? 's' : ''} based on your data
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleExport}
              disabled={recommendations.length === 0 || isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
            <button
              onClick={handleShare}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters - Only show if there are recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Filter Recommendations
            </h3>
            <Filter className="h-5 w-5 text-gray-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(filterOptions).map(([filterType, options], filterIndex) => (
              <div key={`filter-${filterType}-${filterIndex}`}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 capitalize">
                  {filterType.replace('_', ' ')}
                </label>
                <select
                  value={selectedFilters[filterType]}
                  onChange={(e) => handleFilterChange(filterType, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  {options.map((option, optionIndex) => (
                    <option key={`filter-${filterType}-option-${option.value}-${optionIndex}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schedule Picker Modal */}
      {showSchedulePicker && currentRecommendation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Schedule Recommendation
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {currentRecommendation.title || 'Untitled Recommendation'}
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowSchedulePicker(false);
                  setCurrentRecommendation(null);
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSchedule}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading ? 'Scheduling...' : 'Schedule'}
                {!isLoading && <Calendar className="h-4 w-4" />}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Recommendations Grid */}
      <div className="space-y-4">
        {loading ? (
          // Loading Skeleton
          Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`skeleton-${index}-${Date.now()}`}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6 animate-pulse"
            >
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                <div className="flex gap-2">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                </div>
              </div>
            </div>
          ))
        ) : recommendations.length === 0 ? (
          // No Recommendations
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-12 text-center">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {hasRecommendationInsight 
                ? 'No Actionable Recommendations'
                : 'No Recommendations Found'
              }
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {hasRecommendationInsight
                ? 'A recommendation insight exists but contains no actionable items. Try generating new recommendations.'
                : 'Click "Get Recommendations" to generate AI-powered suggestions based on your data.'
              }
            </p>
          </div>
        ) : filteredRecommendations.length === 0 ? (
          // Filtered out all recommendations
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-12 text-center">
            <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No Matching Recommendations
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Try adjusting your filters to see more recommendations
            </p>
            <button
              onClick={() => {
                setSelectedFilters({
                  impact: 'all',
                  effort: 'all',
                  timeframe: 'all',
                  status: 'all'
                });
                if (onFilterChange) {
                  onFilterChange({
                    impact: 'all',
                    effort: 'all',
                    timeframe: 'all',
                    status: 'all'
                  });
                }
              }}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          // Recommendations List
          filteredRecommendations.map((recommendation, index) => (
            <motion.div
              key={recommendation.id || `rec-${index}-${recommendation.title || 'untitled'}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-soft overflow-hidden"
            >
              {/* Recommendation Header */}
              <div
                className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                onClick={() => setExpandedId(expandedId === (recommendation.id || index) ? null : (recommendation.id || index))}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1 min-w-0">
                    <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
                      {getCategoryIcon(recommendation.category)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 break-words">
                          {recommendation.title || 'Untitled Recommendation'}
                        </h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getImpactColor(recommendation.impact)}`}>
                            {recommendation.impact || 'medium'} Impact
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEffortColor(recommendation.effort)} bg-opacity-10`}>
                            {recommendation.effort || 'medium'} Effort
                          </span>
                          {getStatusIcon(recommendation.status)}
                        </div>
                      </div>
                      
                      <p className="text-gray-600 dark:text-gray-400 mb-3 break-words line-clamp-3">
                        {recommendation.description || 'No description available'}
                      </p>
                      
                      <div className="flex items-center flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                        {recommendation.estimatedValue && (
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate">Est. value: {recommendation.estimatedValue}</span>
                          </div>
                        )}
                        {recommendation.confidence && (
                          <div className="flex items-center space-x-1">
                            <Target className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="whitespace-nowrap">{Math.round(recommendation.confidence * 100)}% confidence</span>
                          </div>
                        )}
                        {recommendation.timeframe && (
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="whitespace-nowrap">{recommendation.timeframe.replace('_', ' ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <ChevronDown
                    className={`h-5 w-5 text-gray-400 transition-transform flex-shrink-0 ${
                      expandedId === (recommendation.id || index) ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </div>
              
              {/* Expanded Content */}
              {expandedId === (recommendation.id || index) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-t border-gray-200 dark:border-gray-700"
                >
                  <div className="p-6">
                    {/* Metrics */}
                    {recommendation.metrics && Object.keys(recommendation.metrics).length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                          Expected Impact
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {Object.entries(recommendation.metrics).map(([key, value], metricIndex) => (
                            <div
                              key={`${recommendation.id || index}-metric-${key}-${metricIndex}`}
                              className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                            >
                              <div className="text-sm text-gray-600 dark:text-gray-400 capitalize break-words">
                                {key.replace(/([A-Z])/g, ' $1')}
                              </div>
                              <div className={`text-xl font-bold mt-1 break-words ${
                                typeof value === 'string' && value.startsWith('+')
                                  ? 'text-green-600 dark:text-green-400'
                                  : typeof value === 'string' && value.startsWith('-')
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-gray-900 dark:text-gray-100'
                              }`}>
                                {String(value)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Actions */}
                    {recommendation.actions && recommendation.actions.length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                          Implementation Steps
                        </h4>
                        <div className="space-y-2">
                          {recommendation.actions.map((action, actionIndex) => (
                            <div
                              key={`${recommendation.id || index}-action-${actionIndex}`}
                              className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                            >
                              <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-xs font-bold">{actionIndex + 1}</span>
                              </div>
                              <span className="text-gray-700 dark:text-gray-300 break-words">{action}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Dependencies */}
                    {recommendation.dependencies && recommendation.dependencies.length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                          Dependencies
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {recommendation.dependencies.map((dep, depIndex) => (
                            <span
                              key={`${recommendation.id || index}-dep-${depIndex}`}
                              className="inline-flex items-center px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                            >
                              <Shield className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="truncate max-w-[200px]">{dep}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {recommendation.createdAt && (
                          <>Created {formatDate(recommendation.createdAt)}</>
                        )}
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleImplement(recommendation)}
                          disabled={isLoading}
                          className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                        >
                          {isLoading ? 'Processing...' : 'Implement'}
                          {!isLoading && <ArrowRight className="h-4 w-4" />}
                        </button>
                        <button 
                          onClick={() => {
                            setCurrentRecommendation(recommendation);
                            setShowSchedulePicker(true);
                          }}
                          disabled={isLoading}
                          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                        >
                          Schedule
                        </button>
                        <button 
                          onClick={() => handleDismiss(recommendation)}
                          disabled={isLoading}
                          className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-50"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default RecommendationsPanel;