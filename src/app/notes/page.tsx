'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { NoteCard } from '@/components/notes/note-card';
import { CategoryPicker } from '@/components/notes/category-picker';
import {
  BookOpenIcon,
  SearchIcon,
  PlusIcon,
  ArrowLeftIcon,
  FileTextIcon,
} from 'lucide-react';
import Link from 'next/link';

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

export default function NotesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const response = await fetch('/api/notes');
      const result = await response.json();
      if (result.success) {
        setNotes(result.data || []);
      }
    } catch (err) {
      console.error('获取笔记失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这篇笔记吗？')) return;
    try {
      const response = await fetch(`/api/notes?id=${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        setNotes((prev) => prev.filter((n) => n.id !== id));
      } else {
        alert(result.error);
      }
    } catch (err) {
      console.error('删除失败:', err);
      alert('删除失败，请重试');
    }
  };

  const handleTogglePin = async (note: Note) => {
    try {
      const response = await fetch('/api/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: note.id, is_pinned: !note.is_pinned }),
      });
      const result = await response.json();
      if (result.success) {
        setNotes((prev) =>
          prev.map((n) => (n.id === note.id ? { ...n, is_pinned: !n.is_pinned } : n))
        );
      }
    } catch (err) {
      console.error('更新置顶失败:', err);
    }
  };

  // 提取所有标签
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach((n) => {
      n.tags?.forEach((t) => tagSet.add(t));
    });
    return Array.from(tagSet).sort();
  }, [notes]);

  // 筛选后的笔记
  const filteredNotes = useMemo(() => {
    let result = [...notes];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (selectedTag) {
      result = result.filter((n) => n.tags?.includes(selectedTag));
    }

    // 置顶排前面
    result.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      const aTime = a.updated_at || a.created_at;
      const bTime = b.updated_at || b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    return result;
  }, [notes, searchQuery, selectedTag]);

  const pinnedCount = filteredNotes.filter((n) => n.is_pinned).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeftIcon className="w-5 h-5" />
              </Button>
            </Link>
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpenIcon className="w-[18px] h-[18px] text-primary" />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold text-foreground tracking-tight">笔记</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">记录想法与知识</p>
            </div>
          </div>
          <Button
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => router.push('/notes/new')}
          >
            <PlusIcon className="w-3.5 h-3.5" />
            新建笔记
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* 侧边栏 - 标签 */}
          <aside className="w-full lg:w-56 shrink-0 space-y-4">
            {/* 搜索 */}
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索笔记..."
                className="pl-9 text-sm"
              />
            </div>

            {/* 标签云 */}
            {allTags.length > 0 && (
              <Card className="border-border/40">
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-3">标签</p>
                  <div className="flex flex-wrap gap-1.5">
                    {allTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant={selectedTag === tag ? 'default' : 'outline'}
                        className="cursor-pointer text-[11px] hover:bg-primary/10 transition-colors"
                        onClick={() =>
                          setSelectedTag(selectedTag === tag ? null : tag)
                        }
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 统计 */}
            <Card className="border-border/40">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground mb-2">统计</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">全部笔记</span>
                  <span className="font-medium">{notes.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">已筛选</span>
                  <span className="font-medium">{filteredNotes.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">置顶</span>
                  <span className="font-medium">{pinnedCount}</span>
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* 笔记列表 */}
          <section className="flex-1 min-w-0">
            {/* 筛选状态条 */}
            {(selectedTag || searchQuery) && (
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="text-xs text-muted-foreground">筛选中：</span>
                {selectedTag && (
                  <Badge variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => setSelectedTag(null)}>
                    标签: {selectedTag}
                    <span className="ml-1 opacity-60">&times;</span>
                  </Badge>
                )}
                {searchQuery && (
                  <Badge variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => setSearchQuery('')}>
                    搜索: {searchQuery}
                    <span className="ml-1 opacity-60">&times;</span>
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px] text-muted-foreground"
                  onClick={() => {
                    setSelectedTag(null);
                    setSearchQuery('');
                  }}
                >
                  清除全部
                </Button>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Spinner className="w-7 h-7" />
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center mb-4">
                  <FileTextIcon className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  {searchQuery || selectedTag ? '没有匹配的笔记' : '还没有笔记'}
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  {searchQuery || selectedTag
                    ? '尝试调整筛选条件'
                    : '点击右上角「新建笔记」开始记录'}
                </p>
                {!searchQuery && !selectedTag && (
                  <Button size="sm" className="gap-1.5 text-xs" onClick={() => router.push('/notes/new')}>
                    <PlusIcon className="w-3.5 h-3.5" />
                    新建笔记
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onDelete={handleDelete}
                    onTogglePin={handleTogglePin}
                    onClick={() => router.push(`/notes/${note.id}`)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
