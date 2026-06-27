'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SettingsIcon, EyeIcon, EyeOffIcon, Trash2Icon, Loader2Icon } from 'lucide-react';
import { toast } from 'sonner';
import {
  AI_MODEL_PRESETS,
  loadAiConfig,
  saveAiConfig,
  clearAiConfig,
  type AiProviderConfig,
} from '@/lib/ai-config';

interface AiSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AiSettingsDialog({ open, onOpenChange }: AiSettingsDialogProps) {
  const [modelId, setModelId] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState('');

  // 打开时从 localStorage 加载已有配置
  useEffect(() => {
    if (open) {
      const config = loadAiConfig();
      if (config) {
        setModelId(config.modelId);
        setBaseUrl(config.baseUrl);
        setApiKey(config.apiKey);
      } else {
        // 默认选中第一个预设
        const first = AI_MODEL_PRESETS[0];
        setModelId(first.id);
        setBaseUrl(first.defaultBaseUrl);
        setApiKey('');
      }
      setShowApiKey(false);
      setFetchedModels([]);
      setModelsError('');
    }
  }, [open]);

  // 切换模型预设时自动填充 baseUrl
  const handlePresetChange = (presetId: string) => {
    const preset = AI_MODEL_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setModelId(preset.defaultModel);
      setBaseUrl(preset.defaultBaseUrl);
    }
  };

  // 构建正确的 models URL
  const buildModelsUrl = (url: string): string => {
    // 移除末尾的斜杠
    url = url.replace(/\/+$/, '');

    // 如果以 /chat/completions 结尾，移除
    url = url.replace(/\/chat\/completions$/, '');

    // 如果以 /v1 结尾，添加 /models
    if (url.endsWith('/v1')) {
      return `${url}/models`;
    }

    // 如果不以 /v1 结尾，添加 /v1/models
    if (!url.includes('/v1/')) {
      return `${url}/v1/models`;
    }

    // 已经包含路径，直接添加 /models
    return `${url}/models`;
  };

  // 获取可用模型列表（最多重试 2 次）
  const handleFetchModels = async () => {
    if (!baseUrl || !apiKey) return;

    setLoadingModels(true);
    setModelsError('');
    setFetchedModels([]);

    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const modelsUrl = buildModelsUrl(baseUrl);

        const response = await fetch(modelsUrl, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
          signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
          const status = response.status;
          if (status === 401) {
            throw new Error('API Key 无效，请检查后重试');
          } else if (status === 403) {
            throw new Error('访问被拒绝，请检查 API Key 权限');
          } else if (status === 404) {
            throw new Error('模型列表接口不存在，请检查 API 地址');
          } else {
            throw new Error(`服务器返回错误: ${status}`);
          }
        }

        const data = await response.json();
        const models = data.data?.map((m: any) => m.id) || [];
        const filtered = models.filter(Boolean);
        setFetchedModels(filtered);
        if (filtered.length === 0) {
          setModelsError('未找到可用模型');
        }
        // 成功则跳出重试循环
        break;
      } catch (err) {
        console.error(`获取模型列表失败 (第 ${attempt + 1} 次):`, err);

        const isLastAttempt = attempt === maxRetries;

        if (err instanceof Error) {
          if (err.name === 'TimeoutError' || err.message.includes('timeout')) {
            if (isLastAttempt) {
              setModelsError('请求超时（30秒），请检查 API 地址是否正确或网络连接');
            }
          } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('ERR_')) {
            if (isLastAttempt) {
              setModelsError('网络错误，请检查 API 地址和网络连接');
            }
          } else if (err.message.includes('401') || err.message.includes('API Key')) {
            setModelsError('API Key 无效，请检查后重试');
            break; // 认证错误不重试
          } else if (err.message.includes('403') || err.message.includes('访问被拒绝')) {
            setModelsError('访问被拒绝，请检查 API Key 权限');
            break; // 权限错误不重试
          } else if (err.message.includes('404') || err.message.includes('不存在')) {
            setModelsError('模型列表接口不存在，请检查 API 地址');
            break; // 地址错误不重试
          } else {
            if (isLastAttempt) {
              setModelsError(`获取失败: ${err.message}`);
            }
          }
        } else {
          if (isLastAttempt) {
            setModelsError('获取模型列表失败，请稍后重试');
          }
        }

        // 非最后一次尝试，等待后重试
        if (!isLastAttempt) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    setLoadingModels(false);
  };

  const handleSave = () => {
    if (!apiKey.trim()) {
      toast.error('请填写 API Key');
      return;
    }
    if (!baseUrl.trim()) {
      toast.error('请填写 API 请求地址');
      return;
    }

    const preset = AI_MODEL_PRESETS.find((p) => p.id === modelId);
    const config: AiProviderConfig = {
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      modelId,
      modelName: preset?.defaultModel ?? modelId,
    };

    saveAiConfig(config);
    toast.success('AI 配置已保存');
    onOpenChange(false);
  };

  const handleClear = () => {
    clearAiConfig();
    setModelId(AI_MODEL_PRESETS[0].defaultModel);
    setBaseUrl(AI_MODEL_PRESETS[0].defaultBaseUrl);
    setApiKey('');
    toast.success('AI 配置已清除');
  };

  const selectedPreset = AI_MODEL_PRESETS.find((p) => p.defaultModel === modelId || modelId.startsWith(p.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-muted-foreground" />
            AI 模型设置
          </DialogTitle>
          <DialogDescription>
            配置 AI 模型的请求地址和密钥，用于生成周报。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 预设模型选择 */}
          <div className="space-y-2">
            <Label>预设模型</Label>
            <div className="flex flex-wrap gap-2">
              {AI_MODEL_PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  variant={selectedPreset?.id === preset.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePresetChange(preset.id)}
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>

          {/* API 请求地址 */}
          <div className="space-y-2">
            <Label htmlFor="ai-base-url">API 请求地址</Label>
            <Input
              id="ai-base-url"
              placeholder="https://api.siliconflow.cn/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              OpenAI 兼容的 API 地址，不需要包含 /chat/completions
            </p>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="ai-api-key">API Key</Label>
            <div className="relative">
              <Input
                id="ai-api-key"
                type={showApiKey ? 'text' : 'password'}
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showApiKey ? (
                  <EyeOffIcon className="w-4 h-4" />
                ) : (
                  <EyeIcon className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              API Key 仅保存在浏览器本地，不会上传到服务器
            </p>
          </div>

          {/* 模型输入框 */}
          <div className="space-y-2">
            <Label htmlFor="ai-model">模型</Label>
            <Input
              id="ai-model"
              placeholder="deepseek-chat"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
            />
          </div>

          {/* 获取可用模型 */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled={!baseUrl || !apiKey || loadingModels}
            onClick={handleFetchModels}
          >
            {loadingModels ? (
              <>
                <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                正在获取模型列表（最多 30 秒）...
              </>
            ) : (
              '获取可用模型'
            )}
          </Button>

          {modelsError && (
            <p className="text-xs text-red-500">{modelsError}</p>
          )}

          {/* 可用模型下拉列表 - 获取成功后显示 */}
          {fetchedModels.length > 0 && (
            <div className="space-y-2">
              <Label>可用模型</Label>
              <Select onValueChange={(value) => setModelId(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择一个模型" />
                </SelectTrigger>
                <SelectContent>
                  {fetchedModels.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="ghost" size="sm" onClick={handleClear} className="gap-1.5 text-destructive hover:text-destructive">
            <Trash2Icon className="w-3.5 h-3.5" />
            清除配置
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>保存</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
