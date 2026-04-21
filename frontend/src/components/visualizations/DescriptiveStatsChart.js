'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#a4de6c', '#d0ed57'];

export default function DescriptiveStatsChart({ data }) {
  if (!data || !data.numeric_columns) {
    return <div className="text-gray-500">No descriptive statistics available</div>;
  }

  // Prepare data for mean comparison chart
  const meanData = Object.entries(data.numeric_columns).map(([col, stats]) => ({
    name: col.length > 15 ? col.substring(0, 12) + '...' : col,
    mean: stats.mean || 0,
    median: stats.median || 0,
    std: stats.std || 0
  }));

  // Prepare data for outlier detection
  const outlierData = Object.entries(data.numeric_columns)
    .filter(([_, stats]) => stats.outliers)
    .map(([col, stats]) => ({
      name: col.length > 15 ? col.substring(0, 12) + '...' : col,
      outliers: stats.outliers || 0,
      total: stats.count || 0,
      percentage: ((stats.outliers || 0) / (stats.count || 1) * 100).toFixed(1)
    }));

  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Rows</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {data.total_rows?.toLocaleString() || 0}
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">Numeric Columns</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {Object.keys(data.numeric_columns || {}).length}
          </p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">Categorical Columns</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {Object.keys(data.categorical_columns || {}).length}
          </p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">Missing Values</p>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {data.missing_values?.total_missing?.toLocaleString() || 0}
          </p>
        </div>
      </div>

      {/* Mean & Median Comparison Chart */}
      {meanData.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Mean & Median Comparison
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={meanData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="mean" fill="#8884d8" name="Mean" />
                <Bar dataKey="median" fill="#82ca9d" name="Median" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Outliers Chart */}
      {outlierData.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Outliers Detected
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={outlierData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="outliers" fill="#ff8042" name="Outliers">
                  {outlierData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {outlierData.map(item => (
              <span key={item.name} className="inline-block mr-4">
                {item.name}: {item.percentage}% outliers
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Categorical Data Preview */}
      {data.categorical_columns && Object.keys(data.categorical_columns).length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Categorical Data Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(data.categorical_columns).map(([col, stats]) => (
              <div key={col} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">{col}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Unique Values: {stats.unique_values || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Missing: {stats.missing_values || 0}
                </p>
                {stats.top_categories && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Top Categories:
                    </p>
                    {Object.entries(stats.top_categories).map(([cat, count]) => (
                      <div key={cat} className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                        <span>{cat}</span>
                        <span>{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}