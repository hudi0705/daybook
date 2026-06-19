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
 * oklch gradient from warm empty to rich saturated plant-green.
 * Inspired by GitHub's contribution graph with our "晨间咖啡馆" palette:
 *   Level 0: Barely tinted warm neutral (empty state)
 *   Level 1-4: Progressive saturation with subtle lightness shift
 *
 * Key improvement: Smoother perceptual gradient using oklch
 */
const CELL_COLORS = [
  {
    bg: 'oklch(0.965 0.008 80)',
    border: 'oklch(0.93 0.008 80)',
    glow: 'none',
    label: '无',
  },
  {
    bg: 'oklch(0.88 0.055 148)',
    border: 'oklch(0.83 0.06 148)',
    glow: '0 0 4px oklch(0.88 0.055 148 / 0.25)',
    label: '1篇',
  },
  {
    bg: 'oklch(0.76 0.095 146)',
    border: 'oklch(0.70 0.10 146)',
    glow: '0 0 6px oklch(0.76 0.095 146 / 0.3)',
    label: '2篇',
  },
  {
    bg: 'oklch(0.64 0.13 143)',
    border: 'oklch(0.57 0.14 143)',
    glow: '0 0 8px oklch(0.64 0.13 143 / 0.35)',
    label: '3篇',
  },
  {
    bg: 'oklch(0.52 0.15 140)',
    border: 'oklch(0.45 0.16 140)',
    glow: '0 0 10px oklch(0.52 0.15 140 / 0.4)',
    label: '4+篇',
  },
] as const;

