# DayBook - 个人日报博客

一个简洁高效的个人日报博客网站，支持每日记录、AI 周报生成、笔记管理，采用温暖的「晨间咖啡馆」主题设计。

## 功能特性

- **日报管理** - 记录每天的工作日报，支持标题、内容、心情、标签
- **AI 周报生成** - 根据本周日报自动生成周报摘要
- **笔记系统** - 分类管理笔记，支持标签筛选
- **贡献图** - 可视化展示每日记录情况
- **响应式设计** - 适配桌面端和移动端

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) |
| UI | React 19 + TypeScript 5 |
| 组件库 | shadcn/ui (Radix UI) |
| 样式 | Tailwind CSS 4 |
| 数据库 | Supabase (PostgreSQL) |
| AI | Coze Coding SDK |
| 包管理 | pnpm 9+ |

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start
```

启动后访问 http://localhost:5000

## 项目结构

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API 路由
│   │   ├── daily-reports/        # 日报 CRUD
│   │   ├── weekly-reports/       # 周报管理
│   │   ├── notes/                # 笔记管理
│   │   ├── categories/           # 分类管理
│   │   ├── tags/                 # 标签管理
│   │   └── contribution/         # 贡献图数据
│   ├── daily/[id]/               # 日报详情页
│   ├── notes/                    # 笔记页面
│   ├── weekly/                   # 周报页面
│   ├── page.tsx                  # 首页
│   ├── layout.tsx                # 根布局
│   └── globals.css               # 全局样式
├── components/                   # 组件
│   ├── ui/                       # shadcn/ui 基础组件
│   └── notes/                    # 笔记相关组件
├── hooks/                        # 自定义 Hooks
├── lib/                          # 工具函数
├── storage/database/             # 数据库配置
└── types/                        # TypeScript 类型定义
```

## 数据库表

| 表名 | 说明 |
|------|------|
| `daily_reports` | 日报表 |
| `weekly_reports` | 周报表 |
| `notes` | 笔记表 |
| `categories` | 分类表 |
| `tags` | 标签表 |

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST/PUT/DELETE | `/api/daily-reports` | 日报增删改查 |
| GET/POST/DELETE | `/api/weekly-reports` | 周报管理 |
| POST | `/api/weekly-reports/generate` | AI 生成周报 |
| GET/POST/PUT/DELETE | `/api/notes` | 笔记增删改查 |
| GET/POST | `/api/categories` | 分类管理 |
| GET/POST | `/api/tags` | 标签管理 |

## 设计主题

「晨间咖啡馆」- 温暖而专业的设计风格：

- **植物绿植** (#5B8C5A) - 主色调
- **焦糖咖啡** (#D4A574) - 强调色
- **新芽绿** (#10B981) - 成功状态色
- **米白纸张** (#FAF8F5) - 背景色

详见 [DESIGN.md](./DESIGN.md)

## 开发规范

- 使用 **pnpm** 作为包管理器
- 优先使用 **shadcn/ui** 组件库
- 使用 **TypeScript** 进行类型安全开发
- 遵循 **Next.js App Router** 规范

## 许可证

MIT
