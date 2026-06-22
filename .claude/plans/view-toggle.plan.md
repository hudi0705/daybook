# Plan: 日报列表视图切换

**Complexity**: Small

## Summary
在日报列表标题栏右侧增加一个视图切换按钮，在「全部排列」和「按周折叠」两种视图间切换。默认按周折叠。

## Patterns to Mirror

| Category | Source | Pattern |
|---|---|---|
| 按钮样式 | `src/app/page.tsx:302-313` | Header 中的 ghost button + icon 模式 |
| 状态管理 | `src/app/page.tsx:116-127` | useState 控制 UI 状态 |
| 图标使用 | `src/app/page.tsx:13-28` | lucide-react 图标导入 |

## Files to Change

| File | Action | Why |
|---|---|---|
| `src/app/page.tsx` | UPDATE | 添加视图状态和切换按钮，条件渲染两种列表 |

## Tasks

### Task 1: 添加视图状态和图标导入
- **Action**: 添加 `viewMode` state（`'week' | 'grid'`），默认 `'week'`；导入 `LayoutGridIcon` 和 `ListIcon`
- **Mirror**: 复用现有 useState 模式 (L85-98)
- **Validate**: 无编译错误

### Task 2: 在日报列表标题栏添加切换按钮
- **Action**: 在 `{reports.length} 篇` 旁边添加两个 toggle 按钮（网格视图 / 周视图）
- **Mirror**: 使用与 header 按钮一致的 ghost + icon 样式
- **Validate**: 按钮显示正确，点击切换状态

### Task 3: 条件渲染两种列表视图
- **Action**: 根据 `viewMode` 状态，渲染平铺网格或按周折叠列表
- **Mirror**: 复用现有卡片渲染逻辑（L679-734），提取为复用结构
- **Validate**: 两种视图间切换正常，卡片样式一致

## 实现细节

```tsx
// 状态
const [viewMode, setViewMode] = useState<'week' | 'grid'>('week');

// 标题栏按钮（在 {reports.length} 篇 旁边）
<div className="flex items-center gap-1">
  <button onClick={() => setViewMode('week')} className={viewMode === 'week' ? 'active' : ''}>
    <ListIcon /> // 周视图
  </button>
  <button onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'active' : ''}>
    <LayoutGridIcon /> // 网格视图
  </button>
</div>

// 条件渲染
{viewMode === 'week' ? (
  /* 现有的按周折叠逻辑 */
) : (
  /* 原始的平铺网格 */
)}
```

## Validation
```bash
pnpm dev  # 访问 http://localhost:5000 测试切换
```

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| 无 | - | - |

## Acceptance
- [ ] 列表标题栏显示切换按钮
- [ ] 点击可切换「全部排列」和「按周折叠」
- [ ] 默认为按周折叠视图
- [ ] 两种视图的卡片样式一致
