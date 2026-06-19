# Plan: AI 设置弹窗 — 用户自定义模型配置

**Source PRD**: 自由输入需求
**Selected Milestone**: AI 设置弹窗 + MIMO 模型支持
**Complexity**: Medium

## Summary

在周报生成页面右上角增加设置按钮，点击弹出 Dialog 让用户填写自定义 AI 请求地址（API Base URL）、API Key 和选择模型。目前先支持 MIMO 模型。配置保存在浏览器 localStorage 中，后端 API 路由读取前端传来的配置来调用 LLM，不再使用硬编码的 `coze-coding-dev-sdk` 配置。

## Patterns to Mirror

| Category | Source | Pattern |
|----------|--------|---------|
| Dialog | `src/app/page.tsx:9,51,67-77` | `useState<boolean>` 控制开关 + `Dialog/DialogContent/DialogHeader/DialogTitle` + body scroll lock |
| Form inputs | `src/app/page.tsx:56-59` | `useState` + `Input`/`Textarea`/`Label` 非受控模式 |
| API route | `src/app/api/weekly-reports/generate/route.ts` | `NextRequest` → `NextResponse.json({ success, data/error })` 信封格式 |
| LLM 调用 | `src/app/api/weekly-reports/generate/route.ts:72-80` | `messages` 数组 + `model` + `temperature` 参数 |
| Toast | `sonner` 已安装但未在周报页使用 — 本次用 `toast` 替代 `alert()` |

## Files to Change

| File | Action | Why |
|------|--------|-----|
| `src/lib/ai-config.ts` | **CREATE** | localStorage 读写工具 + 类型定义 + 模型预设 |
| `src/components/ai-settings-dialog.tsx` | **CREATE** | AI 设置弹窗组件（Dialog + 表单） |
| `src/app/weekly/page.tsx` | **UPDATE** | 右上角加 Settings 按钮 + 集成设置弹窗 + 传递配置到 API |
| `src/app/api/weekly-reports/generate/route.ts` | **UPDATE** | 接收前端传来的 model/baseUrl/apiKey，替换硬编码 LLMClient |
| `src/app/api/weekly-reports/route.ts` | **UPDATE** | 同上，旧的单步生成路由也改为接收前端配置 |

## Tasks

### Task 1: 创建 AI 配置类型与 localStorage 工具 (`src/lib/ai-config.ts`)

- **Action**: 定义 `AiProviderConfig` 接口和 localStorage 读写函数
- **Mirror**: `src/lib/utils.ts` — 工具函数风格
- **内容**:
  - `AiModelPreset` 接口: `{ id, name, defaultBaseUrl }`
  - `AiProviderConfig` 接口: `{ baseUrl, apiKey, modelId }`
  - `AI_MODEL_PRESETS` 常量数组，预设 MIMO (SiliconFlow 平台)
  - `loadAiConfig()` / `saveAiConfig()` / `clearAiConfig()` 函数
  - `callOpenAICompatible(config, messages, options)` 共享的 OpenAI 兼容 API 调用函数
- **Validate**: `pnpm tsc --noEmit` 通过

### Task 2: 创建 AI 设置弹窗组件 (`src/components/ai-settings-dialog.tsx`)

- **Action**: 使用 shadcn Dialog 创建设置表单
- **Mirror**: `src/app/page.tsx` 的 Dialog 使用模式
- **内容**:
  - 模型选择下拉框（Select）— 从预设列表选，选中后自动填充默认 baseUrl
  - API Base URL 输入框 — 可手动修改
  - API Key 输入框 — `type="password"`，带显示/隐藏切换
  - 保存/清除按钮 → `saveAiConfig()` / `clearAiConfig()` 写入 localStorage
  - 使用 `sonner` toast 提示保存成功
- **Validate**: 组件编译无 TS 错误

### Task 3: 修改周报页面集成设置按钮 (`src/app/weekly/page.tsx`)

- **Action**:
  1. 在 header 右上角增加 `Button` (Settings/齿轮 icon) 触发 AI 设置弹窗
  2. `handleExtractPoints` 和 `handleGenerateWeekly` 调用 API 时附带 `ai_config` 参数
  3. 如果未配置 API Key，点击生成时先弹出设置弹窗
  4. 用 `toast` 替换 `alert()` 进行错误提示
- **Mirror**: 现有 header 布局 (217-234 行)
- **Validate**: 页面正常渲染，按钮可见

### Task 4: 修改后端 API 路由支持自定义配置 (`src/app/api/weekly-reports/generate/route.ts`)

- **Action**:
  1. 从 request body 解析 `ai_config: { baseUrl, apiKey, modelId }`
  2. 如果有 `ai_config`，使用 `callOpenAICompatible()` 调用（而非 `coze-coding-dev-sdk`）
  3. 如果没有 `ai_config`，保持原有 `LLMClient` 行为（向后兼容）
- **Mirror**: 现有 error handling 模式 (try/catch → NextResponse.json({ success: false, error }))
- **Validate**: `pnpm tsc --noEmit` 通过

### Task 5: 同步修改旧路由 (`src/app/api/weekly-reports/route.ts`)

- **Action**: 与 Task 4 相同的改动应用到旧的单步生成 POST 路由
- **Mirror**: 同 Task 4
- **Validate**: `pnpm tsc --noEmit` 通过

## 配置存储方案

使用 **localStorage** 存储，理由：
1. API Key 属于用户个人配置，不需要服务端持久化
2. 无需新建数据库表，实现简单
3. 每个浏览器独立配置，不影响其他用户
4. 后续可轻松迁移到数据库（localStorage 只是前端缓存层）

前端在调用 API 时将 `ai_config` 放入 request body，后端直接使用该配置调用 LLM。

## MIMO 模型接入方式

MIMO 通过 OpenAI 兼容的 API 格式调用（如 SiliconFlow 平台）：

```
POST {baseUrl}/chat/completions
Authorization: Bearer {apiKey}
Content-Type: application/json

{
  "model": "MiMo-7B-RL",
  "messages": [...],
  "temperature": 0.7
}
```

后端用原生 `fetch` 调用，不依赖额外 SDK。

## Validation

```bash
pnpm tsc --noEmit          # 类型检查
pnpm build                  # 构建验证
```

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| MIMO 模型 API 格式不完全兼容 OpenAI | Low | SiliconFlow 等平台已标准化，fallback 到错误提示 |
| localStorage 中 API Key 安全性 | Medium | 仅存浏览器本地，不传服务端日志；password 类型输入 |
| 旧路由与新路由重复代码 | Medium | 提取共享的 `callOpenAICompatible()` 到 `src/lib/ai-config.ts` |

## Acceptance

- [ ] 周报页面右上角可见设置按钮（齿轮图标）
- [ ] 点击弹出 Dialog，包含模型选择、API 地址、API Key 三个字段
- [ ] 选择 MIMO 预设后自动填充默认 API 地址
- [ ] 配置保存到 localStorage，刷新后持久化
- [ ] 未配置 API Key 时点击生成会弹出设置弹窗
- [ ] 后端使用用户配置的地址和 Key 调用 LLM
- [ ] 无配置时保持原有 coze-coding-dev-sdk 行为
- [ ] `pnpm build` 通过
