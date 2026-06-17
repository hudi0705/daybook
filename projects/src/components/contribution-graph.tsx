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

type ViewMode = 'month' | 'quarter' | 'year';

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];
const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

/**
 * oklch gradient from a warm empty tint to rich saturated plant-green.
 * Matches the "晨间咖啡馆" morning-cafe palette:
 *   L 0.97 -> 0.55   (lightness drops as activity rises)
 *   C 0.01 -> 0.14   (chroma/saturation rises)
 *   H 145  -> 140    (hue shifts slightly warmer at the deep end)
 */
const CELL_COLORS: { bg: string; border: string; glow: string }[] = [
  {
    bg: 'oklch(0.97 0.01 60)',
    border: 'oklch(0.92 0.01 60)',
    glow: 'none',
  },
  {
    bg: 'oklch(0.88 0.06 145)',
    border: 'oklch(0.82 0.07 145)',
    glow: '0 0 3px oklch(0.88 0.06 145 / 0.3)',
  },
  {
    bg: 'oklch(0.76 0.10 145)',
    border: 'oklch(0.70 0.11 145)',
    glow: '0 0 5px oklch(0.76 0.10 145 / 0.35)',
  },
  {
    bg: 'oklch(0.65 0.13 142)',
    border: 'oklch(0.58 0.14 142)',
    glow: '0 0 6px oklch(0.65 0.13 142 / 0.4)',
  },
  {
    bg: 'oklch(0.55 0.14 140)',
    border: 'oklch(0.48 0.15 140)',
    glow: '0 0 8px oklch(0.55 0.14 140 / 0.45)',
  },
];

// Ring color for hover: uses the cell's own bg color at reduced opacity
const RING_COLORS = [
  'oklch(0.92 0.01 60 / 0.6)',
  'oklch(0.88 0.06 145 / 0.6)',
  'oklch(0.76 0.10 145 / 0.6)',
  'oklch(0.65 0.13 142 / 0.6)',
  'oklch(0.55 0.14 140 / 0.6)',
];

const getLevel = (count: number): number => {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  return 4;
};

const formatDateDisplay = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
  return `${year}年${month}月${day}日 ${weekday}`;
};

