'use client';

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BarChartData {
  name: string;
  value: number;
  [key: string]: unknown;
}

interface BarChartProps {
  data: BarChartData[];
  title?: string;
  orientation?: 'horizontal' | 'vertical';
  showValues?: boolean;
  colorScale?: string[];
  height?: number;
  valueKey?: string;
  nameKey?: string;
  onClick?: (item: BarChartData) => void;
}

const DEFAULT_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
];

export function BarChartComponent({
  data,
  title,
  orientation = 'horizontal',
  showValues = true,
  colorScale = DEFAULT_COLORS,
  height = 300,
  valueKey = 'value',
  nameKey = 'name',
  onClick,
}: BarChartProps) {
  const isHorizontal = orientation === 'horizontal';

  // Calculate max value for gradient
  const maxValue = Math.max(...data.map((d) => d[valueKey] as number));

  const getColor = (value: number) => {
    const intensity = value / maxValue;
    // Use primary color with varying opacity based on value
    return `hsl(var(--primary) / ${0.4 + intensity * 0.6})`;
  };

  const formatValue = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString();
  };

  const content = (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={data}
          layout={isHorizontal ? 'vertical' : 'horizontal'}
          margin={{
            top: 5,
            right: showValues ? 60 : 20,
            left: isHorizontal ? 120 : 20,
            bottom: 5,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-muted"
            horizontal={!isHorizontal}
            vertical={isHorizontal}
          />
          {isHorizontal ? (
            <>
              <XAxis
                type="number"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatValue}
              />
              <YAxis
                type="category"
                dataKey={nameKey}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={110}
                tickFormatter={(value) =>
                  value.length > 15 ? `${value.slice(0, 15)}...` : value
                }
              />
            </>
          ) : (
            <>
              <XAxis
                type="category"
                dataKey={nameKey}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) =>
                  value.length > 10 ? `${value.slice(0, 10)}...` : value
                }
              />
              <YAxis
                type="number"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatValue}
              />
            </>
          )}
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
            }}
            formatter={(value) => [typeof value === 'number' ? formatValue(value) : value, 'Value']}
            cursor={{ fill: 'hsl(var(--muted))' }}
          />
          <Bar
            dataKey={valueKey}
            radius={[4, 4, 4, 4]}
            onClick={onClick ? (item) => onClick(item as unknown as BarChartData) : undefined}
            cursor={onClick ? 'pointer' : 'default'}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getColor(entry[valueKey] as number)}
              />
            ))}
            {showValues && (
              <LabelList
                dataKey={valueKey}
                position={isHorizontal ? 'right' : 'top'}
                formatter={(value) => typeof value === 'number' ? formatValue(value) : String(value)}
                className="fill-muted-foreground"
                fontSize={11}
              />
            )}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );

  if (!title) return content;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
