<div align="center">

# 📔 Daybook

### 个人日报/周报管理系统

<p>
  <img src="https://img.shields.io/badge/version-1.0.0-blue?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Electron-35-47848F?style=flat-square&logo=electron" alt="Electron">
</p>

<p>
  <strong>一款基于 AI 的智能日报/周报管理系统</strong><br>
  自动读取 Git 提交记录，AI 一键生成专业日报
</p>

---

[功能特性](#-功能特性) •
[快速开始](#-快速开始) •
[技术架构](#-技术架构) •
[使用指南](#-使用指南) •
[截图展示](#-截图展示)

</div>

---

## ✨ 功能特性

### 🤖 AI 智能生成

<table>
<tr>
<td width="50%">

**Git 提交记录解析**
- 自动读取项目 Git 提交记录
- 智能识别提交类型（feat/fix/refactor 等）
- 支持多项目配置

</td>
<td width="50%">

**AI 一键生成**
- 支持多种 AI 模型（DeepSeek、通义千问、Mimo 等）
- 流式响应，实时显示生成过程
- 支持多种生成风格（详细/简洁/技术向/汇报向）

</td>
</tr>
</table>

### 📝 日报管理

<table>
<tr>
<td width="50%">

**创建与编辑**
- 富文本编辑器
- 心情记录
- 标签分类
- 日期选择

</td>
<td width="50%">

**查看与管理**
- 按周分组展示
- 列表/网格视图切换
- 搜索与筛选
- 导出为 PDF/Word/Markdown

</td>
</tr>
</table>

### 📊 数据可视化

- 📅 **GitHub 风格热力图** - 直观展示日报记录频率
- 📈 **贡献统计** - 统计日报数量、活跃天数
- 📆 **周视图** - 按周查看日报分布

### 🔧 其他功能

| 功能 | 说明 |
|------|------|
| 📋 周报生成 | 基于日报汇总，AI 生成周报 |
| 📝 笔记管理 | 支持 Markdown 格式笔记 |
| 🔐 用户认证 | 邮箱登录/注册，JWT 认证 |
| 🌙 深色模式 | 支持深色/浅色主题切换 |
| 📱 响应式 | 适配不同屏幕尺寸 |
| 💾 数据持久化 | MySQL 数据库存储，安全可靠 |

---

## 🚀 快速开始

### 环境要求

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0
- **MySQL** >= 8.0
- **Git**（用于读取提交记录）

### 安装步骤

```bash
# 1. 克隆项目
git clone https://github.com/hudi0705/daybook.git
cd daybook

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库连接和 AI API

# 4. 初始化数据库
pnpm migrate

# 5. 启动开发服务器
pnpm dev
```

### 环境变量配置

```env
# 数据库配置
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=daybook

# JWT 密钥
JWT_SECRET=your_jwt_secret_key

# 服务器端口
PORT=5000
```

---

## 🏗️ 技术架构

### 技术栈

<div align="center">

| 层级 | 技术 | 说明 |
|:----:|------|------|
| **前端** | React 19 + TypeScript | 用户界面 |
| **UI 组件** | Radix UI + Tailwind CSS | 组件库 + 样式 |
| **状态管理** | React Context | 全局状态 |
| **路由** | React Router v7 | 页面路由 |
| **构建** | Vite 6 | 开发与构建 |
| **后端** | Express.js | API 服务器 |
| **数据库** | MySQL 8 | 数据持久化 |
| **ORM** | Drizzle ORM | 数据库操作 |
| **认证** | JWT + bcrypt | 用户认证 |
| **桌面端** | Electron 35 | 桌面应用打包 |

</div>

### 项目结构

```
daybook-enterprise/
├── 📁 electron/              # Electron 主进程
│   └── main.cjs             # 主进程入口
├── 📁 scripts/              # 构建脚本
│   ├── build-electron.mjs   # Electron 打包脚本
│   ├── bundle-server.mjs    # 后端打包脚本
│   └── prepare-electron-deps.mjs
├── 📁 server/               # 后端代码
│   ├── api/                 # API 路由
│   │   ├── auth/            # 认证 API
│   │   ├── daily-reports/   # 日报 API
│   │   ├── weekly-reports/  # 周报 API
│   │   ├── git/             # Git API
│   │   └── settings/        # 设置 API
│   ├── middleware/          # 中间件
│   ├── utils/               # 工具函数
│   ├── db.ts                # 数据库连接
│   └── index.ts             # 服务器入口
├── 📁 src/                  # 前端代码
│   ├── app/                 # 页面组件
│   │   ├── (auth)/          # 认证页面
│   │   └── (dashboard)/     # 主界面页面
│   ├── components/          # 组件
│   │   ├── ui/              # UI 组件
│   │   ├── features/        # 业务组件
│   │   └── layouts/         # 布局组件
│   ├── contexts/            # Context
│   ├── lib/                 # 工具库
│   └── styles/              # 样式文件
├── 📄 package.json          # 项目配置
├── 📄 vite.config.ts        # Vite 配置
├── 📄 tsconfig.json         # TypeScript 配置
└── 📄 electron-builder.yml  # Electron 打包配置
```

---

## 📖 使用指南

### 1️⃣ 配置 AI 模型

1. 点击左侧导航的 **「AI 设置」**
2. 选择 AI 模型（推荐 DeepSeek 或 Mimo）
3. 填写 API 地址和 API Key
4. 点击 **「获取可用模型」** 选择模型
5. 保存设置

### 2️⃣ 配置项目地址

1. 点击左侧导航的 **「设置项目地址」**
2. 输入 Git 项目路径
3. 点击保存

### 3️⃣ 生成日报

1. 进入 **「日报」** 页面
2. 右侧会显示 Git 提交记录
3. 选择要包含的提交记录
4. 选择生成风格（详细/简洁/技术向/汇报向）
5. 点击 **「生成日报」**
6. AI 会自动生成并保存日报

### 4️⃣ 手动编写日报

1. 点击 **「写日报」** 按钮
2. 选择日期
3. 填写标题和内容
4. 选择心情和标签
5. 点击保存

### 5️⃣ 生成周报

1. 进入 **「周报」** 页面
2. 选择要生成的周
3. 点击 **「开始生成周报」**
4. AI 会根据该周的日报生成周报

---

## 📸 截图展示

<div align="center">

### 首页 - 数据概览

![首页](screenshots/home.png)

### 日报页面 - AI 生成

![日报](screenshots/daily.png)

### 周报页面

![周报](screenshots/weekly.png)

### AI 设置

![设置](screenshots/settings.png)

</div>

---

## 🛠️ 开发命令

```bash
# 开发模式
pnpm dev

# 构建前端
pnpm build

# 运行测试
pnpm test

# Electron 开发模式
pnpm electron:dev

# Electron 打包
pnpm electron:build

# 代码格式化
pnpm format

# 类型检查
pnpm type-check
```

---

## 📦 打包发布

### 打包为 Windows EXE

```bash
# 执行打包
pnpm electron:build

# 产出文件
# release/Daybook Setup 1.0.0.exe  (约 87MB)
```

### 打包为 Web 应用

```bash
# 构建前端
pnpm build

# 产出目录
# dist/  (可部署到任何静态服务器)
```

---

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/your-feature`
3. 提交更改：`git commit -m 'feat: add your feature'`
4. 推送分支：`git push origin feature/your-feature`
5. 提交 Pull Request

### 提交规范

```
feat: 新功能
fix: 修复 Bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试相关
chore: 构建/工具相关
```

---

## 📄 开源协议

本项目基于 [MIT License](LICENSE) 开源。

---

## 🙏 致谢

感谢以下开源项目：

- [React](https://reactjs.org/) - 用户界面库
- [Vite](https://vitejs.dev/) - 构建工具
- [Electron](https://www.electronjs.org/) - 桌面应用框架
- [Radix UI](https://www.radix-ui.com/) - 组件库
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [Express.js](https://expressjs.com/) - Web 框架

---

<div align="center">

**Made with ❤️ by Daybook Team**

[⬆ 回到顶部](#-daybook)

</div>
