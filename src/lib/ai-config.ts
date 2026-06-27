/**
 * AI 模型配置模块
 * 管理 AI 模型的预设、加载、保存和清除
 */

const STORAGE_KEY = 'daybook_ai_config';
const STYLE_STORAGE_KEY = 'daybook_ai_style';

export type AiStyle = 'detailed' | 'concise' | 'technical' | 'report' | 'pony';

export const AI_STYLES: { id: AiStyle; name: string; description: string }[] = [
  { id: 'detailed', name: '详细', description: '包含完整细节的日报' },
  { id: 'concise', name: '简洁', description: '简明扼要的重点' },
  { id: 'technical', name: '技术向', description: '侧重技术实现' },
  { id: 'report', name: '汇报向', description: '适合向上汇报' },
  { id: 'pony', name: '小马笔记日报', description: '按模块分组、附 commit 的结构化日报' },
];

export interface AiProviderConfig {
  baseUrl: string;
  apiKey: string;
  modelId: string;
  modelName: string;
  style?: AiStyle;
}

export interface AiModelPreset {
  id: string;
  name: string;
  defaultBaseUrl: string;
  defaultModel: string;
  description: string;
}

export const AI_MODEL_PRESETS: AiModelPreset[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    description: 'DeepSeek V3，性价比高',
  },
  {
    id: 'qwen',
    name: '通义千问',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    description: '阿里云通义千问系列',
  },
  {
    id: 'moonshot',
    name: 'Moonshot',
    defaultBaseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
    description: '月之暗面 Kimi',
  },
  {
    id: 'siliconflow',
    name: 'SiliconFlow',
    defaultBaseUrl: 'https://api.siliconflow.cn/v1',
    defaultModel: 'deepseek-ai/DeepSeek-V3',
    description: '硅基流动，多模型聚合',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    description: 'OpenAI GPT 系列',
  },
  {
    id: 'mimo',
    name: 'Mimo',
    defaultBaseUrl: 'https://token-plan-cn.xiaomimimo.com/v1',
    defaultModel: 'mimo-v2.5-pro',
    description: '小米 Mimo AI',
  },
  {
    id: 'custom',
    name: '自定义',
    defaultBaseUrl: '',
    defaultModel: '',
    description: '自定义 OpenAI 兼容 API',
  },
];

const PRESET_MAP = new Map(AI_MODEL_PRESETS.map((p) => [p.id, p]));

/**
 * 从 localStorage 加载 AI 配置
 */
export function loadAiConfig(): AiProviderConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const config = JSON.parse(raw) as AiProviderConfig;
    if (!config.baseUrl || !config.apiKey) return null;
    return config;
  } catch {
    return null;
  }
}

/**
 * 保存 AI 配置到 localStorage
 */
export function saveAiConfig(config: AiProviderConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/**
 * 清除 AI 配置
 */
export function clearAiConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * 从 localStorage 加载独立存储的生成风格
 */
export function loadStyle(): AiStyle {
  try {
    const raw = localStorage.getItem(STYLE_STORAGE_KEY);
    if (raw && AI_STYLES.some((s) => s.id === raw)) {
      return raw as AiStyle;
    }
  } catch {
    // ignore
  }
  return 'detailed';
}

/**
 * 保存生成风格到 localStorage
 */
export function saveStyle(style: AiStyle): void {
  localStorage.setItem(STYLE_STORAGE_KEY, style);
}

/**
 * 根据 modelId 获取预设信息
 */
export function getPresetById(id: string): AiModelPreset | undefined {
  return PRESET_MAP.get(id);
}
