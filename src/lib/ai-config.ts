// AI 模型预设配置
export interface AiModelPreset {
  id: string;
  name: string;
  defaultBaseUrl: string;
  defaultModel: string;
}

// 用户自定义 AI 配置
export interface AiProviderConfig {
  baseUrl: string;
  apiKey: string;
  modelId: string;
  modelName: string;
}

// LLM 调用参数
export interface LLMCallOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
}

// LLM 消息格式
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// LLM 调用结果
export interface LLMResponse {
  content: string;
}

// 模型预设列表
export const AI_MODEL_PRESETS: AiModelPreset[] = [
  {
    id: 'mimo',
    name: 'MiMo (小米)',
    defaultBaseUrl: 'https://api.siliconflow.cn/v1',
    defaultModel: 'mimo-v2.5-pro',
  },
];

const STORAGE_KEY = 'ai-provider-config';

// 从 localStorage 读取配置
export function loadAiConfig(): AiProviderConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AiProviderConfig;
  } catch {
    return null;
  }
}

// 保存配置到 localStorage
export function saveAiConfig(config: AiProviderConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

// 清除配置
export function clearAiConfig(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

// 校验 AI 配置是否有效
export function validateAiConfig(config: AiProviderConfig): string | null {
  if (!config.baseUrl?.trim()) return '请填写 API 请求地址';
  if (!config.apiKey?.trim()) return '请填写 API Key';
  if (!config.modelName?.trim()) return '请选择模型';
  try {
    new URL(config.baseUrl.trim());
  } catch {
    return 'API 请求地址格式不正确';
  }
  return null;
}

// 使用 OpenAI 兼容 API 调用 LLM
export async function callOpenAICompatible(
  config: AiProviderConfig,
  messages: LLMMessage[],
  options: LLMCallOptions
): Promise<LLMResponse> {
  // 先校验配置
  const validationError = validateAiConfig(config);
  if (validationError) {
    throw new Error(validationError);
  }

  const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
      }),
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`无法连接到 AI 服务 (${config.baseUrl})：${reason}`);
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    let detail = errorText;
    try {
      const parsed = JSON.parse(errorText);
      detail = parsed?.error?.message || parsed?.message || errorText;
    } catch { /* 非 JSON，用原文 */ }

    if (res.status === 401) {
      throw new Error(`API Key 无效或已过期，请在设置中重新配置`);
    }
    if (res.status === 404) {
      throw new Error(`模型 "${options.model}" 不存在，请检查模型名称`);
    }
    if (res.status === 429) {
      throw new Error(`请求过于频繁，请稍后再试`);
    }
    throw new Error(`AI 请求失败 (${res.status})：${detail || res.statusText}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('AI 返回格式异常：缺少 content 字段');
  }

  return { content };
}
