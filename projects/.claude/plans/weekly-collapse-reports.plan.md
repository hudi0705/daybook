# Plan: 日报列表按周折叠

**Source PRD**: 用户需求 - 日报列表按周分组折叠
**Complexity**: Small

## Summary
将当前平铺的日报列表改为按周分组折叠展示。每周为一个可折叠的分组，显示周日期范围和日报数量，当前周默认展开，历史周默认折叠。

## Patterns to Mirror

| Category | Source | Pattern |
|---|---|---|
| UI 组件 | `src/components/ui/collapsible.tsx` | 使用 Radix Collapsible 组件实现折叠 |
| 数据分组 | `src/app/page.tsx:260-268` `getThisWeekCount()` | 按周计算日期范围的逻辑（周一到周日） |
| 卡片样式 | `src/app/page.tsx:600-655` | 现有日报卡片的样式和交互模式 |
| 日期格式化 | `src/app/page.tsx:245-249` `formatDate()` | 已有的日期格式化函数 |

## Files to Change

| File | Action | Why |
|---|---|---|
| `src/app/page.tsx` | UPDATE | 添加周分组逻辑，改造日报列表渲染区域 |

## Tasks

### Task 1: 添加按周分组的工具函数
- **Action**: 在 `page.tsx` 中添加 `groupReportsByWeek()` 函数，将日报数组按周一~周日分组
- **Mirror**: 参考 `getWeekStartDate()` (L251-258) 的周一计算逻辑
- **Validate**: 函数返回 `Map<string, DailyReport[]>`，key 为周一日期字符串

### Task 2: 使用 Collapsible 组件改造列表渲染
- **Action**: 引入 `Collapsible, CollapsibleTrigger, CollapsibleContent` 组件，将日报列表按周渲染为可折叠分组
- **Mirror**: 使用项目已有的 `Collapsible` 组件 (`src/components/ui/collapsible.tsx`)
- **Validate**: 每周显示标题栏（日期范围 + 日报数量），点击可展开/折叠

### Task 3: 设置默认展开状态
- **Action**: 当前周默认展开，历史周默认折叠
- **Mirror**: 复用 `getWeekStartDate()` 判断是否为当前周
- **Validate**: 页面加载时当前周展开，其余折叠

## 实现细节

### 分组逻辑
```typescript
// 将日期归入其所在周的周一
function getMonday(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().split('T')[0];
}

// 分组：返回 { monday: DailyReport[] } 按周倒序
function groupReportsByWeek(reports: DailyReport[]) {
  const groups = new Map<string, DailyReport[]>();
  for (const report of reports) {
    const monday = getMonday(report.date);
    if (!groups.has(monday)) groups.set(monday, []);
    groups.get(monday)!.push(report);
  }
  // 每组内按日期倒序，组间按周一倒序
  return new Map([...groups.entries()].sort((a, b) => b[0].localeCompare(a[0])));
}
```

### UI 结构
```tsx
{[...weekGroups.entries()].map(([monday, weekReports]) => {
  const sunday = getSunday(monday);
  const isCurrentWeek = monday === getWeekStartDate();
  return (
    <Collapsible key={monday} defaultOpen={isCurrentWeek}>
      <CollapsibleTrigger>
        {/* 周标题：3月17日 - 3月23日 · 5篇 */}
        {formatDate(monday)} - {formatDate(sunday)} · {weekReports.length}篇
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {weekReports.map(report => <ReportCard />)}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
})}
```

## Validation
```bash
pnpm dev  # 启动开发服务器，访问 http://localhost:5000
```

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| 日期跨年分组错误 | Low | 使用 ISO 周日期计算，确保跨年正确 |

## Acceptance
- [ ] 日报列表按周分组显示
- [ ] 每组显示周日期范围和日报数量
- [ ] 当前周默认展开
- [ ] 历史周默认折叠
- [ ] 折叠/展开有动画过渡
- [ ] 卡片样式保持不变
