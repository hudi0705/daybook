'use client';

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ContributionDay {
  date: string;
  count: number;
  summary?: string;
}

interface ContributionGraphProps {
  data: ContributionDay[];
  startDate?: Date;
  onDayClick?: (date: string) => void;
}

const WEEKDAY_LABELS = ['', '一', '', '三', '', '五', ''];
const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const WEEKDAY_SHORT = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const CELL_GAP = 3;
const LABEL_WIDTH = 28;

// 项目风格：植物绿色系
const CELL_COLORS = [
  { bg: '#f0f0f0', border: '#e0e0e0' },      // 0 - 无
  { bg: '#c6e48b', border: '#b5d47a' },      // 1 - 1篇
  { bg: '#7bc96f', border: '#6ab85e' },      // 2 - 2篇
  { bg: '#49af5d', border: '#3a9e4c' },      // 3 - 3篇
  { bg: '#2e8b57', border: '#257a4a' },      // 4 - 4+篇
] as const;

const HOVER_COLOR = '#1a6b3c';

const getLevel = (count: number): number => {
  if (count === 0) return 0;
  if (count <= 1) return 1;
  if (count <= 2) return 2;
  if (count <= 3) return 3;
  return 4;
};

const formatDateDisplay = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = WEEKDAY_SHORT[date.getDay()];
  return `${year}年${month}月${day}日 ${weekday}`;
};

