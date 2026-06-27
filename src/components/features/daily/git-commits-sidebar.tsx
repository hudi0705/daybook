import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Checkbox } from '@/components/ui/checkbox';
import {
  GitBranchIcon,
  Wand2Icon,
  ChevronDownIcon,
  ChevronRightIcon as ChevronRightSmall,
  SearchIcon,
  UserIcon,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/api';
import { loadAiConfig, loadStyle } from '@/lib/ai-config';

// ── Types ──
export interface GitCommit {
  hash: string;
  date: string;
  message: string;
  author: string;
  filesChanged?: number;
  files?: string[];
}

interface GitCommitsSidebarProps {
  onGenerateReport: (commits: GitCommit[], content: string, title: string) => void;
  onReportSaved?: () => void;
}

interface ContributionDay {
  date: string;
  count: number;
}

// ── Helper functions ──
function extractType(message: string): string {
  const match = message.match(/^(feat|fix|chore|refactor|docs|style|test|perf|ci|build|revert)[\(:]/i);
  return match ? match[1].toLowerCase() : 'other';
}

function extractTitle(message: string): string {
  return message.replace(/^(feat|fix|chore|refactor|docs|style|test|perf|ci|build|revert)[^:]*:\s*/i, '').trim();
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return dateStr.slice(11, 16) || '';
  }
}

// ── Commit type color mapping ──
const TYPE_COLORS: Record<string, string> = {
  feat: 'bg-green-100 text-green-700 border-green-200',
  fix: 'bg-red-100 text-red-700 border-red-200',
  chore: 'bg-gray-100 text-gray-600 border-gray-200',
  refactor: 'bg-blue-100 text-blue-700 border-blue-200',
  docs: 'bg-purple-100 text-purple-700 border-purple-200',
  style: 'bg-pink-100 text-pink-700 border-pink-200',
  test: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  perf: 'bg-orange-100 text-orange-700 border-orange-200',
  ci: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  build: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  revert: 'bg-rose-100 text-rose-700 border-rose-200',
  other: 'bg-slate-100 text-slate-600 border-slate-200',
};

// ── Mini Contribution Heatmap ──
function MiniHeatmap({ data }: { data: ContributionDay[] }) {
  const today = new Date();
  const weeks = useMemo(() => {
    const result: ContributionDay[][] = [];
    const start = new Date(today);
    start.setDate(start.getDate() - 83); // ~12 weeks
    while (start.getDay() !== 0) start.setDate(start.getDate() - 1);

    const dataMap = new Map(data.map(d => [d.date, d.count]));
    const cur = new Date(start);

    while (cur <= today) {
      const week: ContributionDay[] = [];
      for (let d = 0; d < 7; d++) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const dd = String(cur.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${dd}`;
        week.push({ date: dateStr, count: dataMap.get(dateStr) || 0 });
        cur.setDate(cur.getDate() + 1);
      }
      result.push(week);
    }
    return result;
  }, [data]);

  const getColor = (count: number): string => {
    if (count === 0) return 'bg-muted';
    if (count <= 1) return 'bg-green-200';
    if (count <= 2) return 'bg-green-400';
    if (count <= 3) return 'bg-green-600';
    return 'bg-green-800';
  };

  return (
    <div className="flex gap-[2px] w-full">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-[2px] flex-1">
          {week.map((day) => (
            <div
              key={day.date}
              className={`aspect-square rounded-[1px] ${getColor(day.count)}`}
              title={`${day.date}: ${day.count} 次提交`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── CommitItem Component ──
interface CommitItemProps {
  commit: GitCommit;
  isExpanded: boolean;
  onToggle: () => void;
  isSelected: boolean;
  onSelect: () => void;
  isLoadingFiles?: boolean;
}

function CommitItem({ commit, isExpanded, onToggle, isSelected, onSelect, isLoadingFiles }: CommitItemProps) {
  const typeLabel = extractType(commit.message);
  const title = extractTitle(commit.message);
  const shortHash = commit.hash.substring(0, 7);
  const colorClass = TYPE_COLORS[typeLabel] || TYPE_COLORS.other;

  return (
    <div className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-2 px-3 py-2 cursor-pointer" onClick={onToggle}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 shrink-0"
        />
        <div className="flex-1 min-w-0">
          {/* 头部行：类型标签 + 标题 + hash */}
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 shrink-0 ${colorClass}`}
            >
              {typeLabel}
            </Badge>
            <span className="text-xs flex-1 truncate font-medium">
              {title || commit.message}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono shrink-0">
              {shortHash}
            </span>
          </div>
          {/* 元信息行 */}
          <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
            <span>{formatDate(commit.date)}</span>
            <span>·</span>
            <span>{commit.author}</span>
            <span>·</span>
            <span>{commit.filesChanged ?? 0} 文件</span>
          </div>
        </div>
        <div className="shrink-0 mt-1">
          {isExpanded ? (
            <ChevronDownIcon className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronRightSmall className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* 可展开内容：变更文件列表 */}
      {isExpanded && (
        <div className="px-3 pb-2 pl-10 space-y-0.5">
          {isLoadingFiles ? (
            <div className="flex items-center gap-1.5 py-1">
              <Spinner className="w-3 h-3" />
              <span className="text-[11px] text-muted-foreground">加载文件列表...</span>
            </div>
          ) : commit.files && commit.files.length > 0 ? (
            commit.files.map((file, i) => (
              <div
                key={i}
                className="text-[11px] text-blue-500 hover:underline cursor-pointer truncate"
                title={file}
              >
                {file}
              </div>
            ))
          ) : (
            <span className="text-[11px] text-muted-foreground">无文件变更</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ──
export function GitCommitsSidebar({ onGenerateReport, onReportSaved }: GitCommitsSidebarProps) {
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCommits, setSelectedCommits] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [authorFilter, setAuthorFilter] = useState<string>('all');
  const [authors, setAuthors] = useState<string[]>([]);
  const [expandedHash, setExpandedHash] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string>(new Date().toISOString());
  const [contributionData, setContributionData] = useState<ContributionDay[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filesCache, setFilesCache] = useState<Map<string, string[]>>(new Map());
  const [filesLoading, setFilesLoading] = useState<Set<string>>(new Set());
  const limit = 20;

  const fetchCommits = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (searchQuery) params.set('search', searchQuery);
      if (authorFilter && authorFilter !== 'all') params.set('author', authorFilter);

      const response = await fetchWithAuth(`/api/git/commits?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        const data = result.data?.data || result.data || [];
        const meta = result.data?.meta || result.meta || {};
        setCommits(data);
        setSelectedCommits(new Set(data.map((c: GitCommit) => c.hash)));
        setTotal(meta.total || data.length);
        setTotalPages(meta.totalPages || 1);
        // 提交用户列表（仅在返回时更新，保证切换筛选时下拉选项稳定）
        if (Array.isArray(meta.authors)) {
          setAuthors(meta.authors);
        }
        // 从提交数据中构建热力图数据
        const contributionMap = new Map<string, number>();
        data.forEach((c: GitCommit) => {
          const day = c.date.split('T')[0]?.split(' ')[0] || c.date.substring(0, 10);
          contributionMap.set(day, (contributionMap.get(day) || 0) + 1);
        });
        // 过去90天
        const today = new Date();
        const days: ContributionDay[] = [];
        for (let i = 89; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const ds = `${y}-${m}-${dd}`;
          days.push({ date: ds, count: contributionMap.get(ds) || 0 });
        }
        setContributionData(days);
        if (meta.lastSync) {
          setLastSync(meta.lastSync);
        } else {
          setLastSync(new Date().toISOString());
        }
      } else {
        setCommits([]);
        if (result.error && !result.error.includes('没有找到')) {
          toast.error(result.error);
        }
      }
    } catch (err) {
      console.error('获取 Git 提交记录失败:', err);
      setCommits([]);
    } finally {
      setLoading(false);
    }
  };

  // 页码或提交用户筛选变化时重新获取
  useEffect(() => {
    fetchCommits();
  }, [page, authorFilter]);

  // 搜索防抖：重置到第一页
  useEffect(() => {
    if (!searchQuery) {
      setPage(1);
      return;
    }
    const timer = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 切换提交用户筛选：重置到第一页（page 已为 1 时由 authorFilter 依赖触发刷新）
  const handleAuthorChange = (value: string) => {
    setAuthorFilter(value);
    setPage(1);
  };

  const toggleCommit = (hash: string) => {
    const newSet = new Set(selectedCommits);
    if (newSet.has(hash)) {
      newSet.delete(hash);
    } else {
      newSet.add(hash);
    }
    setSelectedCommits(newSet);
  };

  const toggleAll = () => {
    if (selectedCommits.size === commits.length) {
      setSelectedCommits(new Set());
    } else {
      setSelectedCommits(new Set(commits.map(c => c.hash)));
    }
  };

  // 延迟加载文件列表 —— 如果 commit 已有 files 则直接展开，否则请求后端
  const handleToggleExpand = async (hash: string) => {
    if (expandedHash === hash) {
      setExpandedHash(null);
      return;
    }
    setExpandedHash(hash);

    // 查找当前 commit
    const commit = commits.find(c => c.hash === hash);
    // 如果已有文件数据且非空，无需请求
    if (commit?.files && commit.files.length > 0) return;
    // 如果缓存中已有，无需请求
    if (filesCache.has(hash)) return;

    // 延迟加载
    setFilesLoading(prev => new Set(prev).add(hash));
    try {
      const res = await fetchWithAuth(`/api/git/commits/${hash}/files`);
      const data = await res.json();
      if (data.success) {
        const files: string[] = data.data?.files || [];
        setFilesCache(prev => new Map(prev).set(hash, files));
        // 同步更新 commits 中对应项的 files 字段
        setCommits(prev => prev.map(c =>
          c.hash === hash ? { ...c, files, filesChanged: files.length } : c
        ));
      }
    } catch (err) {
      console.error('获取文件列表失败:', err);
    } finally {
      setFilesLoading(prev => {
        const next = new Set(prev);
        next.delete(hash);
        return next;
      });
    }
  };

  /** 获取某个 commit 的文件列表（用于 CommitItem 渲染） */
  const getFilesForCommit = (hash: string): string[] | undefined => {
    const commit = commits.find(c => c.hash === hash);
    if (commit?.files && commit.files.length > 0) return commit.files;
    const cached = filesCache.get(hash);
    if (cached && cached.length > 0) return cached;
    return undefined;
  };

  const handleGenerate = async () => {
    const selectedCommitsList = commits.filter(c => selectedCommits.has(c.hash));
    if (selectedCommitsList.length === 0) {
      toast.error('请至少选择一条提交记录');
      return;
    }

    const aiConfig = loadAiConfig();
    if (!aiConfig) {
      toast.error('请先在设置中配置 AI 模型');
      return;
    }

    // 合并独立存储的生成风格
    const style = loadStyle();
    const configWithStyle = { ...aiConfig, style };

    const today = new Date().toISOString().split('T')[0];
    setGenerating(true);
    setStreamingContent('');

    try {
      // 1. 调用 AI 生成日报（流式响应）
      const generateRes = await fetchWithAuth('/api/daily-reports/git-generate', {
        method: 'POST',
        body: JSON.stringify({
          date: today,
          commits: selectedCommitsList.slice(0, 15),  // 限制提交数量
          ai_config: configWithStyle,
        }),
      });

      if (!generateRes.ok) {
        const errorData = await generateRes.json().catch(() => ({}));
        toast.error(errorData.error || '生成日报失败');
        return;
      }

      // 流式读取响应
      const reader = generateRes.body!.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let buffer = '';  // 缓冲不完整的 SSE 行

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // 按行分割，保留最后一个可能不完整的行
        const lines = buffer.split('\n');
        // 最后一个元素可能是不完整的行，留在 buffer 中
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              const json = JSON.parse(data);
              const content = json.choices?.[0]?.delta?.content || '';
              fullContent += content;
              setStreamingContent(fullContent);
            } catch {
              // 忽略解析错误（可能是不完整的 JSON）
            }
          }
        }
      }

      // 处理 buffer 中剩余的数据
      if (buffer.trim()) {
        const trimmed = buffer.trim();
        if (trimmed.startsWith('data: ') && trimmed !== '[DONE]') {
          try {
            const json = JSON.parse(trimmed.slice(6).trim());
            const content = json.choices?.[0]?.delta?.content || '';
            fullContent += content;
            setStreamingContent(fullContent);
          } catch {
            // 忽略
          }
        }
      }

      if (!fullContent) {
        toast.error('AI 未能生成日报内容');
        return;
      }

      const title = `${today} 工作日报`;

      // 2. 检查当天是否已有日报
      const checkRes = await fetchWithAuth(`/api/daily-reports?startDate=${today}&endDate=${today}`);
      const checkData = await checkRes.json();
      const existingReports = checkData.data || [];

      if (existingReports.length > 0) {
        // 更新现有日报
        const updateRes = await fetchWithAuth(`/api/daily-reports/${existingReports[0].id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title || existingReports[0].title,
            content: fullContent,
            mood: existingReports[0].mood || '',
            tags: existingReports[0].tags || [],
          }),
        });

        const updateData = await updateRes.json();
        if (updateData.success) {
          toast.success('日报已更新');
          setSelectedCommits(new Set());
          onGenerateReport(selectedCommitsList, fullContent, title);
          if (onReportSaved) {
            onReportSaved();
          }
        } else {
          toast.error(updateData.error || '更新日报失败');
        }
      } else {
        // 创建新日报
        const saveRes = await fetchWithAuth('/api/daily-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: today,
            title: title,
            content: fullContent,
            mood: '',
            tags: [],
          }),
        });

        const saveData = await saveRes.json();
        if (saveData.success) {
          toast.success('日报已生成并保存');
          setSelectedCommits(new Set());
          onGenerateReport(selectedCommitsList, fullContent, title);
          if (onReportSaved) {
            onReportSaved();
          }
        } else {
          toast.error(saveData.error || '保存日报失败');
        }
      }
    } catch (err) {
      console.error('生成日报失败:', err);
      toast.error('生成日报失败，请重试');
    } finally {
      setGenerating(false);
      setStreamingContent('');
    }
  };

  return (
    <div className="w-[320px] border-l border-border bg-card/50 flex flex-col h-full">
      {/* ── Header ── */}
      <div className="border-b p-3 flex-shrink-0">
        {/* 标题行 */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <GitBranchIcon className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">提交记录</h3>
          </div>
          {/* 选择状态 */}
          {total > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {selectedCommits.size > 0 ? `已选 ${selectedCommits.size}` : total}
            </span>
          )}
        </div>

        {/* 搜索框 */}
        <div className="relative mb-2">
          <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="搜索提交..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-xs pl-7"
          />
        </div>

        {/* 提交用户筛选 */}
        {authors.length > 0 && (
          <div className="mb-3">
            <Select value={authorFilter} onValueChange={handleAuthorChange}>
              <SelectTrigger size="sm" className="w-full h-8 text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <UserIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="全部提交用户" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  全部提交用户
                </SelectItem>
                {authors.map((a) => (
                  <SelectItem key={a} value={a} className="text-xs">
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* GitHub 风格贡献热力图 - 宽度 100% */}
        <div className="w-full">
          {contributionData.length > 0 && (
            <MiniHeatmap data={contributionData} />
          )}
        </div>
      </div>

      {/* ── Main: Commit List ── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="w-6 h-6" />
          </div>
        ) : commits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center mb-3">
              <GitBranchIcon className="w-4 h-4 text-muted-foreground/50" />
            </div>
            <p className="text-xs font-medium text-foreground mb-1">没有提交记录</p>
            <p className="text-[11px] text-muted-foreground">
              {searchQuery || authorFilter !== 'all'
                ? '未找到匹配的提交'
                : '没有 Git 提交记录，请检查项目地址是否已配置'}
            </p>
          </div>
        ) : (
          <div>
            {/* 全选 */}
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <div
                onClick={toggleAll}
                className="flex items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleAll(); }}
              >
                <Checkbox
                  checked={selectedCommits.size === commits.length}
                  onCheckedChange={toggleAll}
                  className="w-3.5 h-3.5"
                />
                {selectedCommits.size === commits.length ? '取消全选' : '全选'}
              </div>
            </div>

            {/* Commit items */}
            {commits.map((commit) => (
              <CommitItem
                key={commit.hash}
                commit={{ ...commit, files: getFilesForCommit(commit.hash) ?? commit.files }}
                isExpanded={expandedHash === commit.hash}
                onToggle={() => handleToggleExpand(commit.hash)}
                isSelected={selectedCommits.has(commit.hash)}
                onSelect={() => toggleCommit(commit.hash)}
                isLoadingFiles={expandedHash === commit.hash && filesLoading.has(commit.hash)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── 分页控件 ── */}
      {totalPages > 1 && (
        <div className="border-t px-3 py-2 flex items-center justify-between flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            上一页
          </Button>
          <span className="text-xs text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            下一页
          </Button>
        </div>
      )}

      {/* ── Footer: 状态栏 + 生成按钮 ── */}
      <div className="border-t flex-shrink-0">
        {/* 流式生成进度 */}
        {generating && (
          <div className="px-3 py-2 border-b">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
              <Spinner className="w-3 h-3" />
              <span>正在生成日报{streamingContent ? '...' : '，连接 AI 服务中...'}</span>
            </div>
            {streamingContent && (
              <div className="text-[11px] text-foreground/70 max-h-20 overflow-y-auto bg-muted/30 rounded px-2 py-1.5 whitespace-pre-wrap">
                {streamingContent.slice(-200)}{streamingContent.length > 200 ? '...' : ''}
              </div>
            )}
          </div>
        )}

        {/* 状态栏 */}
        <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-b">
          共 {total} 条提交 · 最后同步于 {formatTime(lastSync)}
        </div>

        {/* 生成按钮 */}
        {total > 0 && (
          <div className="p-3">
            <Button
              onClick={handleGenerate}
              disabled={selectedCommits.size === 0 || generating}
              className="w-full gap-2 text-sm"
              size="sm"
            >
              {generating ? (
                <>
                  <Spinner className="w-3.5 h-3.5" />
                  生成中...
                </>
              ) : (
                <>
                  <Wand2Icon className="w-3.5 h-3.5" />
                  生成日报 ({selectedCommits.size} 条)
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
