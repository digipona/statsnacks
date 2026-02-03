'use client';

import {
  ScatterChart as RechartsScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  Label,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface ScatterDataPoint {
  x: number; // position
  y: number; // impressions
  size: number; // clicks (for bubble size)
  color: number; // opportunity_score (for color)
  label: string; // query
  [key: string]: unknown;
}

interface ScatterChartProps {
  data: ScatterDataPoint[];
  title?: string;
  description?: string;
  xAxisInverted?: boolean;
  yAxisLog?: boolean;
  showQuadrants?: boolean;
  onPointClick?: (point: ScatterDataPoint) => void;
  height?: number;
}

// Color scale from red (low score) to green (high score)
function getScoreColor(score: number): string {
  // Score is 0-100
  const normalized = Math.min(100, Math.max(0, score)) / 100;

  if (normalized < 0.33) {
    // Red to Yellow
    const t = normalized / 0.33;
    const r = 255;
    const g = Math.round(200 * t);
    return `rgb(${r}, ${g}, 50)`;
  } else if (normalized < 0.66) {
    // Yellow to Light Green
    const t = (normalized - 0.33) / 0.33;
    const r = Math.round(255 - 100 * t);
    const g = Math.round(200 + 55 * t);
    return `rgb(${r}, ${g}, 50)`;
  } else {
    // Light Green to Green
    const t = (normalized - 0.66) / 0.34;
    const r = Math.round(155 - 100 * t);
    const g = Math.round(255 - 55 * t);
    return `rgb(${r}, ${g}, ${Math.round(50 + 100 * t)})`;
  }
}

export function ScatterChartComponent({
  data,
  title = 'Keyword Opportunity Matrix',
  description,
  xAxisInverted = true,
  yAxisLog = true,
  showQuadrants = true,
  onPointClick,
  height = 400,
}: ScatterChartProps) {
  // Calculate size range for bubbles
  const maxClicks = Math.max(...data.map((d) => d.size), 1);
  const minBubble = 50;
  const maxBubble = 400;

  const chartData = data.map((point) => ({
    ...point,
    bubbleSize: minBubble + (point.size / maxClicks) * (maxBubble - minBubble),
  }));

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: ScatterDataPoint }> }) => {
    if (!active || !payload || !payload.length) return null;

    const point = payload[0].payload;
    return (
      <div className="rounded-md border bg-background p-3 shadow-md">
        <p className="font-medium text-sm mb-2 max-w-[250px] truncate">{point.label}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <span className="text-muted-foreground">Position:</span>
          <span className="font-medium">{point.x.toFixed(1)}</span>
          <span className="text-muted-foreground">Impressions:</span>
          <span className="font-medium">{point.y.toLocaleString()}</span>
          <span className="text-muted-foreground">Clicks:</span>
          <span className="font-medium">{point.size.toLocaleString()}</span>
          <span className="text-muted-foreground">Score:</span>
          <span className="font-medium">{point.color.toFixed(0)}</span>
        </div>
      </div>
    );
  };

  const content = (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsScatterChart
          margin={{ top: 20, right: 20, bottom: 40, left: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            type="number"
            dataKey="x"
            name="Position"
            domain={xAxisInverted ? [20, 1] : [1, 20]}
            reversed={xAxisInverted}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          >
            <Label
              value="Position (lower is better)"
              offset={-10}
              position="insideBottom"
              className="fill-muted-foreground text-xs"
            />
          </XAxis>
          <YAxis
            type="number"
            dataKey="y"
            name="Impressions"
            scale={yAxisLog ? 'log' : 'auto'}
            domain={yAxisLog ? [10, 'auto'] : ['auto', 'auto']}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) =>
              value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value
            }
          >
            <Label
              value="Impressions"
              angle={-90}
              position="insideLeft"
              className="fill-muted-foreground text-xs"
              style={{ textAnchor: 'middle' }}
            />
          </YAxis>
          <ZAxis
            type="number"
            dataKey="bubbleSize"
            range={[minBubble, maxBubble]}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Reference lines for quadrants */}
          {showQuadrants && (
            <>
              <ReferenceLine
                x={10}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
              <ReferenceLine
                y={100}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
            </>
          )}

          <Scatter
            data={chartData}
            onClick={onPointClick ? (point) => onPointClick(point as ScatterDataPoint) : undefined}
            cursor={onPointClick ? 'pointer' : 'default'}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getScoreColor(entry.color)}
                fillOpacity={0.7}
                stroke={getScoreColor(entry.color)}
                strokeWidth={1}
              />
            ))}
          </Scatter>
        </RechartsScatterChart>
      </ResponsiveContainer>
    </div>
  );

  if (!title) return content;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {content}
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getScoreColor(20) }} />
            <span>Low Score</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getScoreColor(50) }} />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getScoreColor(80) }} />
            <span>High Score</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Bubble size = Clicks</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
