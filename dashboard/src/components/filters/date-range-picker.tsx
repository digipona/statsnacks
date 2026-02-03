'use client';

import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DatePreset,
  DATE_PRESETS,
  getDateRange,
  getComparisonRange,
  formatDateForDisplay,
} from '@/lib/date-utils';

interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onDateChange: (start: Date, end: Date) => void;
  showComparison?: boolean;
  compareEnabled?: boolean;
  onCompareChange?: (enabled: boolean) => void;
  className?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onDateChange,
  showComparison = false,
  compareEnabled = false,
  onCompareChange,
  className,
}: DateRangePickerProps) {
  const [preset, setPreset] = useState<DatePreset | 'custom'>('last30days');
  const [isOpen, setIsOpen] = useState(false);

  const handlePresetChange = useCallback(
    (value: string) => {
      if (value === 'custom') {
        setPreset('custom');
        return;
      }

      const presetValue = value as DatePreset;
      setPreset(presetValue);
      const range = getDateRange(presetValue);
      onDateChange(range.start, range.end);
    },
    [onDateChange]
  );

  const handleCalendarSelect = useCallback(
    (range: { from?: Date; to?: Date } | undefined) => {
      if (range?.from && range?.to) {
        setPreset('custom');
        onDateChange(range.from, range.to);
        setIsOpen(false);
      }
    },
    [onDateChange]
  );

  const comparison = compareEnabled ? getComparisonRange(startDate, endDate) : null;

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <Select value={preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Select range" />
        </SelectTrigger>
        <SelectContent>
          {DATE_PRESETS.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
          <SelectItem value="custom">Custom Range</SelectItem>
        </SelectContent>
      </Select>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateForDisplay(startDate)} - {formatDateForDisplay(endDate)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={startDate}
            selected={{ from: startDate, to: endDate }}
            onSelect={handleCalendarSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

      {showComparison && (
        <Button
          variant={compareEnabled ? 'default' : 'outline'}
          size="sm"
          onClick={() => onCompareChange?.(!compareEnabled)}
          className="whitespace-nowrap"
        >
          {compareEnabled ? 'Comparing' : 'Compare'}
        </Button>
      )}

      {compareEnabled && comparison && (
        <span className="text-xs text-muted-foreground">
          vs {format(comparison.start, 'MMM d')} - {format(comparison.end, 'MMM d')}
        </span>
      )}
    </div>
  );
}