const RING_COLORS = [
  'oklch(0.93 0.008 80 / 0.7)',
  'oklch(0.88 0.055 148 / 0.7)',
  'oklch(0.76 0.095 146 / 0.7)',
  'oklch(0.64 0.13 143 / 0.7)',
  'oklch(0.52 0.15 140 / 0.7)',
];

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
  animationDelay,
}: {
  dayData: ContributionDay;
  level: number;
  isClickable: boolean;
  isHovered: boolean;
  onHover: (dayData: ContributionDay, el: HTMLElement) => void;
  onLeave: () => void;
  onClick: (dayData: ContributionDay) => void;
  animationDelay: number;
}) {
  const cellRef = useRef<HTMLDivElement>(null);
  const dateLabel = useMemo(() => formatDateDisplay(dayData.date), [dayData.date]);
  const ariaLabel = dayData.count > 0
    ? `${dateLabel}，${dayData.count} 篇日报`
    : `${dateLabel}，无日报`;

  const colors = CELL_COLORS[level];
  const hasActivity = level > 0;

  return (
    <div
      ref={cellRef}
      role="gridcell"
      tabIndex={isClickable ? 0 : -1}
      aria-label={ariaLabel}
      className="contribution-cell"
      data-level={level}
      data-clickable={isClickable}
      data-hovered={isHovered}
      style={{
        '--cell-bg': colors.bg,
        '--cell-border': colors.border,
        '--cell-glow': colors.glow,
        '--ring-color': RING_COLORS[level],
        '--anim-delay': `${animationDelay}ms`,
      } as React.CSSProperties}
      onClick={() => onClick(dayData)}
      onMouseEnter={(e) => onHover(dayData, e.currentTarget)}
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
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('year');
  const [isGridVisible, setIsGridVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hoveredCellRef = useRef<HTMLElement | null>(null);

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

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    if (mode === viewMode) return;
    setIsGridVisible(false);
    setTimeout(() => {
      setViewMode(mode);
      setIsGridVisible(true);
    }, 150);
  }, [viewMode]);

  const updateTooltipPosition = useCallback((cellEl: HTMLElement) => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const cellRect = cellEl.getBoundingClientRect();

    const cellCenterX = cellRect.left + cellRect.width / 2 - containerRect.left;
    const cellTop = cellRect.top - containerRect.top;

    const tooltipWidth = tooltipRef.current?.offsetWidth || 180;
    const tooltipHeight = tooltipRef.current?.offsetHeight || 60;

    let x = cellCenterX - tooltipWidth / 2;
    let y = cellTop - tooltipHeight - 8;

    // Keep tooltip within container bounds
    if (x + tooltipWidth > containerRect.width) {
      x = containerRect.width - tooltipWidth - 4;
    }
    if (x < 4) x = 4;

    // If tooltip would go above container, show below
    if (y < 0) {
      y = cellRect.bottom - containerRect.top + 8;
    }

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
    hoveredCellRef.current = el;
    updateTooltipPosition(el);
  }, [updateTooltipPosition]);

  const handleLeave = useCallback(() => {
    setHoveredDay(null);
    setTooltipPos(null);
    hoveredCellRef.current = null;
  }, []);

  // Update tooltip position on scroll/resize
  useEffect(() => {
    if (!hoveredDay || !hoveredCellRef.current) return;

    const handleUpdate = () => {
      if (hoveredCellRef.current) {
        updateTooltipPosition(hoveredCellRef.current);
      }
    };

    window.addEventListener('scroll', handleUpdate, { passive: true });
    window.addEventListener('resize', handleUpdate, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleUpdate);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [hoveredDay, updateTooltipPosition]);

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

  const getViewTitle = () => {
    if (viewMode === 'month') {
      return `${baseDate.getFullYear()}年${baseDate.getMonth() + 1}月`;
    } else if (viewMode === 'quarter') {
      const quarter = Math.floor(baseDate.getMonth() / 3) + 1;
      return `${baseDate.getFullYear()}年第${quarter}季度`;
    }
    return `${viewConfig.start.getFullYear()} 年度`;
  };

  const hoveredLevel = hoveredDay ? getLevel(hoveredDay.count) : 0;
  const hoveredCellColor = CELL_COLORS[hoveredLevel].bg;

  return (
    <>
      <style jsx global>{`
        /* Contribution cell styles */
        .contribution-cell {
          width: 12px;
          height: 12px;
          border-radius: 3px;
          background-color: var(--cell-bg);
          border: 1px solid var(--cell-border);
          box-shadow: var(--cell-glow);
          transition: all 180ms cubic-bezier(0.16, 1, 0.3, 1);
          cursor: default;
          will-change: transform;
        }

        @media (min-width: 640px) {
          .contribution-cell {
            width: 14px;
            height: 14px;
            border-radius: 3px;
          }
        }

        .contribution-cell[data-clickable="true"] {
          cursor: pointer;
        }

        .contribution-cell[data-clickable="true"]:hover,
        .contribution-cell[data-hovered="true"] {
          transform: scale(1.3) translateY(-2px);
          box-shadow:
            0 0 0 2px var(--ring-color),
            0 4px 12px oklch(0.4 0.1 140 / 0.2),
            var(--cell-glow);
          z-index: 10;
          position: relative;
        }

        .contribution-cell[data-clickable="true"]:focus-visible {
          outline: none;
          box-shadow:
            0 0 0 2px var(--ring-color),
            0 0 0 4px oklch(0.52 0.15 140 / 0.3);
        }

        /* Subtle pulse for high-activity cells */
        .contribution-cell[data-level="4"] {
          animation: cell-glow-pulse 3s ease-in-out infinite;
          animation-delay: var(--anim-delay, 0ms);
        }

        @keyframes cell-glow-pulse {
          0%, 100% { box-shadow: var(--cell-glow); }
          50% { box-shadow: 0 0 12px oklch(0.52 0.15 140 / 0.5); }
        }

        /* Tooltip animations */
        @keyframes tooltip-enter {
          from {
            opacity: 0;
            transform: translateY(4px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes stats-fade-up {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes grid-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Grid container */
        .contribution-grid {
          display: flex;
          gap: 3px;
          transition: opacity 150ms ease;
          opacity: var(--grid-opacity, 1);
        }

        .contribution-grid[style*="--grid-opacity: 0"] {
          animation: none;
        }

        .contribution-grid[style*="--grid-opacity: 1"] {
          animation: grid-fade-in 200ms ease-out;
        }
      `}</style>

      <div className="space-y-4" ref={containerRef}>
        {/* Stats bar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 sm:gap-6 text-sm">
            {[
              { label: '连续打卡', value: streak, unit: '天', delay: 0 },
              { label: '活跃', value: stats.activeDays, unit: '天', delay: 80 },
              { label: '共', value: stats.total, unit: '篇', delay: 160 },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-1.5"
                style={{ animation: `stats-fade-up 0.4s ease-out both`, animationDelay: `${stat.delay}ms` }}
              >
                <span className="text-muted-foreground">{stat.label}</span>
                <span className="text-primary font-bold tabular-nums">{stat.value}</span>
                <span className="text-muted-foreground">{stat.unit}</span>
              </div>
            ))}
          </div>

          <div
            className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5"
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
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
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

        {/* Grid container */}
        <div className="relative overflow-x-auto pb-2 -mx-1 px-1">
          {/* Month labels */}
          {viewMode === 'year' && (
            <div className="flex h-5 mb-2">
              <div className="w-8 flex-shrink-0" />
              <div className="relative flex-1">
                {monthLabels.map((label, idx) => (
                  <React.Fragment key={`${label.month}-${label.week}`}>
                    <span
                      className="absolute text-[11px] font-medium text-muted-foreground/80"
                      style={{ left: `${label.week * 17}px` }}
                    >
                      {label.label}
                    </span>
                    {idx > 0 && (
                      <span
                        className="absolute top-4 h-[calc(100%-0.25rem)] w-px bg-border/30"
                        style={{ left: `${label.week * 17 - 4}px` }}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* Contribution grid */}
          <div
            className="contribution-grid"
            role="grid"
            aria-label="日报热力图"
            style={{ '--grid-opacity': isGridVisible ? 1 : 0 } as React.CSSProperties}
          >
            {/* Weekday labels */}
            <div className="flex flex-col gap-[3px] w-8 flex-shrink-0" role="rowgroup">
              {WEEKDAY_LABELS.map((label, idx) => (
                <div
                  key={idx}
                  role="rowheader"
                  className="h-3 sm:h-3.5 flex items-center justify-end pr-1.5 text-[11px] text-muted-foreground/70"
                  aria-label={`星期${label}`}
                >
                  {idx % 2 === 1 ? label : ''}
                </div>
              ))}
            </div>

            {/* Cells */}
            <div className="flex gap-[3px] flex-1" role="rowgroup">
              {gridData.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-[3px]" role="row">
                  {week.map((dayData, dayIdx) => {
                    const level = getLevel(dayData.count);
                    const isClickable = dayData.count > 0;
                    const isHovered = hoveredDay?.date === dayData.date;
                    const animDelay = (weekIdx * 7 + dayIdx) * 15;

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
                        animationDelay={animDelay}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Tooltip */}
          {hoveredDay && tooltipPos && (
            <div
              ref={tooltipRef}
              role="tooltip"
              className="absolute z-50 pointer-events-none"
              style={{
                left: `${tooltipPos.x}px`,
                top: `${tooltipPos.y}px`,
                animation: 'tooltip-enter 0.15s ease-out both',
              }}
            >
              <div className="bg-popover/90 backdrop-blur-lg border border-border/50 rounded-lg shadow-xl shadow-black/10 px-3.5 py-2.5 text-sm min-w-[160px]">
                <div className="font-medium text-foreground text-[13px]">
                  {formatDateDisplay(hoveredDay.date)}
                </div>
                <div className="text-muted-foreground mt-1.5">
                  {hoveredDay.count > 0 ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: hoveredCellColor }}
                        />
                        <span>
                          <span className="text-primary font-semibold tabular-nums">{hoveredDay.count}</span>
                          <span className="text-muted-foreground/80"> 篇日报</span>
                        </span>
                      </div>
                      {hoveredDay.summary && (
                        <div className="mt-1.5 text-xs max-w-[200px] text-muted-foreground/70 leading-relaxed">
                          {hoveredDay.summary}
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground/50">无日报记录</span>
                  )}
                </div>
              </div>
              <div className="flex justify-center">
                <div className="w-2 h-2 rotate-45 -mt-1 bg-popover/90 border-b border-r border-border/50" />
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground/60">
            {stats.total > 0 && (
              <span>过去一年共 {stats.total} 篇日报</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="mr-0.5">少</span>
            {CELL_COLORS.map((colors, idx) => (
              <div
                key={idx}
                className="w-3 h-3 rounded-sm transition-all"
                style={{
                  backgroundColor: colors.bg,
                  border: `1px solid ${colors.border}`,
                  boxShadow: colors.glow,
                }}
                title={colors.label}
              />
            ))}
            <span className="ml-0.5">多</span>
          </div>
        </div>
      </div>
    </>
  );
}
