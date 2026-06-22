'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DownloadIcon, FileTextIcon, FileIcon, FileTypeIcon } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';

type ExportFormat = 'pdf' | 'word' | 'md';

interface ExportButtonProps {
  onExport: (format: ExportFormat) => Promise<void>;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function ExportButton({
  onExport,
  variant = 'ghost',
  size = 'sm',
  className = '',
}: ExportButtonProps) {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat) => {
    setExporting(format);
    try {
      await onExport(format);
      toast.success('导出成功', {
        description: `文件已下载`,
      });
    } catch (err) {
      console.error('导出失败:', err);
      toast.error('导出失败', {
        description: err instanceof Error ? err.message : '请重试',
      });
    } finally {
      setExporting(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`gap-1.5 text-xs text-muted-foreground hover:text-foreground ${className}`}
          disabled={exporting !== null}
        >
          {exporting ? (
            <Spinner className="w-3.5 h-3.5" />
          ) : (
            <DownloadIcon className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">
            {exporting ? '导出中...' : '导出'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          onClick={() => handleExport('pdf')}
          disabled={exporting !== null}
          className="gap-2 text-xs"
        >
          <FileTextIcon className="w-3.5 h-3.5 text-red-500" />
          导出 PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport('word')}
          disabled={exporting !== null}
          className="gap-2 text-xs"
        >
          <FileIcon className="w-3.5 h-3.5 text-blue-500" />
          导出 Word
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport('md')}
          disabled={exporting !== null}
          className="gap-2 text-xs"
        >
          <FileTypeIcon className="w-3.5 h-3.5 text-green-500" />
          导出 Markdown
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
