import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { GitCommitsSidebar, type GitCommit } from '@/components/features/daily/git-commits-sidebar';
import { AiSettingsDialog } from '@/components/features/settings/ai-settings-dialog';
import { AI_STYLES, loadStyle, saveStyle, type AiStyle } from '@/lib/ai-config';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  HomeIcon,
  FileTextIcon,
  BookOpenIcon,
  StickyNoteIcon,
  FolderGit2Icon,
  LogOutIcon,
  GitBranchIcon,
  SettingsIcon,
  PaletteIcon,
} from 'lucide-react';

const navItems = [
  { path: '/', label: '首页', icon: HomeIcon },
  { path: '/daily', label: '日报', icon: FileTextIcon },
  { path: '/weekly', label: '周报', icon: BookOpenIcon },
  { path: '/notes', label: '笔记', icon: StickyNoteIcon },
  { path: '/settings', label: '设置项目地址', icon: FolderGit2Icon },
];

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [gitSidebarOpen, setGitSidebarOpen] = useState(true);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [style, setStyle] = useState<AiStyle>('detailed');

  // 加载保存的风格
  useEffect(() => {
    setStyle(loadStyle());
  }, []);

  // 保存风格到配置
  const handleStyleChange = (newStyle: AiStyle) => {
    setStyle(newStyle);
    saveStyle(newStyle);
  };

  const handleGitReportGenerated = (commits: GitCommit[], content: string, title: string) => {
    toast.success('日报内容已生成，请前往日报页面保存');
  };

  const handleReportSaved = () => {
    toast.success('日报已保存，可在日报页面查看');
  };

  return (
    <div className="h-screen flex overflow-hidden">
      {/* 侧边栏 */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 flex flex-col">
        {/* Logo 区域 */}
        <div className="mb-6">
          <h1 className="text-xl font-bold">Daybook</h1>
          <p className="text-sm text-gray-500 mt-1">{user?.display_name || user?.email}</p>
        </div>

        {/* 导航项 */}
        <nav className="space-y-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* 底部操作区 */}
        <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          {/* 生成风格选择 */}
          <div>
            <label className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
              <PaletteIcon className="w-3.5 h-3.5" />
              生成风格
            </label>
            <Select value={style} onValueChange={(v) => handleStyleChange(v as AiStyle)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_STYLES.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* AI 设置按钮 */}
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5 text-xs"
            onClick={() => setAiSettingsOpen(true)}
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            AI 设置
          </Button>

          {/* 收起 Git 按钮 */}
          <Button
            variant={gitSidebarOpen ? "default" : "outline"}
            size="sm"
            className="w-full gap-1.5 text-xs"
            onClick={() => setGitSidebarOpen(!gitSidebarOpen)}
          >
            <GitBranchIcon className="w-3.5 h-3.5" />
            {gitSidebarOpen ? "收起" : "展开"} Git
          </Button>

          {/* 退出登录 */}
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-600 dark:text-gray-400"
            onClick={logout}
          >
            <LogOutIcon className="w-4 h-4 mr-3" />
            退出登录
          </Button>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-hidden flex">
        <div className="flex-1 overflow-y-auto container mx-auto p-6">
          <Outlet />
        </div>
        {gitSidebarOpen && (
          <div className="w-80 border-l border-gray-200 dark:border-gray-700 flex flex-col flex-shrink-0">
            <GitCommitsSidebar
              onGenerateReport={handleGitReportGenerated}
              onReportSaved={handleReportSaved}
            />
          </div>
        )}
      </main>

      {/* AI 设置对话框 */}
      <AiSettingsDialog open={aiSettingsOpen} onOpenChange={setAiSettingsOpen} />
    </div>
  );
}