const ContributionCell = React.memo(function ContributionCell({
  dayData,
  level,
  isClickable,
  isHovered,
  onHover,
  onLeave,
  onClick,
}: {
  dayData: ContributionDay;
  level: number;
  isClickable: boolean;
  isHovered: boolean;
  onHover: (dayData: ContributionDay) => void;
  onLeave: () => void;
  onClick: (dayData: ContributionDay) => void;
}) {
  const dateLabel = useMemo(() => formatDateDisplay(dayData.date), [dayData.date]);
  const ariaLabel = dayData.count > 0
    ? `${dateLabel}，${dayData.count} 篇日报`
    : `${dateLabel}，无日报`;

  const colors = CELL_COLORS[level];
  const isActive = level === 4;
  const hasActivity = level > 0;

  const cellStyle: React.CSSProperties = {
    backgroundColor: colors.bg,
    border: `1px solid ${colors.border}`,
    boxShadow: isHovered
      ? `0 0 0 2px ${RING_COLORS[level]}, 0 2px 8px oklch(0.4 0.1 140 / 0.25), ${colors.glow}`
      : colors.glow,
    ...(isActive && { animation: 'cell-pulse 2.5s ease-in-out infinite' }),
    ...(!isActive && hasActivity && { animation: 'cell-shimmer 4s ease-in-out infinite' }),
  };

  return (
    <div
      role="gridcell"
      tabIndex={isClickable ? 0 : -1}
      aria-label={ariaLabel}
      className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded transition-all duration-200 ${
        isClickable
          ? 'cursor-pointer hover:scale-125 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1'
          : 'cursor-default'
      } ${isHovered ? 'scale-110' : ''}`}
      style={cellStyle}
      onClick={() => onClick(dayData)}
      onMouseEnter={() => onHover(dayData)}
      onMouseLeave={onLeave}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick(dayData);
        }
      }}
    />
  );
});

export function ContributionGraph({ data, startDate, onDayClick }: ContributionGraphProps) {
  const router = useRouter();
  const [hoveredDay, setHoveredDay] = useState<ContributionDay | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('year');
  const [isGridVisible, setIsGridVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const baseDate = startDate || new Date();

  const viewConfig = useMemo(() => {
    const end = new Date(baseDate);
    let start = new Date(baseDate);

    if (viewMode === 'month') {
      start.setDate(1);
      start.setDate(start.getDate() - start.getDay());
    } else if (viewMode === 'quarter') {
      const quarterMonth = Math.floor(baseDate.getMonth() / 3) * 3;
      start.setMonth(quarterMonth);
      start.setDate(1);
      start.setDate(start.getDate() - start.getDay());
      end.setMonth(quarterMonth + 3);
      end.setDate(0);
    } else {
      start = new Date(baseDate.getFullYear() - 1, baseDate.getMonth(), baseDate.getDate());
      start.setDate(start.getDate() - start.getDay());
    }

    return { start, end };
  }, [baseDate, viewMode]);

  const streak = useMemo(() => {
    const sortedData = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let count = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const item of sortedData) {
      const itemDate = new Date(item.date + 'T00:00:00');
      const diffDays = Math.floor((today.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24));

      if (item.count > 0 && diffDays === count) {
        count++;
      } else if (diffDays > count) {
        break;
      }
    }

    return count;
  }, [data]);

  const stats = useMemo(() => {
    const total = data.reduce((sum, item) => sum + item.count, 0);
    const activeDays = data.filter(item => item.count > 0).length;
    return { total, activeDays };
  }, [data]);

  const gridData = useMemo(() => {
    const { start, end } = viewConfig;
    const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const weeks = Math.ceil(diffDays / 7);

    const dataMap = new Map<string, ContributionDay>();
    data.forEach(item => dataMap.set(item.date, item));

    const grid: ContributionDay[][] = [];

    for (let week = 0; week < weeks; week++) {
      const weekData: ContributionDay[] = [];
      for (let day = 0; day < 7; day++) {
        const currentDate = new Date(start);
        currentDate.setDate(currentDate.getDate() + week * 7 + day);
        const dateStr = currentDate.toISOString().split('T')[0];

        const dayData = dataMap.get(dateStr) || { date: dateStr, count: 0 };
        weekData.push(dayData);
      }
      grid.push(weekData);
    }

    return grid;
  }, [data, viewConfig]);

  const monthLabels = useMemo(() => {
    const labels: { month: number; week: number; label: string }[] = [];
    const { start } = viewConfig;

    let lastMonth = -1;
    for (let week = 0; week < gridData.length; week++) {
      const firstDayOfWeek = new Date(start);
      firstDayOfWeek.setDate(firstDayOfWeek.getDate() + week * 7);
      const month = firstDayOfWeek.getMonth();

      if (month !== lastMonth) {
        labels.push({
          month,
          week,
          label: MONTH_LABELS[month],
        });
        lastMonth = month;
      }
    }

    return labels;
  }, [viewConfig, gridData]);

  // Handle view mode transitions with grid fade
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    if (mode === viewMode) return;
    setIsGridVisible(false);
    setTimeout(() => {
      setViewMode(mode);
      setIsGridVisible(true);
    }, 150);
  }, [viewMode]);

  const tooltipStyle = useMemo(() => {
    if (!hoveredDay || !containerRef.current) return {};

    const containerRect = containerRef.current.getBoundingClientRect();
    const tooltipEl = tooltipRef.current;
    const tooltipWidth = tooltipEl ? tooltipEl.offsetWidth : 200;

    const flatData = gridData.flat();
    const cellIndex = flatData.findIndex(d => d.date === hoveredDay.date);
    const weekIdx = Math.floor(cellIndex / 7);
    const dayIdx = cellIndex % 7;

    const cellSize = 14;
    const labelWidth = 32;
    const cellX = labelWidth + weekIdx * (cellSize + 2) + cellSize / 2;
    const cellY = dayIdx * (cellSize + 2) + (viewMode === 'year' ? 24 : 0);

    let x = cellX - tooltipWidth / 2;
    let y = cellY - 8;

    if (x + tooltipWidth > containerRect.width) {
      x = containerRect.width - tooltipWidth - 8;
    }
    if (x < 0) x = 8;

    return { left: `${x}px`, top: `${y}px` };
  }, [hoveredDay, gridData, viewMode]);

  const handleClick = useCallback((dayData: ContributionDay) => {
    if (dayData.count > 0 && onDayClick) {
      onDayClick(dayData.date);
    } else if (dayData.count > 0) {
      router.push(`/daily?date=${dayData.date}`);
    }
  }, [onDayClick, router]);

  const handleHover = useCallback((dayData: ContributionDay) => {
    setHoveredDay(dayData);
  }, []);

  const handleLeave = useCallback(() => {
    setHoveredDay(null);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHoveredDay(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getViewTitle = () => {
    if (viewMode === 'month') {
      return `${baseDate.getFullYear()}年${baseDate.getMonth() + 1}月`;
    } else if (viewMode === 'quarter') {
      const quarter = Math.floor(baseDate.getMonth() / 3) + 1;
      return `${baseDate.getFullYear()}年第${quarter}季度`;
    }
    return `${viewConfig.start.getFullYear()} 年度`;
  };

  // Get the hovered cell's level and color for the tooltip indicator dot
  const hoveredLevel = hoveredDay ? getLevel(hoveredDay.count) : 0;
  const hoveredCellColor = CELL_COLORS[hoveredLevel].bg;

  return (
    <>
      {/* Keyframe animations for tooltip, stats, and grid transitions */}
      <style jsx global>{`
        @keyframes tooltip-enter {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes stats-fade-up {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes grid-fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>

      <div className="space-y-3" ref={containerRef}>
        {/* Stats bar with staggered fade-up animation */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 sm:gap-5 text-sm flex-wrap">
            <div
              className="flex items-center gap-1.5"
              style={{ animation: 'stats-fade-up 0.4s ease-out both', animationDelay: '0ms' }}
            >
              <span className="text-muted-foreground">连续打卡</span>
              <span className="text-primary font-bold tabular-nums">{streak}</span>
              <span className="text-muted-foreground">天</span>
            </div>
            <div className="w-px h-3 bg-border hidden sm:block" />
            <div
              className="flex items-center gap-1.5"
              style={{ animation: 'stats-fade-up 0.4s ease-out both', animationDelay: '80ms' }}
            >
              <span className="text-muted-foreground">活跃</span>
              <span className="text-primary font-bold tabular-nums">{stats.activeDays}</span>
              <span className="text-muted-foreground">天</span>
            </div>
            <div className="w-px h-3 bg-border hidden sm:block" />
            <div
              className="flex items-center gap-1.5"
              style={{ animation: 'stats-fade-up 0.4s ease-out both', animationDelay: '160ms' }}
            >
              <span className="text-muted-foreground">共</span>
              <span className="text-primary font-bold tabular-nums">{stats.total}</span>
              <span className="text-muted-foreground">篇</span>
            </div>
          </div>

          <div
            className="flex items-center gap-0.5 bg-muted/50 rounded-md p-0.5"
            role="radiogroup"
            aria-label="视图切换"
            style={{ animation: 'stats-fade-up 0.4s ease-out both', animationDelay: '240ms' }}
          >
            {(['month', 'quarter', 'year'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                role="radio"
                aria-checked={viewMode === mode}
                onClick={() => handleViewModeChange(mode)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all duration-200 ${
                  viewMode === mode
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {mode === 'month' ? '月' : mode === 'quarter' ? '季' : '年'}
              </button>
            ))}
          </div>
        </div>

        <div className="text-sm text-muted-foreground font-medium">
          {getViewTitle()}
        </div>

        <div className="relative overflow-x-auto pb-2 -mx-1 px-1">
          {viewMode === 'year' && (
            <div className="flex h-4 mb-1">
              <div className="w-8 flex-shrink-0" />
              <div className="relative flex-1">
                {monthLabels.map((label, idx) => (
                  <React.Fragment key={`${label.month}-${label.week}`}>
                    <span
                      className="absolute text-xs font-semibold text-muted-foreground/90"
                      style={{ left: `${label.week * 14}px` }}
                    >
                      {label.label}
                    </span>
                    {/* Month separator line */}
                    {idx > 0 && (
                      <span
                        className="absolute top-3 h-[calc(100%+0.25rem)] w-px bg-border/40"
                        style={{ left: `${label.week * 14 - 3}px` }}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          <div
            className="flex gap-0.5 transition-opacity duration-150"
            role="grid"
            aria-label="日报热力图"
            style={{
              opacity: isGridVisible ? 1 : 0,
              animation: isGridVisible ? 'grid-fade-in 0.2s ease-out' : 'none',
            }}
          >
            <div className="flex flex-col gap-0.5 w-8 flex-shrink-0" role="rowgroup">
              {WEEKDAY_LABELS.map((label, idx) => (
                <div
                  key={idx}
                  role="rowheader"
                  className="h-3 sm:h-3.5 flex items-center justify-end pr-1 text-xs text-muted-foreground"
                  aria-label={`星期${label}`}
                >
                  {idx % 2 === 1 ? label : ''}
                </div>
              ))}
            </div>

            <div className="flex gap-0.5 flex-1" role="rowgroup">
              {gridData.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-0.5" role="row">
                  {week.map((dayData, dayIdx) => {
                    const level = getLevel(dayData.count);
                    const isClickable = dayData.count > 0;
                    const isHovered = hoveredDay?.date === dayData.date;

                    return (
                      <ContributionCell
                        key={`${weekIdx}-${dayIdx}`}
                        dayData={dayData}
                        level={level}
                        isClickable={isClickable}
                        isHovered={isHovered}
                        onHover={handleHover}
                        onLeave={handleLeave}
                        onClick={handleClick}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {hoveredDay && (
            <div
              ref={tooltipRef}
              role="tooltip"
              className="absolute z-50 pointer-events-none"
              style={{
                ...tooltipStyle,
                animation: 'tooltip-enter 0.15s ease-out both',
              }}
            >
              {/* Tooltip body with frosted glass effect */}
              <div className="bg-popover/80 backdrop-blur-md border border-border/60 rounded-lg shadow-lg shadow-black/10 px-3 py-2 text-sm">
                <div className="font-medium text-foreground">
                  {formatDateDisplay(hoveredDay.date)}
                </div>
                <div className="text-muted-foreground mt-1">
                  {hoveredDay.count > 0 ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        {/* Colored indicator dot matching cell intensity */}
                        <span
                          className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: hoveredCellColor }}
                        />
                        <span className="text-primary font-semibold tabular-nums">{hoveredDay.count}</span> 篇日报
                      </div>
                      {hoveredDay.summary && (
                        <div className="mt-1 text-xs max-w-[200px] truncate text-muted-foreground/80">
                          {hoveredDay.summary}
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground/60">无日报</span>
                  )}
                </div>
              </div>
              {/* Arrow pointer below the tooltip */}
              <div className="flex justify-center">
                <div
                  className="w-2 h-2 rotate-45 -mt-1 bg-popover/80 border-b border-r border-border/60"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <span className="mr-0.5">少</span>
          {CELL_COLORS.map((colors, idx) => (
            <div
              key={idx}
              className="w-3.5 h-3.5 rounded transition-all"
              style={{
                backgroundColor: colors.bg,
                border: `1px solid ${colors.border}`,
                boxShadow: colors.glow,
              }}
            />
          ))}
          <span className="ml-0.5">多</span>
        </div>
      </div>
    </>
  );
}
