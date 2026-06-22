'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { ChevronLeftIcon, ChevronRightIcon, CalendarDaysIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeekPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedWeekStart: string;
  onSelectWeek: (weekStart: string) => void;
}

// 获取本周周一
function getThisWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

// 获取任意日期所在周的周一
function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

// 格式化日期范围
function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return `${startDate.getMonth() + 1}月${startDate.getDate()}日 - ${endDate.getMonth() + 1}月${endDate.getDate()}日`;
}

// 获取周的结束日期
function getWeekEnd(weekStart: string): string {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  return end.toISOString().split('T')[0];
}

export function WeekPickerDialog({
  open,
  onOpenChange,
  selectedWeekStart,
  onSelectWeek,
}: WeekPickerDialogProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date(selectedWeekStart));

  const thisWeekStart = getThisWeekStart();
  const isThisWeek = selectedWeekStart === thisWeekStart;

  // 快捷选择
  const quickWeeks = [
    { label: '本周', value: thisWeekStart },
    {
      label: '上周',
      value: (() => {
        const d = new Date(thisWeekStart);
        d.setDate(d.getDate() - 7);
        return d.toISOString().split('T')[0];
      })(),
    },
    {
      label: '上上周',
      value: (() => {
        const d = new Date(thisWeekStart);
        d.setDate(d.getDate() - 14);
        return d.toISOString().split('T')[0];
      })(),
    },
  ];

  // 日历选择
  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      const weekStart = getWeekStart(date.toISOString().split('T')[0]);
      onSelectWeek(weekStart);
    }
  };

  // 前后周导航
  const goToPrevWeek = () => {
    const d = new Date(selectedWeekStart);
    d.setDate(d.getDate() - 7);
    onSelectWeek(d.toISOString().split('T')[0]);
  };

  const goToNextWeek = () => {
    const d = new Date(selectedWeekStart);
    d.setDate(d.getDate() + 7);
    onSelectWeek(d.toISOString().split('T')[0]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDaysIcon className="w-5 h-5 text-muted-foreground" />
            选择周
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 当前选中周 */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPrevWeek}
              className="h-8 w-8"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </Button>

            <div className="flex flex-col items-center">
              <p className="text-sm font-semibold">
                {formatDateRange(selectedWeekStart, getWeekEnd(selectedWeekStart))}
              </p>
              {isThisWeek && (
                <Badge variant="secondary" className="mt-1 text-xs">本周</Badge>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={goToNextWeek}
              className="h-8 w-8"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </Button>
          </div>

          {/* 快捷选择 */}
          <div className="flex gap-2">
            {quickWeeks.map((week) => (
              <Button
                key={week.label}
                variant={selectedWeekStart === week.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSelectWeek(week.value)}
                className="flex-1 h-8 text-xs"
              >
                {week.label}
              </Button>
            ))}
          </div>

          {/* 日历 */}
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={new Date(selectedWeekStart)}
              onSelect={handleCalendarSelect}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              className="rounded-md border"
            />
          </div>

          {/* 提示 */}
          <p className="text-xs text-muted-foreground text-center">
            点击日历中的任意日期，自动选择该日期所在的周
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
