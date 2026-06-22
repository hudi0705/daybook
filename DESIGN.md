---
name: 日报笔记
description: 团队日报协作工具，晨间咖啡馆主题设计
colors:
  primary: "#5B8C5A"
  accent: "#D4A574"
  success: "#10B981"
  background: "#FAF8F5"
  card: "#FFFFFF"
  foreground: "#1A1A1A"
  muted-foreground: "#6B7280"
  border: "#E5E7EB"
typography:
  display:
    fontFamily: "Noto Sans SC, Inter, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Noto Sans SC, Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Noto Sans SC, Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "24px"
---

# Design System: 日报笔记

## 1. Overview

**Creative North Star: "咖啡馆工作台"**

这是一个为团队协作设计的日报工具，灵感来自晨间咖啡馆的温暖氛围与高效工作台的结合。设计追求温暖而专业的平衡，在保持工具可靠性的同时，注入人文关怀的温度感。

系统拒绝过于简陋的工具界面，避免粗糙的视觉和功能堆砌。每个设计决策都服务于核心功能：记录、查看、生成。通过简洁的界面减少认知负荷，让用户专注于内容本身。

**Key Characteristics:**
- 温暖的色调搭配专业的布局
- 清晰的视觉层次和信息架构
- 友好直观的交互反馈
- 一致的组件设计语言

## 2. Colors

配色方案以晨间咖啡馆为灵感，平衡温暖感与专业性。

### Primary
- **植物绿植** (#5B8C5A): 主色调，用于主要按钮、链接、强调元素。象征成长与活力，传达团队协作的积极氛围。

### Secondary
- **焦糖咖啡** (#D4A574): 强调色，用于次要按钮、标签、装饰元素。温暖而不过度，为界面增添人情味。

### Tertiary
- **新芽绿** (#10B981): 成功状态色，用于确认、完成、积极反馈。比主色调更明亮，传达成就感。

### Neutral
- **米白纸张** (#FAF8F5): 主背景色，柔和不刺眼，长时间使用不疲劳。
- **纯白卡片** (#FFFFFF): 卡片和容器背景，提供清晰的内容区域。
- **铅笔书写** (#1A1A1A): 主文字色，高对比度确保可读性。
- **铅笔阴影** (#6B7280): 次要文字色，用于描述、标签、辅助信息。
- **纸张边缘** (#E5E7EB): 边框和分隔线，微妙而不突兀。

### Named Rules
**The Warm Professional Rule.** 主色调和强调色的比例控制在3:1，确保专业感的同时不失温暖。避免过于冰冷的企业感，也不过度使用暖色失去专业性。

## 3. Typography

**Display Font:** Noto Sans SC (with Inter, system-ui, sans-serif fallback)
**Body Font:** Noto Sans SC (with Inter, system-ui, sans-serif fallback)
**Label/Mono Font:** Inter (with system-ui fallback)

**Character:** 中英文混排的现代无衬线字体组合，兼顾中文阅读舒适度和英文数字的清晰度。字重对比明确，层次分明。

### Hierarchy
- **Display** (600, 1.5rem, 1.4): 页面标题、重要标题，用于需要强调的场合。
- **Headline** (500, 1.25rem, 1.4): 章节标题，组织内容结构。
- **Title** (500, 1rem, 1.4): 卡片标题、列表项标题。
- **Body** (400, 1rem, 1.6): 正文内容，最大行宽65-75ch，确保阅读舒适度。
- **Label** (500, 0.875rem, 1.4): 按钮文字、标签、辅助信息。

### Named Rules
**The Readability First Rule.** 正文行高1.6，段落间距12px，确保长时间阅读不疲劳。避免过小的字体（<14px）影响可读性。

## 4. Elevation

采用分层设计，通过阴影和层次创建视觉深度，同时保持界面的简洁感。阴影作为结构元素，而非装饰。

### Shadow Vocabulary
- **卡片悬浮** (`box-shadow: 0 2px 8px rgba(0,0,0,0.08)`): 卡片默认状态，微妙提升。
- **卡片悬停** (`box-shadow: 0 4px 12px rgba(0,0,0,0.12)`): 鼠标悬停时，增强立体感。
- **对话框** (`box-shadow: 0 8px 24px rgba(0,0,0,0.16)`): 模态窗口，明确层级关系。

### Named Rules
**The Flat-By-Default Rule.** 界面元素默认平坦，阴影仅在交互状态（悬停、聚焦）或层级关系（模态、下拉）时出现，避免视觉噪音。

## 5. Components

### Buttons
- **Shape:** 圆角8px (rounded-md)
- **Primary:** 植物绿植背景，白色文字，8px 16px内边距
- **Hover / Focus:** 背景色加深，添加聚焦环
- **Secondary / Ghost / Outline:** 多种变体适应不同场景

### Cards
- **Corner Style:** 圆角16px (rounded-xl)
- **Background:** 纯白卡片背景
- **Shadow Strategy:** 分层设计，默认悬浮阴影，悬停增强
- **Border:** 1px纸张边缘色边框
- **Internal Padding:** 24px内边距

### Inputs / Fields
- **Style:** 纸张边缘色边框，米白纸张背景，圆角8px
- **Focus:** 边框色变为主色调，添加聚焦环
- **Error / Disabled:** 错误状态使用破坏色，禁用状态降低透明度

### Navigation
- **Style:** 顶部导航栏，固定定位，半透明背景
- **Typography:** 标签使用Label字重，悬停状态使用主色调
- **Default/Hover/Active:** 清晰的状态反馈

## 6. Do's and Don'ts

### Do:
- **Do** 使用植物绿植作为主要强调色，控制在屏幕面积的10%以内
- **Do** 保持卡片和容器的圆角一致性（16px）
- **Do** 使用分层设计创造视觉层次，避免平面化
- **Do** 确保文字与背景的对比度至少4.5:1
- **Do** 使用温暖而专业的色调组合

### Don't:
- **Don't** 使用高饱和度颜色或刺眼的渐变
- **Don't** 过度使用动画效果影响阅读和操作
- **Don't** 密集堆砌内容，保持呼吸感和留白
- **Don't** 使用过细的字体（<14px）影响可读性
- **Don't** 创建过于简陋的工具界面，避免粗糙的视觉设计