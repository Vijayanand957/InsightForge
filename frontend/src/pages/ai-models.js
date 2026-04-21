'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  Target,
  TrendingUp,
  TrendingDown,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  Zap,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  Download,
  Play,
  Pause,
  Settings,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

export default function AIModelsPage() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState({});

  const modelCategories = [
    { id: 'all', label: 'All Models', icon: <Brain className="h-4 w-4" /> },
    { id: 'regression', label: 'Regression', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'classification', label: 'Classification', icon: <Target className="h-4 w-4" /> },
    { id: 'clustering', label: 'Clustering', icon: <PieChart className="h-4 w-4" /> },
    { id: 'forecasting', label: 'Forecasting', icon: <LineChart className="h-4 w-4" /> }
  ];

  const models = [
    {
      id: 'linear-regression',
      name: 'Linear Regression',
      category: 'regression',
      description: 'Simple and interpretable model for predicting continuous values.',
      capabilities: [
        'Predict numerical outcomes',
        'Feature importance analysis',
        'Confidence intervals',
        'Handles linear relationships'
      ],
      accuracy: 0.85,
      speed: 'Fast',
      useCases: ['Sales forecasting', 'Price prediction', 'Trend analysis'],
      icon: <TrendingUp className="h-6 w-6" />,
      color: 'from-blue-500 to-cyan-500',
      status: 'production'
    },
    {
      id: 'random-forest',
      name: 'Random Forest',
      category: 'regression',
      description: 'Ensemble learning method for classification and regression.',
      capabilities: [
        'Handles non-linear relationships',
        'Feature importance ranking',
        'Robust to outliers',
        'Parallel training'
      ],
      accuracy: 0.92,
      speed: 'Medium',
      useCases: ['Customer churn', 'Risk assessment', 'Pattern recognition'],
      icon: <BarChart3 className="h-6 w-6" />,
      color: 'from-purple-500 to-pink-500',
      status: 'production'
    },
    {
      id: 'logistic-regression',
      name: 'Logistic Regression',
      category: 'classification',
      description: 'Binary and multi-class classification with probability outputs.',
      capabilities: [
        'Probability predictions',
        'Feature coefficients',
        'Handles binary/multi-class',
        'Regularization options'
      ],
      accuracy: 0.88,
      speed: 'Fast',
      useCases: ['Customer churn', 'Fraud detection', 'Medical diagnosis'],
      icon: <Target className="h-6 w-6" />,
      color: 'from-green-500 to-emerald-500',
      status: 'production'
    },
    {
      id: 'kmeans',
      name: 'K-Means Clustering',
      category: 'clustering',
      description: 'Unsupervised learning for grouping similar data points.',
      capabilities: [
        'Automatic cluster detection',
        'Scalable to large datasets',
        'Cluster visualization',
        'Centroid analysis'
      ],
      accuracy: 0.82,
      speed: 'Fast',
      useCases: ['Customer segmentation', 'Image compression', 'Anomaly detection'],
      icon: <PieChart className="h-6 w-6" />,
      color: 'from-orange-500 to-red-500',
      status: 'beta'
    },
    {
      id: 'arima',
      name: 'ARIMA',
      category: 'forecasting',
      description: 'Time series forecasting with trend and seasonality.',
      capabilities: [
        'Seasonal decomposition',
        'Trend analysis',
        'Confidence intervals',
        'Auto-correlation detection'
      ],
      accuracy: 0.87,
      speed: 'Medium',
      useCases: ['Stock market', 'Demand forecasting', 'Weather prediction'],
      icon: <LineChart className="h-6 w-6" />,
      color: 'from-indigo-500 to-purple-500',
      status: 'beta'
    },
    {
      id: 'svm',
      name: 'Support Vector Machine',
      category: 'classification',
      description: 'Powerful classifier for complex decision boundaries.',
      capabilities: [
        'Handles high-dimensional data',
        'Kernel functions',
        'Margin optimization',
        'Outlier detection'
      ],
      accuracy: 0.91,
      speed: 'Slow',
      useCases: ['Image classification', 'Text categorization', 'Bioinformatics'],
      icon: <Activity className="h-6 w-6" />,
      color: 'from-yellow-500 to-orange-500',
      status: 'development'
    }
  ];

  const filteredModels = selectedCategory === 'all'
    ? models
    : models.filter(m => m.category === selectedCategory);

  const handleTrainModel = (modelId) => {
    setLoading(prev => ({ ...prev, [modelId]: true }));
    
    // Simulate training
    setTimeout(() => {
      setLoading(prev => ({ ...prev, [modelId]: false }));
      toast.success(`Model ${modelId} training started!`);
    }, 2000);
  };

  const handleDeployModel = (modelId) => {
    toast.success(`Model ${modelId} deployed successfully!`);
  };

  return (
    <div className="space-y-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Models</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Pre-trained and customizable machine learning models for your data
          </p>
        </div>

        {user && (
          <Link
            href="/models/new"
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2"
          >
            <Brain className="h-4 w-4" />
            Train Custom Model
          </Link>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {modelCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              selectedCategory === category.id
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {category.icon}
            {category.label}
          </button>
        ))}
      </div>

      {/* Models Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredModels.map((model) => (
          <motion.div
            key={model.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft border border-gray-200 dark:border-gray-700 overflow-hidden group"
          >
            <div className={`h-2 bg-gradient-to-r ${model.color}`} />
            
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${model.color} bg-opacity-10 flex items-center justify-center`}>
                  <div className={`text-transparent bg-clip-text bg-gradient-to-r ${model.color}`}>
                    {model.icon}
                  </div>
                </div>
                
                <span className={`px-2 py-1 text-xs rounded-full ${
                  model.status === 'production' 
                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                    : model.status === 'beta'
                    ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                    : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                }`}>
                  {model.status}
                </span>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {model.name}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                {model.description}
              </p>

              {/* Capabilities */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Capabilities:</h4>
                <ul className="space-y-1">
                  {model.capabilities.map((cap, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{cap}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="text-center">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {(model.accuracy * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Accuracy</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {model.speed}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Speed</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {model.useCases.length}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Use Cases</div>
                </div>
              </div>

              {/* Use Cases */}
              <div className="mb-4">
                <div className="flex flex-wrap gap-1">
                  {model.useCases.map((useCase, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full"
                    >
                      {useCase}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {user ? (
                  <>
                    <button
                      onClick={() => handleTrainModel(model.id)}
                      disabled={loading[model.id]}
                      className="flex-1 px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading[model.id] ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Training...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Train
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDeployModel(model.id)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Zap className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="w-full px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:shadow-lg text-center"
                  >
                    Login to Use
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Documentation Section */}
      <section className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-8 text-white">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-3">Want to learn more?</h2>
            <p className="text-gray-300 mb-4">
              Check out our comprehensive model documentation, including API references, 
              training guides, and best practices.
            </p>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              Read Documentation
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">6</div>
            <div className="text-gray-300">Pre-trained Models</div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Missing icon component
function BookOpen(props) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}