const toDateStr = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function ContributionGraph({ data, startDate, onDayClick }: ContributionGraphProps) {
  const router = useRouter();
  const [hoveredDay, setHoveredDay] = useState<ContributionDay | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const graphRef = useRef<HTMLDivElement>(null);

  const baseDate = startDate || new Date();

  const dataMap = useMemo(() => {
    const map = new Map<string, ContributionDay>();
    data.forEach(item => map.set(item.date, item));
    return map;
  }, [data]);

  // Calculate grid: 52 weeks + partial week
  const { grid, monthLabels } = useMemo(() => {
    const today = new Date(baseDate);
    today.setHours(0, 0, 0, 0);

    // Go back ~1 year and find the nearest Sunday
    const start = new Date(today);
    start.setDate(start.getDate() - 364);
    while (start.getDay() !== 0) {
      start.setDate(start.getDate() - 1);
    }

    const weeks: ContributionDay[][] = [];
    const months: { month: number; weekIndex: number; label: string }[] = [];
    let lastMonth = -1;
    const current = new Date(start);

    while (current <= today) {
      const week: ContributionDay[] = [];
      const weekIndex = weeks.length;

      for (let d = 0; d < 7; d++) {
        const dateStr = toDateStr(current);
        const dayData = dataMap.get(dateStr) || { date: dateStr, count: 0 };
        week.push(dayData);

        if (current.getDay() === 0) {
          const month = current.getMonth();
          if (month !== lastMonth) {
            months.push({ month, weekIndex, label: MONTH_LABELS[month] });
            lastMonth = month;
          }
        }

        current.setDate(current.getDate() + 1);
      }
      weeks.push(week);
    }

    return { grid: weeks, monthLabels: months };
  }, [baseDate, dataMap]);

  // Stats
  const stats = useMemo(() => {
    const total = data.reduce((sum, item) => sum + item.count, 0);
    const activeDays = data.filter(item => item.count > 0).length;
    return { total, activeDays };
  }, [data]);

  // Tooltip positioning
  const updateTooltipPosition = useCallback((cellEl: HTMLElement) => {
    if (!graphRef.current) return;
    const graphRect = graphRef.current.getBoundingClientRect();
    const cellRect = cellEl.getBoundingClientRect();

    const x = cellRect.left + cellRect.width / 2 - graphRect.left;
    const y = cellRect.top - graphRect.top;

    setTooltipPos({ x, y });
  }, []);

  const handleClick = useCallback((dayData: ContributionDay) => {
    if (dayData.count > 0 && onDayClick) {
      onDayClick(dayData.date);
    } else if (dayData.count > 0) {
      router.push(`/daily?date=${dayData.date}`);
    }
  }, [onDayClick, router]);

  const handleHover = useCallback((dayData: ContributionDay, el: HTMLElement) => {
    setHoveredDay(dayData);
    updateTooltipPosition(el);
  }, [updateTooltipPosition]);

  const handleLeave = useCallback(() => {
    setHoveredDay(null);
    setTooltipPos(null);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setHoveredDay(null);
        setTooltipPos(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fixed cell size
  const cellSize = 12;
  const gridHeight = 7 * cellSize + 6 * CELL_GAP;

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          过去一年共 <span className="font-semibold text-foreground">{stats.total}</span> 篇日报
        </span>
        <span>
          活跃 <span className="font-semibold text-foreground">{stats.activeDays}</span> 天
        </span>
      </div>

      {/* Graph container */}
      <div className="relative" ref={graphRef}>
        {/* Month labels */}
        <div className="relative" style={{ height: '16px', marginLeft: `${LABEL_WIDTH}px` }}>
          {monthLabels.map(({ month, weekIndex, label }) => (
            <span
              key={`${month}-${weekIndex}`}
              className="absolute text-[10px] text-muted-foreground whitespace-nowrap"
              style={{ left: `${weekIndex * (cellSize + CELL_GAP)}px` }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Grid */}
        <div className="flex mt-1" style={{ height: `${gridHeight}px` }}>
          {/* Weekday labels */}
          <div style={{ width: `${LABEL_WIDTH}px` }} className="flex-shrink-0">
            {WEEKDAY_LABELS.map((label, idx) => (
              <div
                key={idx}
                className="text-[10px] text-muted-foreground text-right pr-1"
                style={{
                  height: `${cellSize}px`,
                  marginBottom: idx < 6 ? `${CELL_GAP}px` : 0,
                  lineHeight: `${cellSize}px`,
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Cells */}
          <div className="flex flex-1 min-w-0" style={{ gap: `${CELL_GAP}px` }}>
            {grid.map((week, weekIdx) => (
              <div
                key={weekIdx}
                className="flex-1 min-w-0"
                style={{ display: 'flex', flexDirection: 'column', gap: `${CELL_GAP}px` }}
              >
                {week.map((dayData) => {
                  const level = getLevel(dayData.count);
                  const isHovered = hoveredDay?.date === dayData.date;
                  const colors = CELL_COLORS[level];

                  return (
                    <div
                      key={dayData.date}
                      className="rounded-[2px] cursor-pointer"
                      style={{
                        width: '100%',
                        height: `${cellSize}px`,
                        backgroundColor: isHovered ? HOVER_COLOR : colors.bg,
                        border: `1px solid ${isHovered ? HOVER_COLOR : colors.border}`,
                      }}
                      onClick={() => handleClick(dayData)}
                      onMouseEnter={(e) => handleHover(dayData, e.currentTarget)}
                      onMouseLeave={handleLeave}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Tooltip - inside graph container for positioning */}
        {hoveredDay && tooltipPos && (
          <div
            className="absolute z-50 pointer-events-none"
            style={{
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y - 8}px`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="bg-popover border rounded-md shadow-md px-3 py-2 text-sm whitespace-nowrap">
              <div className="font-medium">{formatDateDisplay(hoveredDay.date)}</div>
              <div className="text-muted-foreground">
                {hoveredDay.count > 0 ? (
                  <span>
                    <span className="font-semibold text-foreground">{hoveredDay.count}</span> 篇日报
                  </span>
                ) : (
                  '无日报记录'
                )}
              </div>
            </div>
            <div className="flex justify-center">
              <div className="w-2 h-2 rotate-45 -mt-1 bg-popover border-b border-r" />
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          点击有日报的日期可查看详情
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>少</span>
          {CELL_COLORS.map((colors, idx) => (
            <div
              key={idx}
              className="rounded-[2px] w-3 h-3"
              style={{
                backgroundColor: colors.bg,
                border: `1px solid ${colors.border}`,
              }}
            />
          ))}
          <span>多</span>
        </div>
      </div>
    </div>
  );
}
