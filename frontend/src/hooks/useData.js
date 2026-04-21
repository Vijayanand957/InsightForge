'use client';

import { useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export function useDataOperations() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadFile = useCallback(async (file, datasetName = null, description = null) => {
    setIsLoading(true);
    setError(null);
    setUploadProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      if (datasetName) {
        formData.append('name', datasetName);
      }
      if (description) {
        formData.append('description', description);
      }

      const response = await axios.post(`${API_URL}/data/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        },
      });

      toast.success(`File "${file.name}" uploaded successfully!`);
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to upload file. Please try again.';
      setError(message);
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  }, []);

  const fetchDatasetMetadata = useCallback(async (datasetId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`${API_URL}/data/datasets/${datasetId}`);
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to fetch dataset metadata.';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchDatasetPreview = useCallback(async (datasetId, limit = 50) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`${API_URL}/data/datasets/${datasetId}/preview`, {
        params: { limit }
      });
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to fetch dataset preview.';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteDatasetFile = useCallback(async (datasetId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await axios.delete(`${API_URL}/data/datasets/${datasetId}`);
      toast.success('Dataset deleted successfully!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to delete dataset.';
      setError(message);
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const exportDataset = useCallback(async (datasetId, format = 'csv', includeAnalysis = false) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_URL}/data/export`, {
        dataset_id: datasetId,
        format,
        include_analysis: includeAnalysis,
      });

      toast.success(`Dataset exported as ${format.toUpperCase()} successfully!`);
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to export dataset.';
      setError(message);
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const validateFile = (file) => {
    const allowedTypes = ['text/csv', 'application/json', 'application/vnd.ms-excel', 
                         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    const allowedExtensions = ['.csv', '.json', '.xls', '.xlsx'];
    
    if (!file) {
      return { valid: false, error: 'No file selected' };
    }
    
    const fileExtension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      return { 
        valid: false, 
        error: `Invalid file type. Allowed types: ${allowedExtensions.join(', ')}` 
      };
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return { valid: false, error: 'File size exceeds 10MB limit' };
    }
    
    return { valid: true, error: null };
  };

  return {
    isLoading,
    error,
    uploadProgress,
    uploadFile,
    fetchDatasetMetadata,
    fetchDatasetPreview,
    deleteDatasetFile,
    exportDataset,
    validateFile,
  };
}