'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  BoldIcon,
  ItalicIcon,
  StrikethroughIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ListIcon,
  ListOrderedIcon,
  CheckSquareIcon,
  QuoteIcon,
  CodeIcon,
  MinusIcon,
  UndoIcon,
  RedoIcon,
  ListTodoIcon,
} from 'lucide-react';

const lowlight = createLowlight(common);

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
}

interface ToolbarAction {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  action: () => void;
  isActive?: boolean;
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={`h-7 w-7 ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
      title={label}
      onClick={onClick}
    >
      <Icon className="w-3.5 h-3.5" />
    </Button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = '记录今天的工作、学习、生活...',
  minHeight = '200px',
  maxHeight = '400px',
}: RichTextEditorProps) {
  const [charCount, setCharCount] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none prose-headings:text-foreground prose-p:text-foreground/85 prose-p:leading-[1.8] prose-strong:text-foreground prose-code:text-primary prose-code:bg-primary/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-foreground/[0.03] prose-pre:border prose-pre:border-border/30 prose-blockquote:border-l-primary/30 prose-blockquote:text-muted-foreground prose-a:text-primary prose-a:underline-offset-2 prose-hr:border-border/30 prose-li:text-foreground/85',
        style: `min-height: ${minHeight}; padding: 0;`,
      },
    },
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      onChange(html);
      const text = e.state.doc.textContent;
      setCharCount(text.length);
    },
  });

  // 同步外部 value 变化
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleBold = useCallback(() => editor?.chain().focus().toggleBold().run(), [editor]);
  const toggleItalic = useCallback(() => editor?.chain().focus().toggleItalic().run(), [editor]);
  const toggleStrike = useCallback(() => editor?.chain().focus().toggleStrike().run(), [editor]);
  const toggleHeading1 = useCallback(() => editor?.chain().focus().toggleHeading({ level: 1 }).run(), [editor]);
  const toggleHeading2 = useCallback(() => editor?.chain().focus().toggleHeading({ level: 2 }).run(), [editor]);
  const toggleHeading3 = useCallback(() => editor?.chain().focus().toggleHeading({ level: 3 }).run(), [editor]);
  const toggleBulletList = useCallback(() => editor?.chain().focus().toggleBulletList().run(), [editor]);
  const toggleOrderedList = useCallback(() => editor?.chain().focus().toggleOrderedList().run(), [editor]);
  const toggleTaskList = useCallback(() => editor?.chain().focus().toggleTaskList().run(), [editor]);
  const toggleBlockquote = useCallback(() => editor?.chain().focus().toggleBlockquote().run(), [editor]);
  const toggleCodeBlock = useCallback(() => editor?.chain().focus().toggleCodeBlock().run(), [editor]);
  const insertHR = useCallback(() => editor?.chain().focus().setHorizontalRule().run(), [editor]);
  const undo = useCallback(() => editor?.chain().focus().undo().run(), [editor]);
  const redo = useCallback(() => editor?.chain().focus().redo().run(), [editor]);

  if (!editor) return null;

  const leftActions: ToolbarAction[] = [
    { icon: BoldIcon, label: '加粗 (Ctrl+B)', action: toggleBold, isActive: editor.isActive('bold') },
    { icon: ItalicIcon, label: '斜体 (Ctrl+I)', action: toggleItalic, isActive: editor.isActive('italic') },
    { icon: StrikethroughIcon, label: '删除线', action: toggleStrike, isActive: editor.isActive('strike') },
    { icon: Heading1Icon, label: '一级标题', action: toggleHeading1, isActive: editor.isActive('heading', { level: 1 }) },
    { icon: Heading2Icon, label: '二级标题', action: toggleHeading2, isActive: editor.isActive('heading', { level: 2 }) },
    { icon: Heading3Icon, label: '三级标题', action: toggleHeading3, isActive: editor.isActive('heading', { level: 3 }) },
    { icon: ListIcon, label: '无序列表', action: toggleBulletList, isActive: editor.isActive('bulletList') },
    { icon: ListOrderedIcon, label: '有序列表', action: toggleOrderedList, isActive: editor.isActive('orderedList') },
    { icon: ListTodoIcon, label: '任务列表', action: toggleTaskList, isActive: editor.isActive('taskList') },
    { icon: CheckSquareIcon, label: '引用', action: toggleBlockquote, isActive: editor.isActive('blockquote') },
    { icon: CodeIcon, label: '代码块', action: toggleCodeBlock, isActive: editor.isActive('codeBlock') },
    { icon: MinusIcon, label: '分割线', action: insertHR },
  ];

  return (
    <div className="flex flex-col rounded-xl border border-border/40 bg-card overflow-hidden">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/30 bg-muted/30">
        <div className="flex items-center gap-0.5 flex-wrap">
          {leftActions.map((action) => (
            <ToolbarButton
              key={action.label}
              icon={action.icon}
              label={action.label}
              onClick={action.action}
              active={action.isActive}
            />
          ))}
        </div>
        <div className="flex items-center gap-0.5 ml-2 flex-shrink-0">
          <ToolbarButton icon={UndoIcon} label="撤销 (Ctrl+Z)" onClick={undo} />
          <ToolbarButton icon={RedoIcon} label="重做 (Ctrl+Y)" onClick={redo} />
        </div>
      </div>

      {/* 编辑区 */}
      <div className="flex-1 px-4 py-3 overflow-y-auto" style={{ minHeight, maxHeight }}>
        <EditorContent editor={editor} />
      </div>

      {/* 状态栏 */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-border/30 bg-muted/20">
        <span className="text-[11px] text-muted-foreground/60 tabular-nums">{charCount} 字</span>
        <span className="text-[11px] text-muted-foreground/60">富文本</span>
      </div>
    </div>
  );
}
