'use client';

import { useState } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

export default function CorrelationChart({ data }) {
  const [selectedPair, setSelectedPair] = useState(null);

  if (!data || !data.correlation_matrix) {
    return <div className="text-gray-500">No correlation data available</div>;
  }

  const columns = data.columns_analyzed || Object.keys(data.correlation_matrix);
  
  // Prepare correlation matrix as heatmap data
  const heatmapData = [];
  columns.forEach((col1, i) => {
    columns.forEach((col2, j) => {
      heatmapData.push({
        x: i,
        y: j,
        value: data.correlation_matrix[col1]?.[col2] || 0,
        col1,
        col2
      });
    });
  });

  // Prepare scatter plots for significant correlations
  const significantPairs = data.significant_correlations || [];

  const getColorForCorrelation = (value) => {
    const r = value > 0 ? 255 : 100;
    const g = 100;
    const b = value < 0 ? 255 : 100;
    const opacity = Math.abs(value) * 0.7 + 0.3;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  return (
    <div className="space-y-8">
      {/* Correlation Matrix Heatmap */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Correlation Matrix
        </h3>
        <div className="overflow-x-auto">
          <div className="min-w-[500px]">
            <div className="grid" style={{ 
              gridTemplateColumns: `auto repeat(${columns.length}, 1fr)` 
            }}>
              {/* Header row */}
              <div className="p-2"></div>
              {columns.map((col, colIndex) => (
                <div key={`header-${col}-${colIndex}`} className="p-2 text-xs font-medium text-gray-700 dark:text-gray-300 text-center">
                  {col.length > 10 ? col.substring(0, 8) + '...' : col}
                </div>
              ))}
              
              {/* Matrix rows */}
              {columns.map((col1, i) => (
                <>
                  <div key={`row-${col1}-${i}`} className="p-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                    {col1.length > 10 ? col1.substring(0, 8) + '...' : col1}
                  </div>
                  {columns.map((col2, j) => {
                    const value = data.correlation_matrix[col1]?.[col2] || 0;
                    return (
                      <div
                        key={`cell-${col1}-${col2}-${i}-${j}`}
                        className="p-2 text-center cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                        style={{
                          backgroundColor: getColorForCorrelation(value),
                          color: Math.abs(value) > 0.5 ? 'white' : 'black'
                        }}
                        onClick={() => setSelectedPair({ col1, col2, value })}
                        title={`${col1} vs ${col2}: ${value.toFixed(3)}`}
                      >
                        <span className="text-xs font-mono">
                          {value.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-6 mt-4 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4" style={{ backgroundColor: 'rgba(255, 100, 100, 0.8)' }}></div>
            <span>Positive Correlation (+1)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4" style={{ backgroundColor: 'rgba(100, 100, 255, 0.8)' }}></div>
            <span>Negative Correlation (-1)</span>
          </div>
        </div>
      </div>

      {/* Significant Correlations */}
      {significantPairs.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Significant Correlations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {significantPairs.map((pair, idx) => (
              <div
                key={`sig-${pair.variables[0]}-${pair.variables[1]}-${idx}`}
                className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {pair.variables[0]} ↔ {pair.variables[1]}
                  </h4>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    pair.correlation > 0 
                      ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {pair.correlation > 0 ? 'Positive' : 'Negative'}
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-600 dark:text-gray-400">
                    Correlation: <span className="font-mono font-bold">{pair.correlation.toFixed(3)}</span>
                    <span className="ml-2 text-xs">({pair.strength})</span>
                  </p>
                  {pair.p_value && (
                    <p className="text-gray-600 dark:text-gray-400">
                      P-value: <span className="font-mono">{pair.p_value.toExponential(2)}</span>
                    </p>
                  )}
                  <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${pair.correlation > 0 ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.abs(pair.correlation) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Pair Detail */}
      {selectedPair && (
        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
            Selected: {selectedPair.col1} vs {selectedPair.col2}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Correlation: <span className="font-mono font-bold">{selectedPair.value.toFixed(3)}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {Math.abs(selectedPair.value) > 0.7 
              ? 'Strong relationship - these variables move together'
              : Math.abs(selectedPair.value) > 0.5
              ? 'Moderate relationship - some connection exists'
              : 'Weak relationship - minimal connection'}
          </p>
        </div>
      )}
    </div>
  );
}