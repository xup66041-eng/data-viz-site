import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export interface GroupedBarChartData {
  name: string;
  [key: string]: string | number;
}

interface GroupedBarChartProps {
  data: GroupedBarChartData[];
  periods: string[];
  height?: number;
  colors?: string[];
  yAxisMin?: number | null;
  yAxisMax?: number | null;
  barWidth?: number;
  visibleItems?: string[] | null;
  highlightPeriods?: string[];
  hideLabels?: boolean;
}

const DEFAULT_COLORS = ['#3b82f6', '#ef4444', '#84cc16', '#f59e0b', '#8b5cf6'];

export const GroupedBarChart: React.FC<GroupedBarChartProps> = ({
  data,
  periods,
  height = 500,
  colors = DEFAULT_COLORS,
  yAxisMin = null,
  yAxisMax = null,
  barWidth = 0.8,
  visibleItems = null,
  highlightPeriods = [],
  hideLabels = false,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <p className="text-gray-500">沒有數據可顯示</p>
      </div>
    );
  }

  const renderCustomLabel = (props: any) => {
    if (hideLabels) return undefined;
    const { x, y, width, height, value } = props;
    if (value === 0 || value === undefined) return undefined;
    return (
      <text
        x={x + width / 2}
        y={y - 5}
        fill="#000"
        textAnchor="middle"
        fontSize={12}
        fontWeight="bold"
      >
        {value}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 0, bottom: 100 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          angle={-45}
          textAnchor="end"
          height={120}
          tick={{ fontSize: 20, fill: '#1f2937', fontWeight: 700 }}
        />
        <YAxis
          domain={[
            yAxisMin !== null && yAxisMin !== undefined ? yAxisMin : 0,
            yAxisMax !== null && yAxisMax !== undefined ? yAxisMax : 'dataMax + 10%'
          ]}
        />
        <Tooltip
          formatter={(value) => {
            if (typeof value === 'number') {
              return value.toLocaleString();
            }
            return value;
          }}
          contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
        />
        <Legend />
        {periods.map((period, index) => {
          const isHighlighted = highlightPeriods && highlightPeriods.includes(period);
          const barColor = isHighlighted ? '#d1d5db' : colors[index % colors.length];
          
          return (
            <Bar
              key={`${period}-${index}`}
              dataKey={period}
              fill={barColor}
              label={renderCustomLabel as any}
              maxBarSize={barWidth * 80}
            />
          );
        })}
      </BarChart>
    </ResponsiveContainer>
  );
};
