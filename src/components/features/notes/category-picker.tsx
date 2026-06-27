'use client';

import { Card, CardContent } from '@/components/ui/card';
import { FolderIcon } from 'lucide-react';

interface CategoryPickerProps {
  categories: string[];
  selected: string | null;
  onSelect: (category: string | null) => void;
  noteCounts?: Record<string, number>;
}

export function CategoryPicker({ categories, selected, onSelect, noteCounts }: CategoryPickerProps) {
  if (categories.length === 0) return null;

  return (
    <Card className="border-border/40">
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
          <FolderIcon className="w-3 h-3" />
          分类
        </p>
        <div className="space-y-1">
          {/* 全部 */}
          <button
            onClick={() => onSelect(null)}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-sm transition-colors ${
              selected === null
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <span>全部</span>
            <span className="text-xs tabular-nums">
              {noteCounts ? Object.values(noteCounts).reduce((a, b) => a + b, 0) : ''}
            </span>
          </button>

          {/* 各分类 */}
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => onSelect(cat === selected ? null : cat)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-sm transition-colors ${
                selected === cat
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <span>{cat}</span>
              {noteCounts && (
                <span className="text-xs tabular-nums">
                  {noteCounts[cat] || 0}
                </span>
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
