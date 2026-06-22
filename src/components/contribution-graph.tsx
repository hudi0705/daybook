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

type ViewMode = 'year' | 'quarter' | 'month';

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];
const WEEKDAY_SHORT = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

const CELL_COLORS = [
  { bg: '#f0f0f0', border: '#e0e0e0' },
  { bg: '#c6e48b', border: '#b5d47a' },
  { bg: '#7bc96f', border: '#6ab85e' },
  { bg: '#49af5d', border: '#3a9e4c' },
  { bg: '#2e8b57', border: '#257a4a' },
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
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${WEEKDAY_SHORT[date.getDay()]}`;
};

const toDateStr = (d: Date): string => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

// ── Day Cell ──
function DayCell({
  dayData,
  size,
  hoveredDate,
  onHover,
  onLeave,
  onClick,
  showDate,
}: {
  dayData: ContributionDay;
  size: number;
  hoveredDate: string | null;
  onHover: (d: ContributionDay, el: HTMLElement) => void;
  onLeave: () => void;
  onClick: (d: ContributionDay) => void;
  showDate?: boolean;
}) {
  const level = getLevel(dayData.count);
  const isHovered = hoveredDate === dayData.date;
  const colors = CELL_COLORS[level];
  const dateNum = new Date(dayData.date + 'T00:00:00').getDate();

  return (
    <div
      className="cursor-pointer transition-colors duration-100 flex items-center justify-center relative"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: isHovered ? HOVER_COLOR : colors.bg,
        border: `1px solid ${isHovered ? HOVER_COLOR : colors.border}`,
        borderRadius: '2px',
      }}
      onClick={() => onClick(dayData)}
      onMouseEnter={(e) => onHover(dayData, e.currentTarget)}
      onMouseLeave={onLeave}
    >
      {showDate && (
        <span
          className="text-[10px] leading-none select-none"
          style={{ color: level >= 2 ? '#fff' : '#666' }}
        >
          {dateNum}
        </span>
      )}
    </div>
  );
}

// ── Month Calendar Grid ──
function MonthGrid({
  year,
  month,
  dataMap,
  cellSize,
  gap,
  hoveredDate,
  onHover,
  onLeave,
  onClick,
  showDates,
}: {
  year: number;
  month: number;
  dataMap: Map<string, ContributionDay>;
  cellSize: number;
  gap: number;
  hoveredDate: string | null;
  onHover: (d: ContributionDay, el: HTMLElement) => void;
  onLeave: () => void;
  onClick: (d: ContributionDay) => void;
  showDates: boolean;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const cells = useMemo(() => {
    const result: (ContributionDay | null)[] = [];
    for (let i = 0; i < firstDay; i++) result.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      result.push(dataMap.get(dateStr) || { date: dateStr, count: 0 });
    }
    return result;
  }, [year, month, daysInMonth, firstDay, dataMap]);

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(7, ${cellSize}px)`,
        gap: `${gap}px`,
      }}
    >
      {cells.map((dayData, i) =>
        dayData ? (
          <DayCell
            key={dayData.date}
            dayData={dayData}
            size={cellSize}
            hoveredDate={hoveredDate}
            onHover={onHover}
            onLeave={onLeave}
            onClick={onClick}
            showDate={showDates}
          />
        ) : (
          <div key={`empty-${i}`} style={{ width: cellSize, height: cellSize }} />
        )
      )}
    </div>
  );
}

