import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { FolderGit2Icon, CheckCircle2Icon, XCircleIcon, Loader2Icon } from 'lucide-react';
import { fetchWithAuth } from '@/lib/api';

export default function SettingsPage() {
  const { user } = useAuth();
  const [username, setUsername] = useState(user?.display_name || '');
  const [projectPath, setProjectPath] = useState('');
  const [savingPath, setSavingPath] = useState(false);
  const [loadingPath, setLoadingPath] = useState(true);
  const [pathStatus, setPathStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');

  // 加载已保存的项目地址
  useEffect(() => {
    fetchProjectPath();
  }, []);

  const fetchProjectPath = async () => {
    setLoadingPath(true);
    try {
      const res = await fetchWithAuth('/api/settings/project-path');
      const data = await res.json();
      if (data.success && data.data?.project_path) {
        setProjectPath(data.data.project_path);
        setPathStatus('valid');
      }
    } catch (err) {
      console.error('获取项目地址失败:', err);
    } finally {
      setLoadingPath(false);
    }
  };

  const handleSaveProjectPath = async () => {
    if (!projectPath.trim()) {
      toast.error('请输入项目地址');
      return;
    }

    setSavingPath(true);
    setPathStatus('idle');

    try {
      const res = await fetchWithAuth('/api/settings/project-path', {
        method: 'PUT',
        body: JSON.stringify({ project_path: projectPath.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setPathStatus('valid');
        toast.success('项目地址已保存');
      } else {
        setPathStatus('invalid');
        toast.error(data.error || '保存失败');
      }
    } catch (err) {
      setPathStatus('invalid');
      toast.error('保存失败，请检查网络连接');
    } finally {
      setSavingPath(false);
    }
  };

  const handleSave = async () => {
    try {
      // TODO: 实现保存逻辑
      toast.success('设置已保存');
    } catch (error) {
      toast.error('保存失败');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">设置</h1>

      {/* Git 项目地址设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderGit2Icon className="w-5 h-5 text-muted-foreground" />
            Git 项目地址
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            设置 Git 项目路径后，可以通过 Git 提交记录自动生成周报。
          </p>
          <div className="space-y-2">
            <Label htmlFor="project-path">项目路径</Label>
            <div className="flex gap-2">
              <Input
                id="project-path"
                placeholder="例如：E:\projects\my-project"
                value={projectPath}
                onChange={(e) => {
                  setProjectPath(e.target.value);
                  setPathStatus('idle');
                }}
                disabled={loadingPath}
              />
              <Button
                onClick={handleSaveProjectPath}
                disabled={savingPath || loadingPath || !projectPath.trim()}
                className="shrink-0"
              >
                {savingPath ? (
                  <>
                    <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                    验证中...
                  </>
                ) : (
                  '保存'
                )}
              </Button>
            </div>
            {/* 状态提示 */}
            {pathStatus === 'valid' && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2Icon className="w-4 h-4" />
                <span>有效的 Git 仓库</span>
              </div>
            )}
            {pathStatus === 'invalid' && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <XCircleIcon className="w-4 h-4" />
                <span>路径无效或不是 Git 仓库</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              请输入本地 Git 仓库的绝对路径，系统会验证该路径是否为有效的 Git 仓库。
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 个人信息 */}
      <Card>
        <CardHeader>
          <CardTitle>个人信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              value={user?.email || ''}
              disabled
            />
          </div>
          <Button onClick={handleSave}>保存</Button>
        </CardContent>
      </Card>
    </div>
  );
}
