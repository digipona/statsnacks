'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TrendData {
  date: string;
  clicks: number;
  impressions: number;
}

interface SearchTrendChartProps {
  data: TrendData[];
  title?: string;
}

export function SearchTrendChart({ data, title = 'Search Performance Trend' }: SearchTrendChartProps) {
  // Format date for display
  const formattedData = data.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
                formatter={(value) => (typeof value === 'number' ? value.toLocaleString() : value)}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="clicks"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                name="Clicks"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="impressions"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                dot={false}
                name="Impressions"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
