# 项目上下文

### 项目概述

个人日报博客网站，支持：
- 记录每天的日报（标题、内容、心情、标签）
- 根据本周日报自动生成周报（AI 智能汇总）
- 美观的晨间咖啡馆主题设计

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **数据库**: Supabase (PostgreSQL)
- **AI**: coze-coding-dev-sdk (LLM)

## 目录结构

```
├── public/                 # 静态资源
├── scripts/                # 构建与启动脚本
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── daily-reports/route.ts  # 日报 CRUD API
│   │   │   └── weekly-reports/route.ts # 周报生成 API
│   │   ├── page.tsx        # 首页（日报列表）
│   │   ├── weekly/page.tsx # 周报页面
│   │   ├── globals.css     # 全局样式（晨间咖啡馆主题）
│   │   └── layout.tsx      # 根布局
│   ├── components/ui/      # Shadcn UI 组件库
│   ├── storage/database/
│   │   ├── supabase-client.ts  # Supabase 客户端
│   │   └── shared/schema.ts    # 数据库 Schema
│   ├── hooks/              # 自定义 Hooks
│   └── lib/utils.ts        # 工具函数 (cn)
├── DESIGN.md               # 设计规范
├── next.config.ts          # Next.js 配置
├── package.json            # 项目依赖
└── tsconfig.json           # TypeScript 配置
```

## 数据库表结构

### daily_reports (日报表)
- id: 主键
- date: 日期（唯一）
- title: 标题
- content: 内容
- mood: 心情（可选）
- tags: 标签数组（JSONB）
- is_published: 是否发布
- created_at/updated_at: 时间戳

### weekly_reports (周报表)
- id: 主键
- week_start_date: 周开始日期（周一）
- week_end_date: 周结束日期（周日）
- summary: 周报内容（AI生成）
- is_published: 是否发布
- created_at/updated_at: 时间戳

## API 接口

### 日报 API (`/api/daily-reports`)
- GET: 获取日报列表或单个日报
- POST: 创建日报
- PUT: 更新日报
- DELETE: 删除日报

### 周报 API (`/api/weekly-reports`)
- GET: 获取周报列表
- POST: 生成本周周报（AI）
- DELETE: 删除周报

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。

## 开发规范

### 编码规范
- TypeScript strict 模式
- 禁止隐式 any 和 as any
- 使用 snake_case 字段名（Supabase 要求）

### Hydration 问题防范
- 使用 'use client' + useEffect + useState 处理动态内容
- 禁止在 JSX 中直接使用 Date.now()、Math.random()

## UI 设计规范

详见 `DESIGN.md`，主题为「晨间咖啡馆」：
- 主背景：米白色纸张 (#FAF8F5)
- 主色调：植物绿植 (#5B8C5A)
- 强调色：焦糖咖啡 (#D4A574)
- 字体：思源黑体、Inter

## Design Context

基于 `/impeccable teach` 生成的设计上下文：

### 寄存器
product（产品型应用）

### 品牌个性
简洁、高效、专业

### 设计原则
1. **功能优先**：每个设计决策都应该服务于核心功能（记录、查看、生成）
2. **减少认知负荷**：界面元素清晰明确，用户不需要思考就能完成操作
3. **一致性**：保持整个产品在交互、视觉和文案上的一致性
4. **渐进式披露**：只在需要时显示复杂功能，保持主界面简洁
5. **可靠感**：通过稳定的交互和专业的视觉，建立用户对工具的信任

### 关键颜色
- **植物绿植** (#5B8C5A): 主色调，用于主要按钮、链接、强调元素
- **焦糖咖啡** (#D4A574): 强调色，用于次要按钮、标签、装饰元素
- **新芽绿** (#10B981): 成功状态色，用于确认、完成、积极反馈

### 设计规范
- 详见 `DESIGN.md`（Google Stitch 格式）
- 扩展令牌：`.impeccable/design.json`
- 使用 Impeccable 技能进行设计迭代：`/impeccable craft`、`/impeccable shape`、`/impeccable polish` 等
