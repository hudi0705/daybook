import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SquarePenIcon,
  DownloadIcon,
  Trash2Icon,
  FileTextIcon,
  FileIcon,
  FileTypeIcon,
  CalendarDaysIcon,
} from 'lucide-react';
import {
  exportDailyReportPDF,
  exportDailyReportWord,
  exportDailyReportMarkdown,
} from '@/lib/export/daily-report';

export interface DailyReportCardData {
  id: number;
  date: string;
  title: string;
  content: string;
  mood?: string;
  tags?: string[];
}

interface DailyReportCardProps {
  report: DailyReportCardData;
  /** 已格式化的日期文案，如 "6月25日 周四" */
  dateLabel: string;
  onOpen: (id: number) => void;
  onEdit: (report: DailyReportCardData) => void;
  onDelete: (id: number) => void;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * 日报列表卡片 —— 周视图与列表视图共用，保证样式一致
 */
export function DailyReportCard({ report, dateLabel, onOpen, onEdit, onDelete }: DailyReportCardProps) {
  const preview = stripHtml(report.content);

  return (
    <Card
      onClick={() => onOpen(report.id)}
      className="group relative cursor-pointer overflow-hidden rounded-xl border-border/40 bg-card/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card hover:shadow-lg hover:shadow-primary/[0.06]"
    >
      {/* 左侧强调条：hover 时点亮，强化卡片层次 */}
      <span className="absolute inset-y-0 left-0 w-[3px] bg-primary/0 transition-colors duration-200 group-hover:bg-primary/60" />

      <CardContent className="p-4 pl-[18px]">
        {/* 顶部：日期徽标 + 心情 */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary/80 bg-primary/[0.07] px-2 py-1 rounded-lg whitespace-nowrap">
            <CalendarDaysIcon className="w-3 h-3" />
            {dateLabel}
          </span>
          {report.mood && (
            <span className="text-[11px] text-accent/90 truncate">{report.mood}</span>
          )}
        </div>

        {/* 标题 */}
        <h4 className="font-semibold text-[15px] leading-snug mb-1.5 line-clamp-1 text-foreground tracking-tight transition-colors duration-150 group-hover:text-primary">
          {report.title}
        </h4>

        {/* 正文预览（固定两行高度，保证卡片高度整齐） */}
        <p className="text-xs text-muted-foreground/90 leading-relaxed line-clamp-2 min-h-[2.5em]">
          {preview || '暂无内容'}
        </p>

        {/* 标签 */}
        {report.tags && report.tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mt-3">
            {report.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[11px] text-accent/80 bg-accent/[0.08] px-2 py-0.5 rounded-md"
              >
                #{tag}
              </span>
            ))}
            {report.tags.length > 3 && (
              <span className="self-center text-[11px] text-muted-foreground">
                +{report.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* 操作栏：hover 时平滑浮现 */}
        <div className="flex items-center gap-0.5 mt-3 pt-2.5 border-t border-border/30 opacity-0 -translate-y-0.5 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] gap-1 px-2 text-muted-foreground hover:text-primary hover:bg-primary/5"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(report);
            }}
          >
            <SquarePenIcon className="w-3 h-3" /> 编辑
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[11px] gap-1 px-2 text-muted-foreground hover:text-primary hover:bg-primary/5"
                onClick={(e) => e.stopPropagation()}
              >
                <DownloadIcon className="w-3 h-3" /> 导出
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  exportDailyReportPDF(report);
                }}
                className="gap-2 text-xs"
              >
                <FileTextIcon className="w-3.5 h-3.5 text-red-500" /> 导出 PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  exportDailyReportWord(report);
                }}
                className="gap-2 text-xs"
              >
                <FileIcon className="w-3.5 h-3.5 text-blue-500" /> 导出 Word
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  exportDailyReportMarkdown(report);
                }}
                className="gap-2 text-xs"
              >
                <FileTypeIcon className="w-3.5 h-3.5 text-green-500" /> 导出 Markdown
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] gap-1 px-2 ml-auto text-muted-foreground hover:text-destructive hover:bg-destructive/5"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(report.id);
            }}
          >
            <Trash2Icon className="w-3 h-3" /> 删除
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
