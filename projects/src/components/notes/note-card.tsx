'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PinIcon, TrashIcon } from 'lucide-react';

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

interface NoteCardProps {
  note: Note;
  onDelete: (id: number) => void;
  onTogglePin: (note: Note) => void;
  onClick: () => void;
}

export function NoteCard({ note, onDelete, onTogglePin, onClick }: NoteCardProps) {
  const formatDate = (note: Note) => {
    const date = new Date(note.updated_at || note.created_at);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);

    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const contentPreview = note.content
    .replace(/[#*`~\[\]()!>-]/g, '')
    .replace(/\n+/g, ' ')
    .trim();

  return (
    <Card
      className="group cursor-pointer border-border/40 hover:border-border hover:shadow-sm transition-all duration-200 relative"
      onClick={onClick}
    >
      {note.is_pinned && (
        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-accent flex items-center justify-center shadow-sm">
          <PinIcon className="w-2.5 h-2.5 text-accent-foreground" />
        </div>
      )}

      <CardContent className="p-4">
        {/* 日期 */}
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-[11px] text-muted-foreground">
            {formatDate(note)}
          </span>
        </div>

        {/* 标题 */}
        <h4 className="font-medium text-sm mb-1.5 line-clamp-1 text-foreground">
          {note.title}
        </h4>

        {/* 内容预览 */}
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">
          {contentPreview || '暂无内容'}
        </p>

        {/* 标签 */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-2">
            {note.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[11px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
            {note.tags.length > 3 && (
              <span className="text-[11px] text-muted-foreground">
                +{note.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/30 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[11px] gap-1 px-2 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(note);
            }}
          >
            <PinIcon className="w-3 h-3" />
            {note.is_pinned ? '取消置顶' : '置顶'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[11px] gap-1 px-2 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(note.id);
            }}
          >
            <TrashIcon className="w-3 h-3" />
            删除
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
