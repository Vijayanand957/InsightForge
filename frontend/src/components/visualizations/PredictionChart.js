'use client';

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
  AreaChart
} from 'recharts';

export default function PredictionChart({ data }) {
  if (!data) {
    return <div className="text-gray-500">No prediction data available</div>;
  }

  // Prepare forecast chart data
  const forecastData = [];
  
  if (data.predictions?.historical) {
    data.predictions.historical.slice(-20).forEach((value, index) => {
      forecastData.push({
        period: `t-${data.predictions.historical.length - index}`,
        actual: value,
        type: 'historical'
      });
    });
  }

  if (data.predictions?.future) {
    data.predictions.future.forEach((pred, index) => {
      forecastData.push({
        period: `t+${index + 1}`,
        forecast: pred.estimated_value || pred.value,
        lower: pred.confidence_interval?.[0],
        upper: pred.confidence_interval?.[1],
        type: 'forecast'
      });
    });
  }

  // Prepare feature importance data
  const importanceData = data.feature_importance?.features?.map((feature, index) => ({
    feature: feature.length > 15 ? feature.substring(0, 12) + '...' : feature,
    importance: data.feature_importance.importance[index]
  })).sort((a, b) => b.importance - a.importance) || [];

  return (
    <div className="space-y-8">
      {/* Model Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">R² Score</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {data.model_performance?.r2_score?.toFixed(3) || 'N/A'}
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">MAE</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {data.model_performance?.mean_absolute_error?.toFixed(1) || 'N/A'}
          </p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">RMSE</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {data.model_performance?.root_mean_squared_error?.toFixed(1) || 'N/A'}
          </p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">Training Samples</p>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {data.model_details?.training_samples?.toLocaleString() || 'N/A'}
          </p>
        </div>
      </div>

      {/* Forecast Chart */}
      {forecastData.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Forecast with Confidence Intervals
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={forecastData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" angle={-45} textAnchor="end" height={70} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="upper"
                  fill="#8884d8"
                  stroke="none"
                  fillOpacity={0.1}
                  name="Upper Bound"
                />
                <Area
                  type="monotone"
                  dataKey="lower"
                  fill="#8884d8"
                  stroke="none"
                  fillOpacity={0.1}
                  name="Lower Bound"
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Historical"
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="#8884d8"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={{ r: 6 }}
                  name="Forecast"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Shaded area represents 95% confidence interval
          </p>
        </div>
      )}

      {/* Feature Importance */}
      {importanceData.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Feature Importance
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={importanceData}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 1]} />
                <YAxis type="category" dataKey="feature" width={90} />
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
          </div>
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            <p>Top predictive features: {
              importanceData.slice(0, 3).map(d => d.feature).join(', ')
            }</p>
          </div>
        </div>
      )}

      {/* AI Insights */}
      {data.ai_insights && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-lg">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <span>🤖</span> AI Interpretation
          </h4>
          {data.ai_insights.key_findings && (
            <ul className="list-disc list-inside space-y-2 mb-4">
              {data.ai_insights.key_findings.map((finding, idx) => (
                <li key={idx} className="text-sm text-gray-700 dark:text-gray-300">
                  {finding}
                </li>
              ))}
            </ul>
          )}
          {data.ai_insights.summary && (
            <p className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-3 rounded-lg">
              {data.ai_insights.summary}
            </p>
          )}
        </div>
      )}

      {/* Recommendations */}
      {data.recommendations && data.recommendations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recommendations
          </h3>
          <div className="space-y-3">
            {data.recommendations.map((rec, idx) => (
              <div
                key={idx}
                className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border-l-4 border-blue-500"
              >
                <h4 className="font-medium text-gray-900 dark:text-white">{rec.title}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{rec.description}</p>
                {rec.impact && (
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    <span className="text-gray-500">Impact: 
                      <span className={`ml-1 font-medium ${
                        rec.impact === 'high' ? 'text-green-600' :
                        rec.impact === 'medium' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {rec.impact}
                      </span>
                    </span>
                    {rec.effort && (
                      <span className="text-gray-500">Effort: 
                        <span className={`ml-1 font-medium ${
                          rec.effort === 'low' ? 'text-green-600' :
                          rec.effort === 'medium' ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {rec.effort}
                        </span>
                      </span>
                    )}
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

// Missing Cell import
function Cell(props) {
  return <div {...props} />;
}