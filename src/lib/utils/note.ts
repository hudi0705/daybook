import { format, formatDistanceToNow, isToday, isYesterday, isThisYear } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 日期格式化

export function formatNoteDate(dateStr: string): string {
  const date = new Date(dateStr);

  if (isToday(date)) {
    return `今天 ${format(date, 'HH:mm')}`;
  }

  if (isYesterday(date)) {
    return `昨天 ${format(date, 'HH:mm')}`;
  }

  if (isThisYear(date)) {
    return format(date, 'M月d日', { locale: zhCN });
  }

  return format(date, 'yyyy年M月d日', { locale: zhCN });
}

export function formatRelativeTime(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), {
    addSuffix: true,
    locale: zhCN,
  });
}

export function formatFullDateTime(dateStr: string): string {
  return format(new Date(dateStr), 'yyyy年M月d日 HH:mm:ss', { locale: zhCN });
}

// 内容摘要

export function generateExcerpt(content: string, maxLength: number = 150): string {
  const plainText = content
    .replace(/#{1,6}\s+/g, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]*)\]\(.*?\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/---+/g, '')
    .replace(/\n{2,}/g, ' ')
    .replace(/\n/g, ' ')
    .trim();

  if (plainText.length <= maxLength) {
    return plainText;
  }

  const truncated = plainText.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  const lastComma = truncated.lastIndexOf('，');
  const breakPoint = Math.max(lastSpace, lastComma);

  return (breakPoint > maxLength * 0.6 ? truncated.slice(0, breakPoint) : truncated) + '...';
}

export function countWords(content: string): number {
  const plainText = content
    .replace(/[#*`~\[\]()!>\-|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!plainText) return 0;

  const chineseChars = (plainText.match(/[一-龥]/g) || []).length;
  const englishWords = plainText
    .replace(/[一-龥]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return chineseChars + englishWords;
}

export function estimateReadTime(content: string): number {
  const words = countWords(content);
  return Math.max(1, Math.ceil(words / 400));
}

// 标签颜色

const TAG_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
  '#6366f1',
  '#14b8a6',
  '#e11d48',
  '#84cc16',
];

export function generateTagColor(tagName: string): string {
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const index = Math.abs(hash) % TAG_COLORS.length;
  return TAG_COLORS[index];
}

export function generateTagBgColor(color: string): string {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.1)`;
}

export function getContrastTextColor(hexColor: string): string {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#1a1a1a' : '#ffffff';
}

// 其他工具

export function tagsToString(tags: string[]): string {
  return tags.join(', ');
}

export function parseTagsFromString(input: string): string[] {
  return input
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}
