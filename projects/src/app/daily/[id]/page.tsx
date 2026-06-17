'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeftIcon, EditIcon, TrashIcon, CalendarIcon, FileTextIcon } from 'lucide-react';

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

const moodOptions = ['开心', '平静', '疲惫', '焦虑', '充实', '迷茫', '兴奋', '失落'];

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
  const [tags, setTags] = useState('');

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
        alert(result.error);
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
      setSelectedDate(new Date(report.date));
      setTitle(report.title);
      setContent(report.content);
      setMood(report.mood || '');
      setTags((report.tags || []).join(', '));
      setEditDialogOpen(true);
    }
  };

  const handleUpdate = async () => {
    if (!report || !title.trim() || !content.trim()) return;

    setSaving(true);
    try {
      const tagArray = tags.split(',').map(t => t.trim()).filter(t => t);
      
      const response = await fetch('/api/daily-reports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: report.id,
          title,
          content,
          mood,
          tags: tagArray,
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
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">日报不存在</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
              <ArrowLeftIcon className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileTextIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{report.title}</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <CalendarIcon className="w-3 h-3" />
                {formatDate(report.date)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={openEditDialog} className="gap-2">
              <EditIcon className="w-4 h-4" />
              编辑
            </Button>
            <Button variant="outline" size="sm" onClick={handleDelete} className="gap-2 text-destructive">
              <TrashIcon className="w-4 h-4" />
              删除
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* 元信息 */}
        <div className="flex items-center gap-3 mb-6">
          {report.mood && (
            <Badge variant="secondary" className="text-sm">
              心情：{report.mood}
            </Badge>
          )}
          {report.tags && report.tags.length > 0 && (
            <div className="flex gap-2">
              {report.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Markdown 内容 */}
        <Card className="overflow-hidden">
          <CardContent className="p-8">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {report.content}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>

        {/* 时间信息 */}
        <div className="mt-6 text-sm text-muted-foreground">
          <p>创建于 {new Date(report.created_at).toLocaleString()}</p>
          {report.updated_at && (
            <p>更新于 {new Date(report.updated_at).toLocaleString()}</p>
          )}
        </div>
      </main>

      {/* 编辑对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑日报</DialogTitle>
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
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="今天做了什么..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">内容（支持 Markdown）</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="支持 Markdown 格式..."
                rows={12}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  支持 Markdown 格式，如列表、标题、代码块等
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => {
                    if (selectedDate) {
                      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                      const dateStr = `${selectedDate.getFullYear()}-${selectedDate.getMonth() + 1}-${selectedDate.getDate()}-${weekdays[selectedDate.getDay()]}`;
                      const nextDay = new Date(selectedDate);
                      nextDay.setDate(selectedDate.getDate() + 1);
                      const nextDateStr = `${nextDay.getFullYear()}-${nextDay.getMonth() + 1}-${nextDay.getDate()}-${weekdays[nextDay.getDay()]}`;
                      setContent(`今日工作总结（${dateStr}）
1. 
2. 
3. 

明日工作安排（${nextDateStr}）
1. 
2. 
3. `);
                    }
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
                    className="cursor-pointer hover:bg-primary/10"
                    onClick={() => setMood(m)}
                  >
                    {m}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">标签（逗号分隔）</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="工作, 学习, 运动..."
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                取消
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={!title.trim() || !content.trim() || saving}
              >
                {saving ? <Spinner className="w-4 h-4" /> : '保存'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}