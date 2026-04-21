'use client';

import { useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export function useAnalytics() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analyticsResults, setAnalyticsResults] = useState({});

  const runDescriptiveAnalysis = useCallback(async (datasetId, columns = null) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_URL}/analytics/descriptive`, {
        dataset_id: datasetId,
        columns,
      });

      const result = response.data;
      setAnalyticsResults(prev => ({
        ...prev,
        [datasetId]: {
          ...prev[datasetId],
          descriptive: result,
        },
      }));

      return { success: true, data: result };
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to run descriptive analysis.';
      setError(message);
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const runCorrelationAnalysis = useCallback(async (datasetId, columns, method = 'pearson') => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_URL}/analytics/correlation`, {
        dataset_id: datasetId,
        columns,
        method,
      });

      const result = response.data;
      setAnalyticsResults(prev => ({
        ...prev,
        [datasetId]: {
          ...prev[datasetId],
          correlation: result,
        },
      }));

      return { success: true, data: result };
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to run correlation analysis.';
      setError(message);
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const runTrendAnalysis = useCallback(async (datasetId, timeColumn, valueColumn, period = 'daily') => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_URL}/analytics/trend`, {
        dataset_id: datasetId,
        time_column: timeColumn,
        value_column: valueColumn,
        period,
      });

      const result = response.data;
      setAnalyticsResults(prev => ({
        ...prev,
        [datasetId]: {
          ...prev[datasetId],
          trend: result,
        },
      }));

      return { success: true, data: result };
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to run trend analysis.';
      setError(message);
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createVisualization = useCallback(async (datasetId, chartType, options = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_URL}/analytics/visualize`, {
        dataset_id: datasetId,
        chart_type: chartType,
        ...options,
      });

      const result = response.data;
      setAnalyticsResults(prev => ({
        ...prev,
        [datasetId]: {
          ...prev[datasetId],
          [chartType]: result,
        },
      }));

      return { success: true, data: result };
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to create visualization.';
      setError(message);
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearResults = useCallback((datasetId) => {
    setAnalyticsResults(prev => {
      const newResults = { ...prev };
      delete newResults[datasetId];
      return newResults;
    });
  }, []);

  return {
    isLoading,
    error,
    analyticsResults,
    runDescriptiveAnalysis,
    runCorrelationAnalysis,
    runTrendAnalysis,
    createVisualization,
    clearResults,
  };
}