'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ExportButton } from '@/components/export-button';
import { exportWeeklyReportPDF, exportWeeklyReportWord, exportWeeklyReportMarkdown } from '@/lib/export/weekly-report';
import {
  ArrowLeftIcon,
  TrashIcon,
  ClockIcon,
  BarChart3Icon,
} from 'lucide-react';

interface WeeklyReport {
  id: number;
  week_start_date: string;
  week_end_date: string;
  summary: string;
  created_at: string;
  updated_at?: string;
}

export default function WeeklyReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchReport();
  }, [id]);

  const fetchReport = async () => {
    try {
      const response = await fetch(`/api/weekly-reports?id=${id}`);
      const result = await response.json();
      if (result.success && result.data) {
        setReport(result.data);
      } else {
        router.push('/');
      }
    } catch (err) {
      console.error('获取周报失败:', err);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!report || !confirm('确定要删除这篇周报吗？')) return;
    try {
      const response = await fetch(`/api/weekly-reports?id=${report.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        router.push('/');
      } else {
        alert(result.error);
      }
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  const handleExport = async (format: 'pdf' | 'word' | 'md') => {
    if (!report) return;
    switch (format) {
      case 'pdf':
        await exportWeeklyReportPDF(report, contentRef.current);
        break;
      case 'word':
        await exportWeeklyReportWord(report);
        break;
      case 'md':
        exportWeeklyReportMarkdown(report);
        break;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`;
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
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
          <p className="text-sm text-muted-foreground mb-3">周报不存在</p>
          <Button variant="ghost" size="sm" onClick={() => router.push('/')}>返回首页</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
              className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
              onClick={handleDelete}
            >
              <TrashIcon className="w-3.5 h-3.5" />
              删除
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative bg-accent overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }} />
        <div className="relative max-w-3xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <BarChart3Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white/60 text-xs font-medium tracking-wider uppercase">周报</p>
              <p className="text-lg font-bold text-white">
                {formatDate(report.week_start_date)} — {formatDate(report.week_end_date)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-5 sm:px-8" ref={contentRef}>
        <div className="border-t border-border/40" />
        <article className="py-8 prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground/85 prose-p:leading-[1.8] prose-strong:text-foreground prose-code:text-primary prose-code:bg-primary/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-foreground/[0.03] prose-pre:border prose-pre:border-border/30 prose-blockquote:border-l-primary/30 prose-blockquote:text-muted-foreground prose-a:text-primary prose-a:underline-offset-2 prose-hr:border-border/30 prose-li:text-foreground/85">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {report.summary}
          </ReactMarkdown>
        </article>

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
    </div>
  );
}
