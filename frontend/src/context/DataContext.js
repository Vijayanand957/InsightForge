'use client';

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'react-hot-toast';
import { requestQueue } from '@/lib/requestQueue';
import { analyticsAPI, insightsAPI } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const DataContext = createContext({
  datasets: [],
  currentDataset: null,
  analyses: [],
  insights: [],
  storageStats: { totalBytes: 0, totalMB: 0, totalGB: 0 },
  isLoading: false,
  uploadDataset: async () => {},
  fetchDatasets: async () => {},
  fetchDataset: async () => {},
  deleteDataset: async () => {},
  runAnalysis: async () => {},
  generateInsights: async () => {},
  setCurrentDataset: () => {},
});

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

export function DataProvider({ children }) {
  const { token, fetchWithAuth, user } = useAuth();
  const [datasets, setDatasets] = useState([]);
  const [currentDataset, setCurrentDataset] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [insights, setInsights] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const fetchingRef = useRef(false);
  const initialFetchDone = useRef(false);

  // Calculate storage stats whenever datasets change
  const storageStats = {
    totalBytes: datasets.reduce((sum, dataset) => sum + (dataset.file_size || 0), 0),
    totalMB: datasets.reduce((sum, dataset) => sum + (dataset.file_size || 0), 0) / (1024 * 1024),
    totalGB: datasets.reduce((sum, dataset) => sum + (dataset.file_size || 0), 0) / (1024 * 1024 * 1024)
  };

  // Fetch datasets when user is authenticated
  useEffect(() => {
    if (user && !initialFetchDone.current) {
      fetchDatasets();
      initialFetchDone.current = true;
    }
  }, [user]);

  // Function to fetch insights for all datasets
  const fetchAllInsights = useCallback(async (datasetsList) => {
    if (!datasetsList || datasetsList.length === 0) return [];
    
    try {
      const allInsights = [];
      
      // Fetch insights for each dataset in parallel (limit to 3 concurrent)
      const batchSize = 3;
      for (let i = 0; i < datasetsList.length; i += batchSize) {
        const batch = datasetsList.slice(i, i + batchSize);
        const batchPromises = batch.map(dataset => 
          requestQueue.add(`insights-${dataset.id}`, async () => {
            try {
              const result = await insightsAPI.listInsights(dataset.id);
              // Handle both array and object responses
              if (Array.isArray(result)) {
                return result;
              } else if (result && typeof result === 'object') {
                return result.insights || [];
              }
              return [];
            } catch (error) {
              // Silently fail - no insights yet
              return [];
            }
          })
        );
        
        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(result => {
          if (Array.isArray(result)) {
            allInsights.push(...result);
          }
        });
      }
      
      return allInsights;
    } catch (error) {
      console.error('Error fetching all insights:', error);
      return [];
    }
  }, []);

  // Function to fetch analyses for all datasets
  const fetchAllAnalyses = useCallback(async (datasetsList) => {
    if (!datasetsList || datasetsList.length === 0) return [];
    
    try {
      const allAnalyses = [];
      
      // Fetch analyses for each dataset in parallel
      const batchSize = 3;
      for (let i = 0; i < datasetsList.length; i += batchSize) {
        const batch = datasetsList.slice(i, i + batchSize);
        const batchPromises = batch.map(dataset => 
          requestQueue.add(`analyses-${dataset.id}`, async () => {
            try {
              const result = await analyticsAPI.listAnalyses(dataset.id);
              if (Array.isArray(result)) {
                return result;
              }
              return [];
            } catch (error) {
              // Silently fail - no analyses yet
              return [];
            }
          })
        );
        
        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(result => {
          if (Array.isArray(result)) {
            allAnalyses.push(...result);
          }
        });
      }
      
      return allAnalyses;
    } catch (error) {
      console.error('Error fetching all analyses:', error);
      return [];
    }
  }, []);

  const fetchDatasets = useCallback(async (forceRefresh = false) => {
    if (!user) {
      return { success: false, error: 'No user' };
    }

    if (fetchingRef.current && !forceRefresh) {
      return { success: false, error: 'Fetch already in progress' };
    }

    fetchingRef.current = true;
    setIsLoading(true);

    try {
      const data = await requestQueue.add('datasets', async () => {
        return await fetchWithAuth('/data/datasets');
      });

      if (data && Array.isArray(data)) {
        setDatasets(data);
        
        // After getting datasets, fetch all insights and analyses
        const [allInsights, allAnalyses] = await Promise.all([
          fetchAllInsights(data),
          fetchAllAnalyses(data)
        ]);
        
        setInsights(allInsights);
        setAnalyses(allAnalyses);
        
        return { success: true, data };
      }
      return { success: false, error: 'No data received' };
    } catch (error) {
      const message = error.detail || error.message || 'Failed to fetch datasets.';
      console.error('Fetch datasets error:', error);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [fetchWithAuth, user, fetchAllInsights, fetchAllAnalyses]);

  const uploadDataset = useCallback(async (file, metadata = {}) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      if (metadata.name) {
        formData.append('name', metadata.name);
      }
      if (metadata.description) {
        formData.append('description', metadata.description);
      }

      const response = await fetch(`${API_URL}/data/upload`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Upload failed with status ${response.status}`);
      }

      const newDataset = await response.json();
      setDatasets(prev => [newDataset, ...prev]);
      setCurrentDataset(newDataset);
      
      // Clear cache for datasets
      requestQueue.clearCache('datasets');
      
      toast.success(`Dataset "${file.name}" uploaded successfully!`);
      return { success: true, data: newDataset };
    } catch (error) {
      const message = error.message || 'Failed to upload dataset.';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const fetchDataset = useCallback(async (datasetId) => {
    setIsLoading(true);
    try {
      const dataset = await fetchWithAuth(`/data/datasets/${datasetId}`);
      setCurrentDataset(dataset);
      
      // Fetch analyses and insights for this specific dataset
      const [analysesData, insightsData] = await Promise.all([
        requestQueue.add(`analyses-${datasetId}`, () => 
          analyticsAPI.listAnalyses(datasetId).catch(() => [])
        ),
        requestQueue.add(`insights-${datasetId}`, () => 
          insightsAPI.listInsights(datasetId).catch(() => [])
        )
      ]);
      
      // Update the global lists
      if (analysesData && Array.isArray(analysesData)) {
        setAnalyses(prev => {
          const filtered = prev.filter(a => a.dataset_id !== datasetId);
          return [...filtered, ...analysesData];
        });
      }
      
      if (insightsData && Array.isArray(insightsData)) {
        setInsights(prev => {
          const filtered = prev.filter(i => i.dataset_id !== datasetId);
          return [...filtered, ...insightsData];
        });
      }
      
      return { 
        success: true, 
        data: {
          dataset,
          analyses: analysesData || [],
          insights: insightsData || [],
        }
      };
    } catch (error) {
      const message = error.detail || error.message || 'Failed to fetch dataset details.';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [fetchWithAuth]);

  const deleteDataset = useCallback(async (datasetId) => {
    setIsLoading(true);
    try {
      await fetchWithAuth(`/data/datasets/${datasetId}`, {
        method: 'DELETE'
      });
      
      setDatasets(prev => prev.filter(dataset => dataset.id !== datasetId));
      setAnalyses(prev => prev.filter(a => a.dataset_id !== datasetId));
      setInsights(prev => prev.filter(i => i.dataset_id !== datasetId));
      
      if (currentDataset?.id === datasetId) {
        setCurrentDataset(null);
      }
      
      // Clear cache
      requestQueue.clearCache('datasets');
      requestQueue.clearCache(`analyses-${datasetId}`);
      requestQueue.clearCache(`insights-${datasetId}`);
      
      toast.success('Dataset deleted successfully!');
      return { success: true };
    } catch (error) {
      const message = error.detail || error.message || 'Failed to delete dataset.';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [fetchWithAuth, currentDataset]);

  const runAnalysis = useCallback(async (datasetId, analysisType, parameters = {}) => {
    setIsLoading(true);
    try {
      let endpoint;
      let payload;
      
      switch (analysisType) {
        case 'descriptive':
          endpoint = '/analytics/descriptive';
          payload = { dataset_id: datasetId, columns: parameters.columns || null };
          break;
        case 'correlation':
          endpoint = '/analytics/correlation';
          payload = { 
            dataset_id: datasetId, 
            columns: parameters.columns || [],
            method: parameters.method || 'pearson' 
          };
          break;
        case 'trend':
          endpoint = '/analytics/trend';
          payload = { 
            dataset_id: datasetId, 
            time_column: parameters.timeColumn,
            value_column: parameters.valueColumn,
            period: parameters.period || 'daily'
          };
          break;
        default:
          throw new Error('Unsupported analysis type');
      }

      const newAnalysis = await requestQueue.add(`analysis-${datasetId}-${analysisType}`, async () => {
        return await fetchWithAuth(endpoint, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      });
      
      setAnalyses(prev => [newAnalysis, ...prev]);
      toast.success(`${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)} analysis completed!`);
      return { success: true, data: newAnalysis };
    } catch (error) {
      const message = error.detail || error.message || `Failed to run ${analysisType} analysis.`;
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [fetchWithAuth]);

  const generateInsights = useCallback(async (datasetId, focusAreas = [], businessContext = '') => {
    setIsLoading(true);
    try {
      const newInsight = await requestQueue.add(`insights-${datasetId}-generate`, async () => {
        return await fetchWithAuth('/insights/generate', {
          method: 'POST',
          body: JSON.stringify({
            dataset_id: datasetId,
            focus_areas: focusAreas,
            business_context: businessContext,
          })
        });
      });

      setInsights(prev => [newInsight, ...prev]);
      toast.success('AI insights generated successfully!');
      return { success: true, data: newInsight };
    } catch (error) {
      const message = error.detail || error.message || 'Failed to generate insights.';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [fetchWithAuth]);

  const refreshInsights = useCallback(async () => {
    if (datasets.length > 0) {
      const allInsights = await fetchAllInsights(datasets);
      setInsights(allInsights);
    }
  }, [datasets, fetchAllInsights]);

  const refreshAnalyses = useCallback(async () => {
    if (datasets.length > 0) {
      const allAnalyses = await fetchAllAnalyses(datasets);
      setAnalyses(allAnalyses);
    }
  }, [datasets, fetchAllAnalyses]);

  const value = {
    datasets,
    currentDataset,
    analyses,
    insights,
    storageStats,
    isLoading,
    uploadDataset,
    fetchDatasets,
    fetchDataset,
    deleteDataset,
    runAnalysis,
    generateInsights,
    refreshInsights,
    refreshAnalyses,
    setCurrentDataset,
    setAnalyses,
    setInsights,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export default DataContext;