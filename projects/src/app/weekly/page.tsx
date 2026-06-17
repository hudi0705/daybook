'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon, SparklesIcon, TrashIcon, RefreshCwIcon, ArrowLeftIcon, CheckCircle2Icon, Wand2Icon, ListChecksIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';

interface WeeklyReport {
  id: number;
  week_start_date: string;
  week_end_date: string;
  summary: string;
  created_at: string;
}

interface DailyReport {
  id: number;
  date: string;
  title: string;
  content: string;
  mood?: string;
}

interface ExtractResult {
  points: string[];
  week_start_date: string;
  week_end_date: string;
  daily_report_count: number;
}

export default function WeeklyPage() {
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedReport, setExpandedReport] = useState<number | null>(null);
  
  // 周报生成流程状态
  const [step, setStep] = useState<'idle' | 'extracting' | 'selecting' | 'generating'>('idle');
  const [extractedPoints, setExtractedPoints] = useState<string[]>([]);
  const [selectedPoints, setSelectedPoints] = useState<Set<number>>(new Set());
  const [weekStartDate, setWeekStartDate] = useState<string>('');
  const [dailyCount, setDailyCount] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const weeklyRes = await fetch('/api/weekly-reports');
      const weeklyResult = await weeklyRes.json();
      if (weeklyResult.success) {
        setWeeklyReports(weeklyResult.data || []);
      }

      const dailyRes = await fetch('/api/daily-reports?limit=20');
      const dailyResult = await dailyRes.json();
      if (dailyResult.success) {
        setDailyReports(dailyResult.data || []);
      }
    } catch (err) {
      console.error('获取数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const getThisWeekStart = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    return monday.toISOString().split('T')[0];
  };

  // Step 1: 提取重点信息
  const handleExtractPoints = async () => {
    const weekStart = getThisWeekStart();
    setStep('extracting');
    setWeekStartDate(weekStart);
    
    try {
      const response = await fetch('/api/weekly-reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week_start_date: weekStart,
          action: 'extract',
        }),
      });
      
      const result = await response.json();
      if (result.success) {
        setExtractedPoints(result.data.points);
        setDailyCount(result.data.daily_report_count);
        setStep('selecting');
        // 默认全选前3个重点
        setSelectedPoints(new Set([0, 1, 2]));
      } else {
        alert(result.error);
        setStep('idle');
      }
    } catch (err) {
      console.error('提取重点失败:', err);
      alert('提取重点失败，请重试');
      setStep('idle');
    }
  };

  // Step 2: 根据选择生成周报
  const handleGenerateWeekly = async () => {
    if (selectedPoints.size === 0) {
      alert('请至少选择一个重点');
      return;
    }

    setStep('generating');
    const points = extractedPoints.filter((_, i) => selectedPoints.has(i));
    
    try {
      const response = await fetch('/api/weekly-reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week_start_date: weekStartDate,
          action: 'generate',
          selected_points: points,
        }),
      });
      
      const result = await response.json();
      if (result.success) {
        await fetchData();
        resetGenerateFlow();
      } else {
        alert(result.error);
        setStep('selecting');
      }
    } catch (err) {
      console.error('生成周报失败:', err);
      alert('生成周报失败，请重试');
      setStep('selecting');
    }
  };

  const resetGenerateFlow = () => {
    setStep('idle');
    setExtractedPoints([]);
    setSelectedPoints(new Set());
    setWeekStartDate('');
    setDailyCount(0);
  };

  const togglePoint = (index: number) => {
    const newSet = new Set(selectedPoints);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedPoints(newSet);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这份周报吗？')) return;

    try {
      const response = await fetch(`/api/weekly-reports?id=${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        await fetchData();
      } else {
        alert(result.error);
      }
    } catch (err) {
      console.error('删除失败:', err);
      alert('删除失败，请重试');
    }
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.getMonth() + 1}月${startDate.getDate()}日 - ${endDate.getMonth() + 1}月${endDate.getDate()}日`;
  };

  const getThisWeekDailyCount = () => {
    const weekStart = new Date(getThisWeekStart());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    return dailyReports.filter(r => {
      const reportDate = new Date(r.date);
      return reportDate >= weekStart && reportDate <= weekEnd;
    }).length;
  };

  const hasThisWeekReport = () => {
    const thisWeekStart = getThisWeekStart();
    return weeklyReports.some(r => r.week_start_date === thisWeekStart);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeftIcon className="w-5 h-5" />
              </Button>
            </Link>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center">
              <SparklesIcon className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-semibold text-foreground">周报生成</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">AI 智能汇总本周重点</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* 本周状态卡片 */}
        <section className="mb-6 sm:mb-8">
          <Card className="border-accent/20 bg-gradient-to-br from-accent/5 via-primary/5 to-accent/5">
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="text-center sm:text-left">
                    <p className="text-3xl sm:text-4xl font-bold text-accent">{getThisWeekDailyCount()}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">本周日报</p>
                  </div>
                  <div className="w-px h-12 bg-border hidden sm:block" />
                  <div className="flex items-center gap-2">
                    {hasThisWeekReport() ? (
                      <Badge variant="default" className="gap-1.5 py-1.5">
                        <CheckCircle2Icon className="w-3.5 h-3.5" />
                        已生成周报
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="py-1.5">尚未生成周报</Badge>
                    )}
                  </div>
                </div>
                {step === 'idle' && (
                  <Button
                    onClick={handleExtractPoints}
                    disabled={getThisWeekDailyCount() === 0}
                    className="gap-2 w-full sm:w-auto"
                  >
                    <Wand2Icon className="w-4 h-4" />
                    {hasThisWeekReport() ? '重新生成周报' : '开始生成周报'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 周报生成流程 */}
        {step !== 'idle' && (
          <section className="mb-6 sm:mb-8">
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  {step === 'extracting' ? (
                    <>
                      <Spinner className="w-4 h-4" />
                      正在提取重点...
                    </>
                  ) : step === 'selecting' ? (
                    <>
                      <ListChecksIcon className="w-4 h-4 text-primary" />
                      选择重点内容
                    </>
                  ) : (
                    <>
                      <Wand2Icon className="w-4 h-4 text-accent" />
                      正在生成周报...
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {step === 'extracting' && (
                  <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <SparklesIcon className="w-6 h-6 text-primary animate-pulse" />
                    </div>
                    <p className="text-sm text-muted-foreground">AI 正在分析本周日报，提取重点信息...</p>
                  </div>
                )}

                {step === 'selecting' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                      <CalendarIcon className="w-4 h-4" />
                      已从 {dailyCount} 篇日报中提取 {extractedPoints.length} 个重点
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {extractedPoints.map((point, index) => (
                        <div
                          key={index}
                          className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                            selectedPoints.has(index)
                              ? 'border-primary bg-primary/10 shadow-sm'
                              : 'border-border hover:border-primary/50 hover:bg-muted/30'
                          }`}
                          onClick={() => togglePoint(index)}
                        >
                          <Checkbox
                            checked={selectedPoints.has(index)}
                            onCheckedChange={() => togglePoint(index)}
                            className="mt-0.5 shrink-0"
                          />
                          <p className="text-sm">
                            <span className="font-medium text-primary">{index + 1}.</span> {point}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border">
                      <p className="text-sm text-muted-foreground order-2 sm:order-1">
                        已选择 <span className="font-medium text-primary">{selectedPoints.size}</span> 个重点
                      </p>
                      <div className="flex gap-2 order-1 sm:order-2 w-full sm:w-auto">
                        <Button variant="outline" onClick={resetGenerateFlow} className="flex-1 sm:flex-initial">
                          取消
                        </Button>
                        <Button
                          onClick={handleGenerateWeekly}
                          disabled={selectedPoints.size === 0}
                          className="gap-2 flex-1 sm:flex-initial"
                        >
                          <Wand2Icon className="w-4 h-4" />
                          生成周报
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {step === 'generating' && (
                  <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                      <SparklesIcon className="w-6 h-6 text-accent animate-pulse" />
                    </div>
                    <p className="text-sm text-muted-foreground">AI 正在根据选择美化生成周报...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {/* 周报历史 */}
        <section className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm sm:text-base font-semibold flex items-center gap-2">
              <SparklesIcon className="w-4 h-4 text-muted-foreground" />
              周报历史
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{weeklyReports.length} 篇</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="w-8 h-8" />
            </div>
          ) : weeklyReports.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 flex flex-col items-center justify-center">
                <Empty>
                  <EmptyMedia variant="icon">
                    <SparklesIcon />
                  </EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle>还没有周报</EmptyTitle>
                    <EmptyDescription>先写几篇日报，然后点击生成周报</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {weeklyReports.map((report) => (
                <Card key={report.id} className="overflow-hidden transition-all">
                  <CardHeader
                    className="cursor-pointer hover:bg-muted/50 transition-colors pb-3 py-4"
                    onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Badge variant="outline" className="font-mono text-xs shrink-0">
                          {formatDateRange(report.week_start_date, report.week_end_date)}
                        </Badge>
                        <Badge variant="secondary" className="text-xs gap-1">
                          <SparklesIcon className="w-3 h-3" />
                          AI 生成
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setWeekStartDate(report.week_start_date);
                            handleExtractPoints();
                          }}
                          disabled={step !== 'idle'}
                        >
                          <RefreshCwIcon className="w-3 h-3" />
                          重新生成
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(report.id);
                          }}
                        >
                          <TrashIcon className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {expandedReport === report.id && (
                    <CardContent className="bg-muted/30 border-t border-border">
                      <div className="prose prose-sm max-w-none dark:prose-invert py-4">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {report.summary}
                        </ReactMarkdown>
                      </div>
                      <div className="pt-4 border-t border-border flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          创建于 {new Date(report.created_at).toLocaleString()}
                        </p>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* 本周日报预览 */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm sm:text-base font-semibold flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-muted-foreground" />
              本周日报预览
            </h2>
          </div>

          {(() => {
            const weekStart = new Date(getThisWeekStart());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            const weekDailyReports = dailyReports.filter(r => {
              const reportDate = new Date(r.date);
              return reportDate >= weekStart && reportDate <= weekEnd;
            });

            if (weekDailyReports.length === 0) {
              return (
                <Card className="border-dashed">
                  <CardContent className="py-8 flex flex-col items-center justify-center">
                    <Empty>
                      <EmptyMedia variant="icon">
                        <CalendarIcon />
                      </EmptyMedia>
                      <EmptyHeader>
                        <EmptyTitle>本周还没有日报</EmptyTitle>
                        <EmptyDescription>去首页写几篇日报吧</EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </CardContent>
                </Card>
              );
            }

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {weekDailyReports.map((report) => (
                  <Card key={report.id} className="p-3 sm:p-4 hover:shadow-md transition-all cursor-pointer" onClick={() => window.location.href = `/daily/${report.id}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs font-mono shrink-0">
                        {report.date}
                      </Badge>
                      {report.mood && (
                        <Badge variant="secondary" className="text-xs">
                          {report.mood}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-medium text-sm mb-1 line-clamp-1">{report.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {report.content}
                    </p>
                  </Card>
                ))}
              </div>
            );
          })()}
        </section>
      </main>
    </div>
  );
}