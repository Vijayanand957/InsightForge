'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
  AreaChart
} from 'recharts';

export default function TrendChart({ data }) {
  if (!data || !data.time_series_data) {
    return <div className="text-gray-500">No trend data available</div>;
  }

  // Prepare chart data
  const chartData = data.time_series_data.timestamps.map((timestamp, index) => ({
    date: new Date(timestamp).toLocaleDateString(),
    actual: data.time_series_data.values[index],
    movingAvg: data.time_series_data.moving_average[index],
    forecast: index >= data.time_series_data.values.length - 5 ? 
      data.forecast?.next_period_value : null
  }));

  return (
    <div className="space-y-8">
      {/* Trend Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">Data Points</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {data.statistics?.total_points || 0}
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">Mean</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {data.statistics?.mean?.toFixed(1) || 0}
          </p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">Trend</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {data.statistics?.trend?.trend_direction || 'Unknown'}
          </p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">R² Score</p>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {data.statistics?.trend?.r_squared?.toFixed(3) || 0}
          </p>
        </div>
      </div>

      {/* Main Trend Chart */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Time Series Analysis: {data.value_column}
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                angle={-45} 
                textAnchor="end" 
                height={70}
                interval={Math.floor(chartData.length / 10)}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#8884d8"
                strokeWidth={2}
                dot={false}
                name="Actual"
              />
              <Line
                type="monotone"
                dataKey="movingAvg"
                stroke="#82ca9d"
                strokeWidth={2}
                dot={false}
                name="Moving Average"
              />
              {data.forecast?.next_period_value && (
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="#ff8042"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={{ r: 6 }}
                  name="Forecast"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trend Analysis Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Trend Statistics</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Slope:</span>
              <span className="text-sm font-mono font-bold">
                {data.statistics?.trend?.slope?.toFixed(4) || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">R² (Goodness of fit):</span>
              <span className="text-sm font-mono font-bold">
                {data.statistics?.trend?.r_squared?.toFixed(4) || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">P-value:</span>
              <span className="text-sm font-mono font-bold">
                {data.statistics?.trend?.p_value?.toExponential(2) || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Trend Strength:</span>
              <span className={`text-sm font-bold ${
                data.statistics?.trend?.trend_strength === 'strong' 
                  ? 'text-green-600' 
                  : data.statistics?.trend?.trend_strength === 'moderate'
                  ? 'text-yellow-600'
                  : 'text-red-600'
              }`}>
                {data.statistics?.trend?.trend_strength || 'Unknown'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Forecast</h4>
          {data.forecast?.next_period_value ? (
            <>
              <div className="text-center mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Next Period Value</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {data.forecast.next_period_value.toFixed(1)}
                </p>
              </div>
              {data.forecast.confidence_interval && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">95% Confidence Interval</p>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{
                        width: `${(data.forecast.confidence_interval[1] - data.forecast.confidence_interval[0]) / 
                          (data.statistics?.max - data.statistics?.min) * 100}%`,
                        marginLeft: `${(data.forecast.confidence_interval[0] - data.statistics?.min) /
                          (data.statistics?.max - data.statistics?.min) * 100}%`
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{data.forecast.confidence_interval[0].toFixed(1)}</span>
                    <span>Expected</span>
                    <span>{data.forecast.confidence_interval[1].toFixed(1)}</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-gray-500 text-center py-4">No forecast available</p>
          )}
        </div>
      </div>

      {/* Interpretation */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">What This Means</h4>
        <p className="text-sm text-blue-700 dark:text-blue-400">
          {data.statistics?.trend?.trend_direction === 'increasing' 
            ? `The data shows a significant upward trend with ${data.statistics?.trend?.r_squared?.toFixed(2) * 100}% of the variance explained. 
               ${data.forecast?.next_period_value 
                 ? `We forecast a ${((data.forecast.next_period_value / data.statistics?.mean - 1) * 100).toFixed(1)}% increase in the next period.` 
                 : ''}`
            : data.statistics?.trend?.trend_direction === 'decreasing'
            ? `The data shows a significant downward trend with ${data.statistics?.trend?.r_squared?.toFixed(2) * 100}% of the variance explained.
               ${data.forecast?.next_period_value
                 ? `We forecast a ${((1 - data.forecast.next_period_value / data.statistics?.mean) * 100).toFixed(1)}% decrease in the next period.`
                 : ''}`
            : 'The trend is relatively stable with no significant directional change.'}
        </p>
      </div>
    </div>
  );
}