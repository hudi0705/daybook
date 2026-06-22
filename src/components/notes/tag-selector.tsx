'use client';

import { useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { XIcon, PlusIcon, TagIcon } from 'lucide-react';

interface TagSelectorProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
}

const defaultSuggestions = [
  '重要', '待办', '参考', '笔记', '想法', '总结', '计划', '问题',
];

export function TagSelector({ selectedTags, onChange, suggestions = defaultSuggestions }: TagSelectorProps) {
  const [inputValue, setInputValue] = useState('');
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showInput]);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !selectedTags.includes(trimmed)) {
      onChange([...selectedTags, trimmed]);
    }
    setInputValue('');
  };

  const removeTag = (tag: string) => {
    onChange(selectedTags.filter((t) => t !== tag));
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue);
    }
    if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1]);
    }
    if (e.key === 'Escape') {
      setShowInput(false);
      setInputValue('');
    }
  };

  // 过滤出未选中的建议
  const availableSuggestions = suggestions.filter((s) => !selectedTags.includes(s));

  return (
    <div className="rounded-xl border border-border/40 bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <TagIcon className="w-3 h-3" />
          标签
        </p>
        {!showInput && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 text-muted-foreground"
            onClick={() => setShowInput(true)}
          >
            <PlusIcon className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* 已选标签 */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {selectedTags.map((tag) => (
            <Badge
              key={tag}
              variant="default"
              className="text-[11px] gap-1 pr-1 cursor-pointer"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="ml-0.5 hover:bg-primary-foreground/20 rounded-full p-0.5"
              >
                <XIcon className="w-2.5 h-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* 输入框 */}
      {showInput && (
        <div className="mb-3">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleInputKeyDown}
            onBlur={() => {
              if (!inputValue.trim()) {
                setShowInput(false);
              }
            }}
            placeholder="输入标签，回车确认"
            className="text-xs h-7"
          />
        </div>
      )}

      {/* 建议标签 */}
      {availableSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {availableSuggestions.slice(0, 8).map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="text-[11px] cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={() => addTag(tag)}
            >
              + {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
