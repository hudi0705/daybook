'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';
import { RichTextEditor } from '@/components/rich-text-editor';
import { ContributionGraph } from '@/components/contribution-graph';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { exportDailyReportPDF, exportDailyReportWord, exportDailyReportMarkdown } from '@/lib/export/daily-report';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ScrollTextIcon,
  BarChart3Icon,
  Trash2Icon,
  SquarePenIcon,
  ClockIcon,
  NotebookPenIcon,
  CalendarDaysIcon,
  FootprintsIcon,
  BookMarkedIcon,
  CalendarIcon,
  XIcon,
  StickyNoteIcon,
  FlameIcon,
  SendIcon,
  ChevronDownIcon,
  LayoutGridIcon,
  Rows3Icon,
  DownloadIcon,
  FileTextIcon,
  FileIcon,
  FileTypeIcon,
  UserIcon,
  LogOutIcon,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface DailyReport {
  id: number;
  date: string;
  title: string;
  content: string;
  mood?: string;
  tags?: string[];
  created_at: string;
}

interface WeeklyReport {
  id: number;
  week_start_date: string;
  week_end_date: string;
  summary: string;
  created_at: string;
}

interface ContributionDay {
  date: string;
  count: number;
  summary?: string;
}

const moodOptions = [
  { emoji: '😊', label: '开心' },
  { emoji: '😌', label: '平静' },
  { emoji: '😩', label: '疲惫' },
  { emoji: '😰', label: '焦虑' },
  { emoji: '💪', label: '充实' },
  { emoji: '🤔', label: '迷茫' },
  { emoji: '🔥', label: '兴奋' },
  { emoji: '😔', label: '失落' },
];

const quickTemplates = [
  {
    name: '工作日志',
    icon: '💼',
    content: (date: Date) => {
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const ds = `${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`;
      const tomorrow = new Date(date);
      tomorrow.setDate(date.getDate() + 1);
      const ts = `${tomorrow.getMonth() + 1}月${tomorrow.getDate()}日 ${weekdays[tomorrow.getDay()]}`;
      return `<h2>今日工作总结（${ds}）</h2><ol><li></li><li></li><li></li></ol><h2>明日工作安排（${ts}）</h2><ol><li></li><li></li><li></li></ol>`;
    },
  },
  {
    name: '学习笔记',
    icon: '📚',
    content: () => `<h2>学习内容</h2><ul><li></li></ul><h2>收获与心得</h2><ul><li></li></ul><h2>待深入</h2><ul><li></li></ul>`,
  },
  {
    name: '简短记录',
    icon: '⚡',
    content: () => `<p>今天做了：</p>`,
  },
];

// 去除 HTML 标签，检查纯文本是否为空
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

// 格式化日期为 YYYY-MM-DD（本地时间，避免时区偏移）
function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 解析日期字符串为 Date 对象（仅取日期部分，忽略时间）
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  // 取前 10 位作为日期部分
  const datePart = dateStr.slice(0, 10);
  const parts = datePart.split('-');
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  if (isNaN(date.getTime())) return null;
  return date;
}

// 获取日期所在周的周一（ISO 周，周一为起始）
function getMonday(dateStr: string): string | null {
  const date = parseDate(dateStr);
  if (!date) return null;
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return formatDateISO(date);
}

// 获取周一对应的周日
function getSunday(mondayStr: string): string {
  const parts = mondayStr.split('-');
  const [y, m, d] = parts.map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + 6);
  return formatDateISO(date);
}

// 按周分组日报，返回按周一日期倒序的 Map
function groupReportsByWeek(reports: DailyReport[]): Map<string, DailyReport[]> {
  const groups = new Map<string, DailyReport[]>();
  for (const report of reports) {
    const monday = getMonday(report.date);
    if (!monday) continue;
    if (!groups.has(monday)) groups.set(monday, []);
    groups.get(monday)!.push(report);
  }
  // 每组内按日期倒序
  for (const [, group] of groups) {
    group.sort((a, b) => b.date.localeCompare(a.date));
  }
  // 组间按周一倒序
  return new Map([...groups.entries()].sort((a, b) => b[0].localeCompare(a[0])));
}

