'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  Clock,
  Tag,
  Users,
  Download,
  Share2,
  Bookmark,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Zap,
  Target,
  Lightbulb,
  Database,
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import { actionsAPI } from '@/lib/api';

const InsightCard = ({ 
  insight,
  expanded = false,
  onAction,
  onUpdate 
}) => {
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [isBookmarked, setIsBookmarked] = useState(insight.isBookmarked || false);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [isLoading, setIsLoading] = useState(false);

  const {
    id = `insight-${Date.now()}`,
    title = 'Untitled Insight',
    description = 'No description available',
    insight_type = 'ai_generated',
    confidence_score = 0.85,
    priority = 'medium',
    tags = [],
    created_at = new Date().toISOString(),
  } = insight || {};

  const getPriorityColor = () => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getTypeIcon = () => {
    switch (insight_type?.toLowerCase()) {
      case 'prediction': return <TrendingUp className="h-5 w-5" />;
      case 'recommendation': return <Target className="h-5 w-5" />;
      case 'anomaly': return <AlertCircle className="h-5 w-5" />;
      case 'trend': return <TrendingUp className="h-5 w-5" />;
      case 'ai_generated': return <Brain className="h-5 w-5" />;
      default: return <Brain className="h-5 w-5" />;
    }
  };

  const getTypeColor = () => {
    switch (insight_type?.toLowerCase()) {
      case 'prediction': return 'bg-blue-500';
      case 'recommendation': return 'bg-purple-500';
      case 'anomaly': return 'bg-red-500';
      case 'trend': return 'bg-green-500';
      case 'ai_generated': return 'bg-primary-500';
      default: return 'bg-primary-500';
    }
  };

  const formatTimeAgo = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return 'Recently';
    }
  };

  const handleImplement = async () => {
    setIsLoading(true);
    try {
      await actionsAPI.implement(id);
      toast.success('Insight marked as implemented!');
      if (onAction) onAction('implement', insight);
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Failed to mark as implemented');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSchedule = async () => {
  if (!scheduleDate) {
    toast.error('Please select a date');
    return;
  }

  const scheduledFor = `${scheduleDate}T${scheduleTime}:00`;
  setIsLoading(true);
  
  try {
    const response = await actionsAPI.schedule(id, scheduledFor);
    
    if (response && response.fallback) {
      toast.success(`Scheduled locally for ${new Date(scheduledFor).toLocaleString()}`);
    } else {
      toast.success(`Scheduled for ${new Date(scheduledFor).toLocaleString()}`);
    }
    
    setShowSchedulePicker(false);
    setScheduleDate('');
    setScheduleTime('09:00');
    if (onAction) onAction('schedule', { id, scheduledFor });
    if (onUpdate) onUpdate();
  } catch (error) {
    console.error('Schedule error:', error);
    toast.error('Failed to schedule. Saved locally instead.');
    
    // Even on error, save locally
    const scheduledItems = JSON.parse(localStorage.getItem('scheduled_items') || '[]');
    scheduledItems.push({
      insight_id: id,
      scheduled_for: scheduledFor,
      created_at: new Date().toISOString()
    });
    localStorage.setItem('scheduled_items', JSON.stringify(scheduledItems));
    
    setShowSchedulePicker(false);
  } finally {
    setIsLoading(false);
  }
};
  const handleDismiss = async () => {
    if (!window.confirm('Are you sure you want to dismiss this insight?')) {
      return;
    }

    setIsLoading(true);
    try {
      await actionsAPI.dismiss(id);
      toast.success('Insight dismissed');
      if (onAction) onAction('dismiss', insight);
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Failed to dismiss');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookmark = async () => {
    setIsBookmarked(!isBookmarked);
    toast.success(isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks');
    if (onAction) onAction('bookmark', { id, bookmarked: !isBookmarked });
  };

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/insights/${id}`);
    toast.success('Link copied to clipboard');
  };

  const handleDownload = () => {
    try {
      const dataStr = JSON.stringify(insight, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `insight-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Insight downloaded');
    } catch (error) {
      toast.error('Download failed');
    }
  };

  const confidencePercentage = Math.round((confidence_score || 0.85) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-soft overflow-hidden border border-gray-200 dark:border-gray-700"
    >
      {/* Card Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1 min-w-0">
            {/* Type Icon */}
            <div className={`p-3 rounded-lg ${getTypeColor()} bg-opacity-10 flex-shrink-0`}>
              <div className={getTypeColor().replace('bg-', 'text-')}>
                {getTypeIcon()}
              </div>
            </div>

            {/* Title and Metadata */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center flex-wrap gap-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 break-words">
                  {title}
                </h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor()} flex-shrink-0`}>
                  {priority}
                </span>
              </div>

              <div className="flex items-center flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-1">
                  <Users className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">AI Assistant</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="whitespace-nowrap">{formatTimeAgo(created_at)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="whitespace-nowrap">{confidencePercentage}% confidence</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-1 flex-shrink-0">
            <button
              onClick={handleBookmark}
              disabled={isLoading}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
            >
              <Bookmark
                className={`h-5 w-5 ${
                  isBookmarked
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-400'
                }`}
              />
            </button>
            <button
              onClick={handleShare}
              disabled={isLoading}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              title="Share"
            >
              <Share2 className="h-5 w-5 text-gray-400" />
            </button>
            <button
              onClick={handleDownload}
              disabled={isLoading}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              title="Download"
            >
              <Download className="h-5 w-5 text-gray-400" />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                <Tag className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate max-w-[150px]">{typeof tag === 'string' ? tag : String(tag)}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Description */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <p className="text-gray-700 dark:text-gray-300 break-words line-clamp-3">
          {description}
        </p>
      </div>

      {/* Schedule Picker (when showSchedulePicker is true) */}
      {showSchedulePicker && (
        <div className="p-4 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date
              </label>
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Time
              </label>
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>
            <div className="flex items-center gap-2 mt-5">
              <button
                onClick={handleSchedule}
                disabled={isLoading}
                className="px-4 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowSchedulePicker(false)}
                className="px-4 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card Footer */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleImplement}
              disabled={isLoading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors text-sm disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : 'Implement'}
            </button>
            <button
              onClick={() => setShowSchedulePicker(true)}
              disabled={isLoading || showSchedulePicker}
              className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-sm disabled:opacity-50"
            >
              Schedule
            </button>
            <button
              onClick={handleDismiss}
              disabled={isLoading}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 text-sm disabled:opacity-50"
            >
              Dismiss
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ID: {String(id).slice(0, 8)}
            </span>
            <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
              <MoreVertical className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default InsightCard;