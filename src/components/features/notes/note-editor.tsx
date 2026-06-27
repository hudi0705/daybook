'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  BoldIcon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  Heading2Icon,
  CodeIcon,
  LinkIcon,
  QuoteIcon,
  MinusIcon,
  CheckSquareIcon,
} from 'lucide-react';

interface NoteEditorProps {
  value: string;
  onChange: (value: string) => void;
}

interface ToolbarAction {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  prefix: string;
  suffix: string;
  placeholder?: string;
}

const toolbarActions: ToolbarAction[] = [
  { icon: BoldIcon, label: '加粗', prefix: '**', suffix: '**', placeholder: '粗体文字' },
  { icon: ItalicIcon, label: '斜体', prefix: '*', suffix: '*', placeholder: '斜体文字' },
  { icon: Heading2Icon, label: '标题', prefix: '## ', suffix: '', placeholder: '标题' },
  { icon: CodeIcon, label: '代码', prefix: '`', suffix: '`', placeholder: 'code' },
  { icon: LinkIcon, label: '链接', prefix: '[', suffix: '](url)', placeholder: '链接文字' },
  { icon: ListIcon, label: '无序列表', prefix: '- ', suffix: '', placeholder: '列表项' },
  { icon: ListOrderedIcon, label: '有序列表', prefix: '1. ', suffix: '', placeholder: '列表项' },
  { icon: CheckSquareIcon, label: '任务列表', prefix: '- [ ] ', suffix: '', placeholder: '任务' },
  { icon: QuoteIcon, label: '引用', prefix: '> ', suffix: '', placeholder: '引用文字' },
  { icon: MinusIcon, label: '分割线', prefix: '\n---\n', suffix: '', placeholder: '' },
];

export function NoteEditor({ value, onChange }: NoteEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [lineCount, setLineCount] = useState(1);

  useEffect(() => {
    setLineCount(value.split('\n').length);
  }, [value]);

  const insertText = useCallback(
    (action: ToolbarAction) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end);
      const replacement = selectedText || action.placeholder || '';

      const newValue =
        value.substring(0, start) +
        action.prefix +
        replacement +
        action.suffix +
        value.substring(end);

      onChange(newValue);

      // 恢复光标位置
      requestAnimationFrame(() => {
        textarea.focus();
        const newStart = start + action.prefix.length;
        const newEnd = newStart + replacement.length;
        textarea.setSelectionRange(newStart, newEnd);
      });
    },
    [value, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const textarea = e.currentTarget;

      // Tab 缩进
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = value.substring(0, start) + '  ' + value.substring(end);
        onChange(newValue);
        requestAnimationFrame(() => {
          textarea.setSelectionRange(start + 2, start + 2);
        });
      }
    },
    [value, onChange]
  );

  return (
    <div className="flex flex-col rounded-xl border border-border/40 bg-card overflow-hidden flex-1">
      {/* 工具栏 */}
      <div className="flex items-center gap-0.5 px-3 py-2 border-b border-border/30 bg-muted/30 flex-wrap">
        {toolbarActions.map((action) => (
          <Button
            key={action.label}
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title={action.label}
            onClick={() => insertText(action)}
            type="button"
          >
            <action.icon className="w-3.5 h-3.5" />
          </Button>
        ))}
      </div>

      {/* 编辑区 */}
      <div className="flex-1 relative">
        {/* 行号 */}
        <div className="absolute left-0 top-0 bottom-0 w-10 bg-muted/20 border-r border-border/20 pointer-events-none overflow-hidden">
          <div className="pt-4 px-1 text-right">
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i} className="h-[21px] text-[11px] text-muted-foreground/40 leading-[21px] font-mono">
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="开始写作... 支持 Markdown 格式"
          className="min-h-[400px] flex-1 border-none shadow-none focus-visible:ring-0 resize-none pl-12 pr-4 pt-4 font-mono text-sm leading-[21px] placeholder:text-muted-foreground/40"
        />
      </div>

      {/* 状态栏 */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-border/30 bg-muted/20">
        <span className="text-[11px] text-muted-foreground/60 font-mono">
          {value.length} 字符 | {lineCount} 行
        </span>
        <span className="text-[11px] text-muted-foreground/60">Markdown</span>
      </div>
    </div>
  );
}
