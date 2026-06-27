import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { NoteEditor } from '@/components/features/notes/note-editor';
import { TagSelector } from '@/components/features/notes/tag-selector';
import {
  ArrowLeftIcon,
  SaveIcon,
  TrashIcon,
  PinIcon,
  EyeIcon,
  PencilIcon,
  BookOpenIcon,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchWithAuth } from '@/lib/api';

interface Note {
  id: number;
  title: string;
  content: string;
  category_id?: number;
  tags?: string[];
  is_pinned: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at?: string;
}

export default function NoteDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const id = params.id as string;
  const isNew = id === 'new';

  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isPinned, setIsPinned] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    if (!isNew) {
      fetchNote();
    }
  }, [id]);

  const fetchNote = async () => {
    try {
      const response = await fetchWithAuth(`/api/notes?id=${id}`);
      const result = await response.json();
      if (result.success && result.data) {
        const n = result.data;
        setNote(n);
        setTitle(n.title);
        setContent(n.content);
        setTags(n.tags || []);
        setIsPinned(n.is_pinned);
      } else {
        alert('笔记不存在');
        navigate('/notes');
      }
    } catch (err) {
      console.error('获取笔记失败:', err);
      navigate('/notes');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('请输入标题');
      return;
    }

    setSaving(true);
    try {
      const method = isNew ? 'POST' : 'PUT';
      const body: Record<string, unknown> = {
        title,
        content,
        tags: tags.length > 0 ? tags : null,
      };

      if (!isNew && note) {
        body.id = note.id;
        body.is_pinned = isPinned;
      }

      const response = await fetchWithAuth('/api/notes', {
        method,
        body: JSON.stringify(body),
      });

      const result = await response.json();
      if (result.success) {
        if (isNew) {
          navigate(`/notes/${result.data.id}`);
        } else {
          setNote(result.data);
        }
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

  const handleDelete = async () => {
    if (!note || !confirm('确定要删除这篇笔记吗？此操作不可撤销。')) return;

    try {
      const response = await fetchWithAuth(`/api/notes?id=${note.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        navigate('/notes');
      } else {
        alert(result.error);
      }
    } catch (err) {
      console.error('删除失败:', err);
      alert('删除失败，请重试');
    }
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    },
    [title, content, tags, isPinned]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate('/notes')}>
              <ArrowLeftIcon className="w-5 h-5" />
            </Button>
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpenIcon className="w-[18px] h-[18px] text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[15px] font-semibold text-foreground tracking-tight truncate">
                {isNew ? '新建笔记' : note?.title || '笔记'}
              </h1>
              {!isNew && note && (
                <p className="text-xs text-muted-foreground">
                  {new Date(note.updated_at || note.created_at).toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 bg-muted/50 rounded-md p-0.5">
              <button
                onClick={() => setViewMode('edit')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${
                  viewMode === 'edit'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <PencilIcon className="w-3 h-3" />
                编辑
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${
                  viewMode === 'preview'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <EyeIcon className="w-3 h-3" />
                预览
              </button>
            </div>

            {!isNew && (
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${isPinned ? 'text-accent' : 'text-muted-foreground'}`}
                onClick={() => setIsPinned(!isPinned)}
                title={isPinned ? '取消置顶' : '置顶'}
              >
                <PinIcon className="w-4 h-4" />
              </Button>
            )}

            {!isNew && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={handleDelete}
                title="删除"
              >
                <TrashIcon className="w-4 h-4" />
              </Button>
            )}

            <Button size="sm" className="gap-1.5 text-xs" onClick={handleSave} disabled={saving}>
              {saving ? <Spinner className="w-3.5 h-3.5" /> : <SaveIcon className="w-3.5 h-3.5" />}
              保存
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-5 sm:px-8 py-6 flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入笔记标题..."
            className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 px-0 h-auto"
          />

          {viewMode === 'edit' ? (
            <NoteEditor value={content} onChange={setContent} />
          ) : (
            <div className="rounded-xl border border-border/40 bg-card p-6 sm:p-8 min-h-[400px]">
              {content ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">暂无内容</p>
              )}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground text-right">
            按 <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">Ctrl+S</kbd> 保存
          </p>
        </div>

        <aside className="w-full lg:w-56 shrink-0 space-y-4">
          <TagSelector selectedTags={tags} onChange={setTags} />

          {!isNew && note && (
            <div className="rounded-xl border border-border/40 bg-card p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">信息</p>
              <div className="text-xs text-muted-foreground space-y-1.5">
                <p>创建: {new Date(note.created_at).toLocaleString('zh-CN')}</p>
                {note.updated_at && <p>更新: {new Date(note.updated_at).toLocaleString('zh-CN')}</p>}
                <p>字数: {content.length}</p>
              </div>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
