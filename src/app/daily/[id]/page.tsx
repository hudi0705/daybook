'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { RichTextEditor } from '@/components/rich-text-editor';
import { ExportButton } from '@/components/export-button';
import { exportDailyReportPDF, exportDailyReportWord, exportDailyReportMarkdown } from '@/lib/export/daily-report';
import {
  ArrowLeftIcon,
  EditIcon,
  TrashIcon,
  ClockIcon,
} from 'lucide-react';

interface DailyReport {
  id: number;
  date: string;
  title: string;
  content: string;
  mood?: string;
  tags?: string[];
  created_at: string;
  updated_at?: string;
}

// 去除 HTML 标签，检查纯文本是否为空
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

const moodEmojiMap: Record<string, string> = {
  '开心': '😊',
  '平静': '😌',
  '疲惫': '😩',
  '焦虑': '😰',
  '充实': '💪',
  '迷茫': '🤔',
  '兴奋': '🔥',
  '失落': '😔',
};

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

export default function DailyReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // 编辑表单
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchReport();
  }, [id]);

  const fetchReport = async () => {
    try {
      const response = await fetch(`/api/daily-reports?id=${id}`);
      const result = await response.json();
      if (result.success) {
        setReport(result.data);
      } else {
        router.push('/');
      }
    } catch (err) {
      console.error('获取日报失败:', err);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = () => {
    if (report) {
      const dateStr = String(report.date || '').slice(0, 10);
      const parts = dateStr.split('-');
      const y = Number(parts[0]) || new Date().getFullYear();
      const m = Number(parts[1]) || (new Date().getMonth() + 1);
      const d = Number(parts[2]) || new Date().getDate();
      setSelectedDate(new Date(y, m - 1, d));
      setTitle(report.title);
      setContent(report.content);
      setMood(report.mood || '');
      setEditTags(report.tags || []);
      setTagInput('');
      setEditDialogOpen(true);
    }
  };

  const addEditTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !editTags.includes(trimmed)) {
      setEditTags([...editTags, trimmed]);
    }
    setTagInput('');
  };

  const removeEditTag = (tagToRemove: string) => {
    setEditTags(editTags.filter(t => t !== tagToRemove));
  };

  const handleUpdate = async () => {
    if (!report || !title.trim() || !stripHtml(content)) return;

    setSaving(true);
    try {
      const dateStr = selectedDate
        ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
        : report.date.slice(0, 10);

      const response = await fetch('/api/daily-reports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: report.id,
          date: dateStr,
          title,
          content,
          mood,
          tags: editTags,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setReport(result.data);
        setEditDialogOpen(false);
      } else {
        alert(result.error);
      }
    } catch (err) {
      console.error('更新失败:', err);
      alert('更新失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!report || !confirm('确定要删除这篇日报吗？')) return;

    try {
      const response = await fetch(`/api/daily-reports?id=${report.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        router.push('/');
      } else {
        alert(result.error);
      }
    } catch (err) {
      console.error('删除失败:', err);
      alert('删除失败，请重试');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return {
      full: `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`,
      weekday: weekdays[date.getDay()],
      day: date.getDate(),
      month: `${date.getMonth() + 1}月`,
      year: `${date.getFullYear()}`,
    };
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (title.trim() && stripHtml(content) && !saving) {
        handleUpdate();
      }
    }
  };

  const handleExport = async (format: 'pdf' | 'word' | 'md') => {
    if (!report) return;
    switch (format) {
      case 'pdf':
        await exportDailyReportPDF(report, contentRef.current);
        break;
      case 'word':
        await exportDailyReportWord(report);
        break;
      case 'md':
        exportDailyReportMarkdown(report);
        break;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner className="w-6 h-6 text-primary" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">日报不存在</p>
          <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
            返回首页
          </Button>
        </div>
      </div>
    );
  }

  const dateInfo = formatDate(report.date);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top bar ── */}
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => router.push('/')}
          >
            <ArrowLeftIcon className="w-3.5 h-3.5" />
            返回
          </Button>
          <div className="flex items-center gap-1.5">
            <ExportButton onExport={handleExport} />
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={openEditDialog}
            >
              <EditIcon className="w-3.5 h-3.5" />
              编辑
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
              onClick={handleDelete}
            >
              <TrashIcon className="w-3.5 h-3.5" />
              删除
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero: date + mood ── */}
      <section className="relative bg-primary overflow-hidden">
        {/* Grain texture */}
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }} />

        <div className="relative max-w-3xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-white/60 text-xs font-medium tracking-wider uppercase mb-2">
                {dateInfo.year}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl sm:text-6xl font-black text-white leading-none tracking-tighter">
                  {dateInfo.day}
                </span>
                <span className="text-lg sm:text-xl font-bold text-white/60 leading-none">
                  {dateInfo.month}
                </span>
              </div>
              <p className="text-sm text-white/40 mt-1.5">{dateInfo.weekday}</p>
            </div>

            {report.mood && (
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2.5 rounded-xl">
                <span className="text-2xl">{moodEmojiMap[report.mood] || '📝'}</span>
                <span className="text-sm font-medium text-white/80">{report.mood}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Main content ── */}
      <main className="max-w-3xl mx-auto px-5 sm:px-8" ref={contentRef}>
        {/* Title */}
        <div className="pt-8 pb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-tight">
            {report.title}
          </h1>
        </div>

        {/* Tags */}
        {report.tags && report.tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap pb-6">
            {report.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs font-medium text-accent/80 bg-accent/8 px-2.5 py-1 rounded-md"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-border/40" />

        {/* Content */}
        <article
          className="py-8 prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground/85 prose-p:leading-[1.8] prose-strong:text-foreground prose-code:text-primary prose-code:bg-primary/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-foreground/[0.03] prose-pre:border prose-pre:border-border/30 prose-blockquote:border-l-primary/30 prose-blockquote:text-muted-foreground prose-a:text-primary prose-a:underline-offset-2 prose-hr:border-border/30 prose-li:text-foreground/85"
          dangerouslySetInnerHTML={{ __html: report.content }}
        />

        {/* Footer meta */}
        <div className="border-t border-border/30 py-6 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-xs text-muted-foreground/60">
          <span className="inline-flex items-center gap-1.5">
            <ClockIcon className="w-3 h-3" />
            创建于 {formatTime(report.created_at)}
          </span>
          {report.updated_at && report.updated_at !== report.created_at && (
            <span className="inline-flex items-center gap-1.5">
              <ClockIcon className="w-3 h-3" />
              更新于 {formatTime(report.updated_at)}
            </span>
          )}
        </div>
      </main>

      {/* ── Edit dialog ── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-[560px] max-h-[85vh] flex flex-col p-0">
          {/* Dialog header: green surface */}
          <div className="relative bg-primary px-6 pt-5 pb-6 overflow-hidden flex-shrink-0">
            <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }} />

            <div className="relative flex items-end justify-between">
              <div>
                <DialogTitle className="text-white/70 text-xs font-medium tracking-wider uppercase mb-2">
                  编辑日报
                </DialogTitle>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-white leading-none tracking-tighter">
                    {selectedDate?.getDate()}
                  </span>
                  <span className="text-lg font-bold text-white/60 leading-none">
                    {selectedDate?.toLocaleDateString('zh-CN', { month: 'long' })}
                  </span>
                </div>
                <p className="text-sm text-white/40 mt-1.5">
                  {selectedDate?.toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>

          {/* Dialog body */}
          <div className="px-6 pt-6 pb-5 space-y-5 flex-1 overflow-y-auto min-h-0" onKeyDown={handleKeyDown}>
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">日期</p>
              <Calendar
                mode="single"
                selected={selectedDate instanceof Date && !isNaN(selectedDate.getTime()) ? selectedDate : new Date()}
                onSelect={setSelectedDate}
                className="rounded-xl border border-border/40"
              />
            </div>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="给今天起个标题..."
              className="w-full text-xl font-bold text-foreground placeholder:text-muted-foreground/30 bg-transparent border-none outline-none focus:ring-0 tracking-tight"
            />

            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="记录今天的工作、学习、生活..."
              minHeight="200px"
              maxHeight="320px"
            />

            {/* Mood */}
            <div>
              <p className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-3">心情</p>
              <div className="flex flex-wrap gap-2">
                {moodOptions.map((m) => (
                  <button
                    key={m.label}
                    type="button"
                    onClick={() => setMood(mood === m.label ? '' : m.label)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-all duration-150 ${
                      mood === m.label
                        ? 'bg-primary/10 border border-primary/25 text-primary font-medium'
                        : 'bg-muted/40 border border-transparent text-muted-foreground hover:bg-muted/70'
                    }`}
                  >
                    <span className="text-base">{m.emoji}</span>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <p className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-3">标签</p>
              <div className="flex flex-wrap gap-1.5 items-center min-h-[36px] rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition-all duration-150">
                {editTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent/10 text-accent text-xs font-medium"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeEditTag(tag)}
                      className="hover:text-accent/70 transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  value={tagInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.endsWith(',')) {
                      addEditTag(val.slice(0, -1));
                    } else {
                      setTagInput(val);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
                      e.preventDefault();
                      e.stopPropagation();
                      addEditTag(tagInput);
                    }
                    if (e.key === 'Backspace' && tagInput === '' && editTags.length > 0) {
                      removeEditTag(editTags[editTags.length - 1]);
                    }
                  }}
                  placeholder={editTags.length === 0 ? "输入标签，按回车添加..." : "继续添加..."}
                  className="flex-1 min-w-[120px] text-xs bg-transparent border-none outline-none placeholder:text-muted-foreground/40"
                />
              </div>
            </div>
          </div>

          {/* Dialog footer */}
          <div className="px-6 py-5 border-t border-border/40 flex items-center justify-between flex-shrink-0">
            <button
              type="button"
              onClick={() => setEditDialogOpen(false)}
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
                onClick={handleUpdate}
                disabled={!title.trim() || !stripHtml(content) || saving}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 shadow-sm"
              >
                {saving ? <Spinner className="w-3.5 h-3.5" /> : null}
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