export default function HomePage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<DailyReport | null>(null);
  const [contributionData, setContributionData] = useState<ContributionDay[]>([]);
  const [contributionLoading, setContributionLoading] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
  const [viewMode, setViewMode] = useState<'week' | 'grid'>('week');

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput('');
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  useEffect(() => {
    fetchReports();
    fetchContribution();
    fetchWeeklyReports();
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

  const fetchWeeklyReports = async () => {
    try {
      const response = await fetch('/api/weekly-reports');
      const result = await response.json();
      if (result.success) {
        setWeeklyReports(result.data || []);
      }
    } catch (err) {
      console.error('获取周报失败:', err);
    }
  };

  // 周报按 week_start_date 索引（标准化为 YYYY-MM-DD）
  const weeklyReportMap = useMemo(() => {
    const map = new Map<string, WeeklyReport>();
    weeklyReports.forEach(wr => {
      const key = wr.week_start_date.slice(0, 10);
      map.set(key, wr);
    });
    return map;
  }, [weeklyReports]);

  const handleSubmit = async () => {
    if (!selectedDate || !title.trim() || !stripHtml(content)) return;

    setSaving(true);
    try {
      const dateStr = formatDateISO(selectedDate);

      const method = editingReport ? 'PUT' : 'POST';
      const body = editingReport
        ? { id: editingReport.id, date: dateStr, title, content, mood, tags }
        : { date: dateStr, title, content, mood, tags };

      const response = await fetch('/api/daily-reports', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok && response.status >= 500) {
        console.error('API 响应异常:', response.status, response.statusText);
      }

      const result = await response.json();
      if (result.success) {
        await fetchReports();
        await fetchContribution();
        toast.success(editingReport ? '日报已更新' : '日报已保存', {
          description: `${dateStr} 的日报已成功${editingReport ? '更新' : '保存'}`,
        });
        resetForm();
      } else {
        console.error('保存失败 - 服务端返回:', result.error);
        toast.error('保存失败', {
          description: result.error || '请重试',
        });
      }
    } catch (err) {
      console.error('保存失败 - 请求异常:', err);
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
        toast.success('日报已删除');
      } else {
        console.error('删除失败 - 服务端返回:', result.error);
        toast.error('删除失败', {
          description: result.error || '请重试',
        });
      }
    } catch (err) {
      console.error('删除失败 - 请求异常:', err);
      toast.error('删除失败', {
        description: '请重试',
      });
    }
  };

  const resetForm = useCallback(() => {
    setDialogOpen(false);
    setEditingReport(null);
    setTitle('');
    setContent('');
    setMood('');
    setTags([]);
    setTagInput('');
    setSelectedDate(new Date());
  }, []);

  const openEditDialog = (report: DailyReport) => {
    setEditingReport(report);
    const dateStr = String(report.date || '').slice(0, 10);
    const parts = dateStr.split('-');
    const y = Number(parts[0]) || new Date().getFullYear();
    const m = Number(parts[1]) || (new Date().getMonth() + 1);
    const d = Number(parts[2]) || new Date().getDate();
    const parsed = new Date(y, m - 1, d);
    setSelectedDate(isNaN(parsed.getTime()) ? new Date() : parsed);
    setTitle(report.title);
    setContent(report.content);
    setMood(report.mood || '');
    setTags(report.tags || []);
    setTagInput('');
    setDialogOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (title.trim() && stripHtml(content) && !saving) {
        handleSubmit();
      }
    }
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
    return formatDateISO(monday);
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

  const weekGroups = groupReportsByWeek(reports);
  const currentWeekMonday = getWeekStartDate();

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookMarkedIcon className="w-[18px] h-[18px] text-primary" />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold text-foreground tracking-tight">日报</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">记录每一天</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/weekly">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                <BarChart3Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">周报</span>
              </Button>
            </Link>
            <Link href="/notes">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                <StickyNoteIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">笔记</span>
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                  <UserIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{user?.display_name || user?.username || '用户'}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={logout} className="gap-2 text-xs">
                  <LogOutIcon className="w-3.5 h-3.5" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 text-xs" onClick={() => setEditingReport(null)}>
                  <NotebookPenIcon className="w-3.5 h-3.5" />
                  写日报
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[560px] max-h-[85vh] flex flex-col p-0">
                {/* ── Header: green surface with hero date ── */}
                <div className="relative bg-primary px-6 pt-5 pb-6 overflow-hidden flex-shrink-0">
                  {/* Subtle grain texture */}
                  <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }} />

                  <div className="relative flex items-end justify-between">
                    <div>
                      <DialogTitle className="text-white/70 text-xs font-medium tracking-wider uppercase mb-2">
                        {editingReport ? '编辑日报' : '记录今天'}
                      </DialogTitle>
                      <div className="flex items-baseline gap-2">
                        <span className="text-6xl font-black text-white leading-none tracking-tighter">
                          {selectedDate?.getDate()}
                        </span>
                        <span className="text-xl font-bold text-white/70 leading-none">
                          {selectedDate?.toLocaleDateString('zh-CN', { month: 'long' })}
                        </span>
                      </div>
                      <p className="text-sm text-white/50 mt-1.5">
                        {selectedDate?.toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric' })}
                      </p>
                    </div>

                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white/90 text-xs cursor-pointer transition-colors duration-150 backdrop-blur-sm"
                        >
                          <CalendarIcon className="w-3.5 h-3.5" />
                          更换日期
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={selectedDate instanceof Date && !isNaN(selectedDate.getTime()) ? selectedDate : new Date()}
                          onSelect={setSelectedDate}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* ── Body ── */}
                <div className="px-6 pt-6 pb-5 space-y-6 flex-1 overflow-y-auto min-h-0" onKeyDown={handleKeyDown}>
                  {/* Title: large, commanding */}
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="给今天起个标题..."
                    className="w-full text-2xl font-bold text-foreground placeholder:text-muted-foreground/30 bg-transparent border-none outline-none focus:ring-0 tracking-tight"
                  />

                  {/* Templates: inline pill group */}
                  <div className="flex gap-1.5 flex-wrap">
                    {quickTemplates.map((t) => (
                      <button
                        key={t.name}
                        type="button"
                        onClick={() => setContent(t.content(selectedDate || new Date()))}
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-full border border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all duration-150"
                      >
                        <span className="text-xs">{t.icon}</span>
                        {t.name}
                      </button>
                    ))}
                  </div>

                  {/* Content */}
                  <RichTextEditor
                    value={content}
                    onChange={setContent}
                    placeholder="记录今天的工作、学习、生活..."
                    minHeight="200px"
                    maxHeight="320px"
                  />

                  {/* Mood: large expressive emojis */}
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-3">心情</p>
                    <div className="flex flex-wrap gap-2.5">
                      {moodOptions.map((m) => (
                        <button
                          key={m.label}
                          type="button"
                          onClick={() => setMood(mood === m.label ? '' : m.label)}
                          className={`flex flex-col items-center gap-1 px-3.5 py-2.5 rounded-xl transition-all duration-200 ${
                            mood === m.label
                              ? 'bg-primary/10 border border-primary/25 shadow-sm scale-105'
                              : 'bg-muted/40 border border-transparent hover:bg-muted/70 hover:scale-105'
                          }`}
                        >
                          <span className="text-xl leading-none">{m.emoji}</span>
                          <span className={`text-[10px] font-medium ${mood === m.label ? 'text-primary' : 'text-muted-foreground/70'}`}>{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-3">标签</p>
                    <div className="flex flex-wrap gap-1.5 items-center min-h-[36px] rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition-all duration-150">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent/10 text-accent text-xs font-medium"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="hover:text-accent/70 transition-colors"
                          >
                            <XIcon className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      <input
                        value={tagInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.endsWith(',')) {
                            addTag(val.slice(0, -1));
                          } else {
                            setTagInput(val);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
                            e.preventDefault();
                            e.stopPropagation();
                            addTag(tagInput);
                          }
                          if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
                            removeTag(tags[tags.length - 1]);
                          }
                        }}
                        placeholder={tags.length === 0 ? "输入标签，按回车添加..." : "继续添加..."}
                        className="flex-1 min-w-[120px] text-xs bg-transparent border-none outline-none placeholder:text-muted-foreground/40"
                      />
                    </div>
                  </div>
                </div>

                {/* ── Footer ── */}
                <div className="px-6 py-5 border-t border-border/40 flex items-center justify-between flex-shrink-0">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                  >
                    取消
                  </button>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-muted-foreground/50 hidden sm:inline-flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-muted/60 border border-border/40 text-[10px] font-mono">Ctrl</kbd>
                      <span>+</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-muted/60 border border-border/40 text-[10px] font-mono">Enter</kbd>
                    </span>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={!title.trim() || !stripHtml(content) || saving}
                      className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 shadow-sm"
                    >
                      {saving ? <Spinner className="w-3.5 h-3.5" /> : <SendIcon className="w-3.5 h-3.5" />}
                      {saving ? '保存中...' : '保存日报'}
                    </button>
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
            { label: '总日报', value: reports.length, unit: '篇', icon: ScrollTextIcon, accent: false },
            { label: '本周', value: getThisWeekCount(), unit: '篇', icon: CalendarDaysIcon, accent: true },
            { label: '连续打卡', value: streak, unit: '天', icon: FootprintsIcon, accent: false },
            { label: '最新', value: latestDate ? formatDate(latestDate) : '—', unit: '', icon: ClockIcon, accent: false },
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
            <FlameIcon className="w-4 h-4 text-primary/60" />
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
              <ScrollTextIcon className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">日报列表</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{reports.length} 篇</span>
              <div className="flex items-center bg-muted/40 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('week')}
                  className={`p-1.5 rounded-md transition-all duration-150 ${
                    viewMode === 'week'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="按周折叠"
                >
                  <Rows3Icon className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-all duration-150 ${
                    viewMode === 'grid'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="全部排列"
                >
                  <LayoutGridIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner className="w-7 h-7" />
            </div>
          ) : reports.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mb-4">
                <ScrollTextIcon className="w-5 h-5 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">还没有日报</p>
              <p className="text-xs text-muted-foreground">点击右上角「写日报」开始记录</p>
            </div>
          ) : viewMode === 'week' ? (
            <div className="space-y-8">
              {[...weekGroups.entries()].map(([monday, weekReports], weekIdx) => {
                const sunday = getSunday(monday);
                const isCurrentWeek = monday === currentWeekMonday;
                return (
                  <Collapsible key={monday} defaultOpen={isCurrentWeek}>
                    <div className="relative">
                      {/* Timeline connector */}
                      {weekIdx < weekGroups.size - 1 && (
                        <div className="absolute left-[11px] top-[40px] bottom-[-32px] w-px bg-border/40" />
                      )}

                      {/* Week header */}
                      <CollapsibleTrigger className="flex items-center gap-3 w-full group/week cursor-pointer py-2.5 px-3 rounded-xl hover:bg-card/80 transition-all duration-200">
                        {/* Timeline dot */}
                        <div className={`relative z-10 w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${
                          isCurrentWeek
                            ? 'bg-primary shadow-sm shadow-primary/20'
                            : 'bg-muted border-2 border-border group-hover/week:border-primary/40'
                        }`}>
                          <ChevronDownIcon className={`w-3 h-3 transition-transform duration-200 ${
                            isCurrentWeek ? 'text-white' : 'text-muted-foreground'
                          } group-data-[state=open]/week:rotate-180`} />
                        </div>

                        {/* Date range */}
                        <div className="flex items-baseline gap-2 min-w-0 flex-1">
                          <span className="text-sm font-semibold text-foreground tracking-tight">
                            {formatDate(monday)}
                          </span>
                          <span className="text-xs text-muted-foreground/60">至</span>
                          <span className="text-sm font-semibold text-foreground tracking-tight">
                            {formatDate(sunday)}
                          </span>
                        </div>

                        {/* Count badge */}
                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                          isCurrentWeek
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {weekReports.length} 篇
                        </span>
                      </CollapsibleTrigger>

                      {/* Cards grid */}
                      <CollapsibleContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 pl-[34px]">
                          {/* 周报卡片 */}
                          {weeklyReportMap.has(monday) && (() => {
                            const wr = weeklyReportMap.get(monday)!;
                            return (
                              <Card
                                key={`weekly-${wr.id}`}
                                className="col-span-1 sm:col-span-2 lg:col-span-3 cursor-pointer border-accent/30 bg-accent/[0.04] hover:border-accent/50 hover:shadow-md hover:shadow-accent/[0.06] transition-all duration-200 group/wr"
                                onClick={() => router.push(`/weekly/${wr.id}`)}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-[11px] font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                                      <BarChart3Icon className="w-3 h-3" />
                                      周报
                                    </span>
                                    <span className="text-[11px] text-muted-foreground">
                                      {formatDate(wr.week_start_date)} 至 {formatDate(wr.week_end_date)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed whitespace-pre-wrap">
                                    {wr.summary.length > 200 ? wr.summary.slice(0, 200) + '...' : wr.summary}
                                  </p>
                                  <div className="flex items-center gap-1 mt-2 pt-2 border-t border-accent/10 opacity-0 group-hover/wr:opacity-100 transition-opacity duration-150">
                                    <span className="text-[11px] text-accent/70">点击查看完整周报 →</span>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })()}

                          {weekReports.map((report) => (
                            <Card
                              key={report.id}
                              className="group cursor-pointer border-border/30 hover:border-primary/20 hover:shadow-md hover:shadow-primary/[0.04] transition-all duration-200 bg-card/60 hover:bg-card"
                              onClick={() => router.push(`/daily/${report.id}`)}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-2.5">
                                  <span className="text-[11px] font-medium text-primary/70 bg-primary/5 px-2 py-0.5 rounded-md">
                                    {formatDate(report.date)}
                                  </span>
                                  {report.mood && (
                                    <span className="text-xs text-accent">{report.mood}</span>
                                  )}
                                </div>
                                <h4 className="font-medium text-sm mb-1.5 line-clamp-1 text-foreground group-hover:text-primary/90 transition-colors duration-150">
                                  {report.title}
                                </h4>
                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">
                                  {stripHtml(report.content)}
                                </p>
                                {report.tags && report.tags.length > 0 && (
                                  <div className="flex gap-1.5 flex-wrap mb-2">
                                    {report.tags.slice(0, 3).map((tag) => (
                                      <span key={tag} className="text-[11px] text-accent/80 bg-accent/8 px-1.5 py-0.5 rounded-md">
                                        {tag}
                                      </span>
                                    ))}
                                    {report.tags.length > 3 && (
                                      <span className="text-[11px] text-muted-foreground">+{report.tags.length - 3}</span>
                                    )}
                                  </div>
                                )}
                                <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/20 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[11px] gap-1 px-2 text-muted-foreground hover:text-foreground"
                                    onClick={(e) => { e.stopPropagation(); openEditDialog(report); }}
                                  >
                                    <SquarePenIcon className="w-3 h-3" />
                                    编辑
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-[11px] gap-1 px-2 text-muted-foreground hover:text-foreground"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <DownloadIcon className="w-3 h-3" />
                                        导出
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-36">
                                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); exportDailyReportPDF(report); }} className="gap-2 text-xs">
                                        <FileTextIcon className="w-3.5 h-3.5 text-red-500" />
                                        导出 PDF
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); exportDailyReportWord(report); }} className="gap-2 text-xs">
                                        <FileIcon className="w-3.5 h-3.5 text-blue-500" />
                                        导出 Word
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); exportDailyReportMarkdown(report); }} className="gap-2 text-xs">
                                        <FileTypeIcon className="w-3.5 h-3.5 text-green-500" />
                                        导出 Markdown
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[11px] gap-1 px-2 text-muted-foreground hover:text-destructive"
                                    onClick={(e) => { e.stopPropagation(); handleDelete(report.id); }}
                                  >
                                    <Trash2Icon className="w-3 h-3" />
                                    删除
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          ) : (
            /* Grid view */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 周报卡片（按时间倒序） */}
              {weeklyReports.map((wr) => (
                <Card
                  key={`weekly-${wr.id}`}
                  className="cursor-pointer border-accent/30 bg-accent/[0.04] hover:border-accent/50 hover:shadow-md hover:shadow-accent/[0.06] transition-all duration-200 group/wr"
                  onClick={() => router.push(`/weekly/${wr.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <BarChart3Icon className="w-3 h-3" />
                        周报
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDate(wr.week_start_date)} 至 {formatDate(wr.week_end_date)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed whitespace-pre-wrap">
                      {wr.summary.length > 200 ? wr.summary.slice(0, 200) + '...' : wr.summary}
                    </p>
                  </CardContent>
                </Card>
              ))}

              {reports.map((report) => (
                <Card
                  key={report.id}
                  className="group cursor-pointer border-border/30 hover:border-primary/20 hover:shadow-md hover:shadow-primary/[0.04] transition-all duration-200 bg-card/60 hover:bg-card"
                  onClick={() => router.push(`/daily/${report.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="text-[11px] font-medium text-primary/70 bg-primary/5 px-2 py-0.5 rounded-md">
                        {formatDate(report.date)}
                      </span>
                      {report.mood && (
                        <span className="text-xs text-accent">{report.mood}</span>
                      )}
                    </div>
                    <h4 className="font-medium text-sm mb-1.5 line-clamp-1 text-foreground group-hover:text-primary/90 transition-colors duration-150">
                      {report.title}
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">
                      {stripHtml(report.content)}
                    </p>
                    {report.tags && report.tags.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap mb-2">
                        {report.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[11px] text-accent/80 bg-accent/8 px-1.5 py-0.5 rounded-md">
                            {tag}
                          </span>
                        ))}
                        {report.tags.length > 3 && (
                          <span className="text-[11px] text-muted-foreground">+{report.tags.length - 3}</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/20 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] gap-1 px-2 text-muted-foreground hover:text-foreground"
                        onClick={(e) => { e.stopPropagation(); openEditDialog(report); }}
                      >
                        <SquarePenIcon className="w-3 h-3" />
                        编辑
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[11px] gap-1 px-2 text-muted-foreground hover:text-foreground"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DownloadIcon className="w-3 h-3" />
                            导出
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); exportDailyReportPDF(report); }} className="gap-2 text-xs">
                            <FileTextIcon className="w-3.5 h-3.5 text-red-500" />
                            导出 PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); exportDailyReportWord(report); }} className="gap-2 text-xs">
                            <FileIcon className="w-3.5 h-3.5 text-blue-500" />
                            导出 Word
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); exportDailyReportMarkdown(report); }} className="gap-2 text-xs">
                            <FileTypeIcon className="w-3.5 h-3.5 text-green-500" />
                            导出 Markdown
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] gap-1 px-2 text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDelete(report.id); }}
                      >
                        <Trash2Icon className="w-3 h-3" />
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