// ── Main Component ──
export function ContributionGraph({ data, startDate, onDayClick }: ContributionGraphProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('year');
  const [hoveredDay, setHoveredDay] = useState<ContributionDay | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const graphRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const baseDate = startDate || new Date();
  const currentYear = baseDate.getFullYear();
  const currentMonth = baseDate.getMonth();

  const dataMap = useMemo(() => {
    const map = new Map<string, ContributionDay>();
    data.forEach(item => map.set(item.date, item));
    return map;
  }, [data]);

  // ── Year view data ──
  const { grid: yearGrid, monthLabels } = useMemo(() => {
    const today = new Date(baseDate);
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - 364);
    while (start.getDay() !== 0) start.setDate(start.getDate() - 1);

    const weeks: ContributionDay[][] = [];
    const months: { month: number; weekIndex: number; label: string }[] = [];
    let lastMonth = -1;
    const cur = new Date(start);

    while (cur <= today) {
      const week: ContributionDay[] = [];
      const weekIndex = weeks.length;
      for (let d = 0; d < 7; d++) {
        const dateStr = toDateStr(cur);
        week.push(dataMap.get(dateStr) || { date: dateStr, count: 0 });
        if (cur.getDay() === 0) {
          const m = cur.getMonth();
          if (m !== lastMonth) {
            months.push({ month: m, weekIndex, label: MONTH_NAMES[m] });
            lastMonth = m;
          }
        }
        cur.setDate(cur.getDate() + 1);
      }
      weeks.push(week);
    }
    return { grid: weeks, monthLabels: months };
  }, [baseDate, dataMap]);

  // ── Quarter view: 3 months ──
  const quarterMonths = useMemo(() => {
    const qStart = Math.floor(currentMonth / 3) * 3;
    return [0, 1, 2].map(i => ({
      year: currentYear,
      month: qStart + i,
    }));
  }, [currentYear, currentMonth]);

  // ── Stats ──
  const stats = useMemo(() => {
    const total = data.reduce((s, i) => s + i.count, 0);
    const activeDays = data.filter(i => i.count > 0).length;
    return { total, activeDays };
  }, [data]);

  // ── Tooltip ──
  const updateTooltipPos = useCallback((el: HTMLElement) => {
    if (!containerRef.current) return;
    const cr = containerRef.current.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    setTooltipPos({
      x: er.left + er.width / 2 - cr.left,
      y: er.top - cr.top,
    });
  }, []);

  const handleClick = useCallback((d: ContributionDay) => {
    if (d.count > 0 && onDayClick) onDayClick(d.date);
    else if (d.count > 0) router.push(`/daily?date=${d.date}`);
  }, [onDayClick, router]);

  const handleHover = useCallback((d: ContributionDay, el: HTMLElement) => {
    setHoveredDay(d);
    updateTooltipPos(el);
  }, [updateTooltipPos]);

  const handleLeave = useCallback(() => {
    setHoveredDay(null);
    setTooltipPos(null);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setHoveredDay(null); setTooltipPos(null); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const yearCellSize = 12;
  const yearGap = 3;
  const labelW = 28;
  const gridH = 7 * yearCellSize + 6 * yearGap;

  return (
    <div className="space-y-3">
      {/* Header: stats + view switcher */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>过去一年共 <span className="font-semibold text-foreground">{stats.total}</span> 篇</span>
          <span>活跃 <span className="font-semibold text-foreground">{stats.activeDays}</span> 天</span>
        </div>
        <div className="flex items-center rounded-md border overflow-hidden text-xs">
          {([['year', '年'], ['quarter', '季'], ['month', '月']] as [ViewMode, string][]).map(([mode, label]) => (
            <button
              key={mode}
              className={`px-2.5 py-1 transition-colors ${viewMode === mode ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              onClick={() => setViewMode(mode)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Graph container */}
      <div className="relative" ref={containerRef}>
        {/* ── Year View ── */}
        {viewMode === 'year' && (
          <div ref={graphRef}>
            <div className="relative" style={{ height: '16px', marginLeft: `${labelW}px` }}>
              {monthLabels.map(({ month, weekIndex, label }) => (
                <span
                  key={`${month}-${weekIndex}`}
                  className="absolute text-[10px] text-muted-foreground whitespace-nowrap"
                  style={{ left: `${weekIndex * (yearCellSize + yearGap)}px` }}
                >
                  {label}
                </span>
              ))}
            </div>
            <div className="flex mt-1" style={{ height: `${gridH}px` }}>
              <div style={{ width: `${labelW}px` }} className="flex-shrink-0">
                {WEEKDAY_LABELS.map((label, idx) => (
                  <div
                    key={idx}
                    className="text-[10px] text-muted-foreground text-right pr-1"
                    style={{
                      height: `${yearCellSize}px`,
                      marginBottom: idx < 6 ? `${yearGap}px` : 0,
                      lineHeight: `${yearCellSize}px`,
                    }}
                  >
                    {label}
                  </div>
                ))}
              </div>
              <div className="flex flex-1 min-w-0" style={{ gap: `${yearGap}px` }}>
                {yearGrid.map((week, wi) => (
                  <div key={wi} className="flex-1 min-w-0 flex flex-col" style={{ gap: `${yearGap}px` }}>
                    {week.map((dayData) => (
                      <DayCell
                        key={dayData.date}
                        dayData={dayData}
                        size={yearCellSize}
                        hoveredDate={hoveredDay?.date ?? null}
                        onHover={handleHover}
                        onLeave={handleLeave}
                        onClick={handleClick}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Quarter View ── */}
        {viewMode === 'quarter' && (
          <div>
            <div className="text-sm text-muted-foreground mb-3">
              {currentYear}年 第{Math.floor(currentMonth / 3) + 1}季度
            </div>
            <div className="flex gap-6" ref={graphRef}>
              {quarterMonths.map(({ year, month }) => (
                <div key={`${year}-${month}`} className="flex-1">
                  <div className="text-xs text-muted-foreground font-medium mb-2">{MONTH_NAMES[month]}</div>
                  <div className="flex gap-0.5 mb-1">
                    {WEEKDAY_LABELS.map((l, i) => (
                      <div key={i} className="text-[9px] text-muted-foreground text-center" style={{ width: 24 }}>
                        {l}
                      </div>
                    ))}
                  </div>
                  <MonthGrid
                    year={year}
                    month={month}
                    dataMap={dataMap}
                    cellSize={24}
                    gap={2}
                    hoveredDate={hoveredDay?.date ?? null}
                    onHover={handleHover}
                    onLeave={handleLeave}
                    onClick={handleClick}
                    showDates
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Month View ── */}
        {viewMode === 'month' && (
          <div ref={graphRef}>
            <div className="text-sm text-muted-foreground mb-3">
              {currentYear}年{currentMonth + 1}月
            </div>
            <div className="flex gap-1 mb-2">
              {WEEKDAY_LABELS.map((l, i) => (
                <div key={i} className="text-xs text-muted-foreground text-center font-medium" style={{ width: 44 }}>
                  {l}
                </div>
              ))}
            </div>
            <MonthGrid
              year={currentYear}
              month={currentMonth}
              dataMap={dataMap}
              cellSize={44}
              gap={4}
              hoveredDate={hoveredDay?.date ?? null}
              onHover={handleHover}
              onLeave={handleLeave}
              onClick={handleClick}
              showDates
            />
          </div>
        )}

        {/* Tooltip */}
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
                  <span><span className="font-semibold text-foreground">{hoveredDay.count}</span> 篇日报</span>
                ) : '无日报记录'}
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
        <div className="text-xs text-muted-foreground">点击有日报的日期可查看详情</div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>少</span>
          {CELL_COLORS.map((c, i) => (
            <div key={i} className="w-3 h-3" style={{ backgroundColor: c.bg, border: `1px solid ${c.border}`, borderRadius: '2px' }} />
          ))}
          <span>多</span>
        </div>
      </div>
    </div>
  );
}
