'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { ContributionGraph } from '@/components/contribution-graph';
import {
  FileTextIcon,
  SparklesIcon,
  TrashIcon,
  EditIcon,
  ActivityIcon,
  PenLineIcon,
  CalendarDaysIcon,
  TrendingUpIcon,
  BookOpenIcon,
} from 'lucide-react';
import Link from 'next/link';

interface DailyReport {
  id: number;
  date: string;
  title: string;
  content: string;
  mood?: string;
  tags?: string[];
  created_at: string;
}

interface ContributionDay {
  date: string;
  count: number;
  summary?: string;
}

const moodOptions = ['开心', '平静', '疲惫', '焦虑', '充实', '迷茫', '兴奋', '失落'];

export default function HomePage() {
  const router = useRouter();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<DailyReport | null>(null);
  const [contributionData, setContributionData] = useState<ContributionDay[]>([]);
  const [contributionLoading, setContributionLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchReports();
    fetchContribution();
  }, []);

  // Lock body scroll when dialog is open
  useEffect(() => {
    if (dialogOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [dialogOpen]);

  const fetchReports = async () => {
    try {
      const response = await fetch('/api/daily-reports');
      const result = await response.json();
      if (result.success) {
        setReports(result.data || []);
      }
    } catch (err) {
      console.error('获取日报失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchContribution = async () => {
    try {
      const response = await fetch('/api/contribution');
      const result = await response.json();
      if (result.success) {
        setContributionData(result.data || []);
      }
    } catch (err) {
      console.error('获取热力图数据失败:', err);
    } finally {
      setContributionLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedDate || !title.trim() || !content.trim()) return;

    setSaving(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const tagArray = tags.split(',').map(t => t.trim()).filter(t => t);

      const method = editingReport ? 'PUT' : 'POST';
      const body = editingReport
        ? { id: editingReport.id, title, content, mood, tags: tagArray }
        : { date: dateStr, title, content, mood, tags: tagArray };

      const response = await fetch('/api/daily-reports', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (result.success) {
        await fetchReports();
        await fetchContribution();
        resetForm();
      } else {
        alert(result.error);
      }
    } catch (err) {
      console.error('保存失败:', err);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这篇日报吗？')) return;
    try {
      const response = await fetch(`/api/daily-reports?id=${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        await fetchReports();
        await fetchContribution();
      } else {
        alert(result.error);
      }
    } catch (err) {
      console.error('删除失败:', err);
      alert('删除失败，请重试');
    }
  };

  const resetForm = useCallback(() => {
    setDialogOpen(false);
    setEditingReport(null);
    setTitle('');
    setContent('');
    setMood('');
    setTags('');
    setSelectedDate(new Date());
  }, []);

  const openEditDialog = (report: DailyReport) => {
    setEditingReport(report);
    setSelectedDate(new Date(report.date));
    setTitle(report.title);
    setContent(report.content);
    setMood(report.mood || '');
    setTags((report.tags || []).join(', '));
    setDialogOpen(true);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`;
  };

  const getWeekStartDate = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    return monday.toISOString().split('T')[0];
  };

  const getThisWeekCount = () => {
    const weekStart = new Date(getWeekStartDate());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return reports.filter(r => {
      const reportDate = new Date(r.date);
      return reportDate >= weekStart && reportDate <= weekEnd;
    }).length;
  };

  const streak = (() => {
    const sorted = [...reports].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let count = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const r of sorted) {
      const d = new Date(r.date);
      d.setHours(0, 0, 0, 0);
      const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
      if (diff === count) count++;
      else break;
    }
    return count;
  })();

  const latestDate = reports.length > 0 ? reports[0].date : null;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpenIcon className="w-[18px] h-[18px] text-primary" />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold text-foreground tracking-tight">日报</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">记录每一天</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/weekly">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                <SparklesIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">周报</span>
              </Button>
            </Link>
            <Link href="/notes">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                <FileTextIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">笔记</span>
              </Button>
            </Link>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 text-xs" onClick={() => setEditingReport(null)}>
                  <PenLineIcon className="w-3.5 h-3.5" />
                  写日报
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingReport ? '编辑日报' : '写日报'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>日期</Label>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      className="rounded-md border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">标题</Label>
                    <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="今天做了什么..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">内容</Label>
                    <Textarea
                      id="content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="详细记录今天的工作、学习、生活..."
                      rows={12}
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">支持 Markdown 格式</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => {
                          const now = new Date();
                          const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                          const ds = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${weekdays[now.getDay()]}`;
                          setContent(`今日工作总结（${ds}）\n1. \n2. \n3. \n\n明日工作安排（${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate() + 1}-${weekdays[(now.getDay() + 1) % 7]}）\n1. \n2. \n3. `);
                        }}
                      >
                        使用模板
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>心情</Label>
                    <div className="flex gap-2 flex-wrap">
                      {moodOptions.map((m) => (
                        <Badge
                          key={m}
                          variant={mood === m ? 'default' : 'outline'}
                          className="cursor-pointer hover:bg-primary/10 transition-colors"
                          onClick={() => setMood(m)}
                        >
                          {m}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tags">标签（逗号分隔）</Label>
                    <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="工作, 学习, 运动..." />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={resetForm}>取消</Button>
                    <Button onClick={handleSubmit} disabled={!title.trim() || !content.trim() || saving}>
                      {saving ? <Spinner className="w-4 h-4" /> : '保存'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-6xl mx-auto px-5 sm:px-8">
        {/* Greeting + 快捷导航 */}
        <section className="pt-8 pb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              {(() => {
                const h = new Date().getHours();
                if (h < 6) return '夜深了';
                if (h < 12) return '早上好';
                if (h < 14) return '中午好';
                if (h < 18) return '下午好';
                return '晚上好';
              })()}
            </h2>
            <p className="text-sm text-muted-foreground mt-1.5">
              {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </p>
          </div>
        </section>

        {/* ── 统计条 ── */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: '总日报', value: reports.length, unit: '篇', icon: FileTextIcon, accent: false },
            { label: '本周', value: getThisWeekCount(), unit: '篇', icon: CalendarDaysIcon, accent: true },
            { label: '连续打卡', value: streak, unit: '天', icon: TrendingUpIcon, accent: false },
            { label: '最新', value: latestDate ? formatDate(latestDate) : '—', unit: '', icon: ActivityIcon, accent: false },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border/40"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${stat.accent ? 'bg-accent/10' : 'bg-primary/8'}`}>
                <stat.icon className={`w-4 h-4 ${stat.accent ? 'text-accent/70' : 'text-primary/70'}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className={`text-lg font-bold leading-tight truncate ${stat.accent ? 'text-accent' : 'text-foreground'}`}>
                  {stat.value}
                  {stat.unit && <span className="text-xs font-normal text-muted-foreground ml-0.5">{stat.unit}</span>}
                </p>
              </div>
            </div>
          ))}
        </section>

        {/* ── 热力图 ── */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <ActivityIcon className="w-4 h-4 text-primary/60" />
            <h3 className="text-sm font-medium text-foreground">提交记录</h3>
          </div>
          <div className="px-4 py-5 rounded-xl bg-card border border-border/40">
            {contributionLoading ? (
              <div className="flex items-center justify-center py-10">
                <Spinner className="w-6 h-6" />
              </div>
            ) : (
              <ContributionGraph
                data={contributionData}
                onDayClick={(date) => {
                  const report = reports.find(r => r.date === date);
                  if (report) router.push(`/daily/${report.id}`);
                }}
              />
            )}
          </div>
        </section>

        {/* ── 日报列表 ── */}
        <section className="pb-16">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileTextIcon className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">日报列表</h3>
            </div>
            <span className="text-xs text-muted-foreground">{reports.length} 篇</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner className="w-7 h-7" />
            </div>
          ) : reports.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mb-4">
                <FileTextIcon className="w-5 h-5 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">还没有日报</p>
              <p className="text-xs text-muted-foreground">点击右上角「写日报」开始记录</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {reports.map((report) => (
                <Card
                  key={report.id}
                  className="group cursor-pointer border-border/40 hover:border-border hover:shadow-sm transition-all duration-200"
                  onClick={() => router.push(`/daily/${report.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="text-xs font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                        {formatDate(report.date)}
                      </span>
                      {report.mood && (
                        <span className="text-xs text-accent">{report.mood}</span>
                      )}
                    </div>
                    <h4 className="font-medium text-sm mb-1.5 line-clamp-1 text-foreground">
                      {report.title}
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">
                      {report.content}
                    </p>
                    {report.tags && report.tags.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap mb-2">
                        {report.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[11px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                        {report.tags.length > 3 && (
                          <span className="text-[11px] text-muted-foreground">+{report.tags.length - 3}</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/30 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] gap-1 px-2 text-muted-foreground hover:text-foreground"
                        onClick={(e) => { e.stopPropagation(); openEditDialog(report); }}
                      >
                        <EditIcon className="w-3 h-3" />
                        编辑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] gap-1 px-2 text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDelete(report.id); }}
                      >
                        <TrashIcon className="w-3 h-3" />
                        删除
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
