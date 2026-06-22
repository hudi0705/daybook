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
import { SettingsIcon, EyeIcon, EyeOffIcon, Trash2Icon } from 'lucide-react';
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
    }
  }, [open]);

  // 切换模型预设时自动填充 baseUrl
  const handleModelChange = (newModelId: string) => {
    setModelId(newModelId);
    const preset = AI_MODEL_PRESETS.find((p) => p.id === newModelId);
    if (preset) {
      setBaseUrl(preset.defaultBaseUrl);
    }
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
    setModelId(AI_MODEL_PRESETS[0].id);
    setBaseUrl(AI_MODEL_PRESETS[0].defaultBaseUrl);
    setApiKey('');
    toast.success('AI 配置已清除');
  };

  const selectedPreset = AI_MODEL_PRESETS.find((p) => p.id === modelId);

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
          {/* 模型选择 */}
          <div className="space-y-2">
            <Label htmlFor="ai-model">模型</Label>
            <Select value={modelId} onValueChange={handleModelChange}>
              <SelectTrigger id="ai-model" className="w-full">
                <SelectValue placeholder="选择模型" />
              </SelectTrigger>
              <SelectContent>
                {AI_MODEL_PRESETS.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPreset && (
              <p className="text-xs text-muted-foreground">
                默认模型：{selectedPreset.defaultModel}
              </p>
            )}
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
