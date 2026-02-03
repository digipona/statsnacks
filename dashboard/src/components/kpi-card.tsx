'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: number;
  className?: string;
}

export function KPICard({ title, value, description, trend, className }: KPICardProps) {
  const trendColor = trend
    ? trend > 0
      ? 'text-green-600'
      : trend < 0
      ? 'text-red-600'
      : 'text-muted-foreground'
    : undefined;

  const trendIcon = trend
    ? trend > 0
      ? '+'
      : ''
    : undefined;

  return (
    <Card className={cn('', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trend !== undefined) && (
          <p className="text-xs text-muted-foreground mt-1">
            {trend !== undefined && (
              <span className={cn('font-medium', trendColor)}>
                {trendIcon}{trend}%{' '}
              </span>
            )}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface KPIRowProps {
  metrics: Array<{
    title: string;
    value: string | number;
    description?: string;
    trend?: number;
  }>;
  className?: string;
}

export function KPIRow({ metrics, className }: KPIRowProps) {
  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-5', className)}>
      {metrics.map((metric, index) => (
        <KPICard key={index} {...metric} />
      ))}
    </div>
  );
}
