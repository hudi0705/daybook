'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { BookMarkedIcon, MailIcon, LockIcon, EyeIcon, EyeOffIcon } from 'lucide-react';
import Link from 'next/link';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [wechatQrcodeUrl, setWechatQrcodeUrl] = useState('');
  const [wechatLoading, setWechatLoading] = useState(false);

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      const errorMessages: Record<string, string> = {
        wechat_no_code: '微信登录未完成，请重试',
        wechat_token_error: '微信登录失败，请重试',
        wechat_userinfo_error: '获取微信用户信息失败',
        db_error: '数据库连接失败',
      };
      toast.error(errorMessages[error] || '登录失败');
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchWechatQrcode = async () => {
      setWechatLoading(true);
      try {
        const res = await fetch('/api/auth/wechat/qrcode');
        const data = await res.json();
        if (data.success) {
          setWechatQrcodeUrl(data.data.qrcodeUrl);
        }
      } catch (err) {
        console.error('获取微信二维码失败:', err);
      } finally {
        setWechatLoading(false);
      }
    };
    fetchWechatQrcode();
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('请输入邮箱和密码');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await res.json();
      if (data.success) {
        toast.success('登录成功');
        window.location.href = '/';
      } else {
        toast.error(data.error || '登录失败');
      }
    } catch {
      toast.error('登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <BookMarkedIcon className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">欢迎回来</h1>
          <p className="text-sm text-muted-foreground mt-1">登录你的日报账号</p>
        </div>

        <div className="bg-card border border-border/40 rounded-2xl p-6 mb-6">
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">邮箱</label>
              <div className="relative">
                <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border/50 bg-muted/20 text-sm focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">密码</label>
              <div className="relative">
                <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入密码"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border/50 bg-muted/20 text-sm focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Spinner className="w-4 h-4 mr-2" /> : null}
              {loading ? '登录中...' : '登录'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/register" className="text-sm text-primary hover:underline">
              还没有账号？立即注册
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-border/40" />
          <span className="text-xs text-muted-foreground">其他登录方式</span>
          <div className="flex-1 h-px bg-border/40" />
        </div>

        <div className="bg-card border border-border/40 rounded-2xl p-6">
          <div className="text-center">
            <p className="text-sm font-medium text-foreground mb-4">微信扫码登录</p>
            {wechatLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="w-6 h-6" />
              </div>
            ) : wechatQrcodeUrl ? (
              <div>
                <div className="w-48 h-48 mx-auto bg-muted/30 rounded-xl flex items-center justify-center mb-4 overflow-hidden">
                  <iframe
                    src={wechatQrcodeUrl}
                    className="w-full h-full border-0"
                    title="微信登录二维码"
                  />
                </div>
                <p className="text-xs text-muted-foreground">请使用微信扫描二维码登录</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8">微信登录暂不可用</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner className="w-6 h-6 text-primary" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
