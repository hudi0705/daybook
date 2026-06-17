import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/storage/database/mysql-client';
import { weeklyReports, dailyReports } from '@/storage/database/shared/schema';
import { eq, and, asc, sql } from 'drizzle-orm';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { callOpenAICompatible, type AiProviderConfig, type LLMMessage } from '@/lib/ai-config';

// 统一的 LLM 调用函数：优先使用用户自定义配置，回退到 coze SDK
async function invokeLLM(
  messages: LLMMessage[],
  options: { model: string; temperature: number },
  requestHeaders: Headers,
  aiConfig?: AiProviderConfig
) {
  if (aiConfig) {
    return callOpenAICompatible(aiConfig, messages, options);
  }
  const customHeaders = HeaderUtils.extractForwardHeaders(requestHeaders);
  const llmClient = new LLMClient(new Config(), customHeaders);
  return llmClient.invoke(messages, options);
}

// POST - 提取周报重点信息
export async function POST(request: NextRequest) {
  const db = getDb();

  try {
    const body = await request.json();
    const { week_start_date, action, selected_points, ai_config } = body;

    if (!week_start_date) {
      return NextResponse.json(
        { success: false, error: '周开始日期为必填项' },
        { status: 400 }
      );
    }

    const startDate = new Date(week_start_date);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    const week_end_date = endDate.toISOString().split('T')[0];

    const reports = await db.select({
      id: dailyReports.id,
      date: dailyReports.date,
      title: dailyReports.title,
      content: dailyReports.content,
      mood: dailyReports.mood,
      tags: dailyReports.tags,
    })
      .from(dailyReports)
      .where(and(sql`${dailyReports.date} >= ${week_start_date}`, sql`${dailyReports.date} <= ${week_end_date}`))
      .orderBy(asc(dailyReports.date));

    if (!reports || reports.length === 0) {
      return NextResponse.json(
        { success: false, error: '该周没有日报数据，无法生成周报' },
        { status: 400 }
      );
    }

    const reportsText = reports
      .map((r) => `${r.date} (${r.mood || '无心情'}): ${r.title}\n${r.content}`)
      .join('\n\n');

    // Step 1: 提取重点信息
    if (action === 'extract') {
      const extractPrompt = `请分析以下本周日报内容，提取最重要的工作、学习或生活重点，以清晰的列表形式呈现。

本周日报内容：
${reportsText}

要求：
1. 提取 5-8 个最重要的点，每个点用一句话概括
2. 按重要性排序，最重要的放在前面
3. 语言简洁、准确，不要过于笼统
4. 每个点用 "1. xxx" 的格式
5. 不要添加任何额外说明，只输出列表`;

      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: '你是一个专业的信息提取助手，擅长从日常记录中提炼关键信息。' },
        { role: 'user', content: extractPrompt },
      ];

      const response = await invokeLLM(messages, { model: ai_config?.modelName || 'doubao-seed-2-0-lite-260215', temperature: 0.5 }, request.headers, ai_config);

      const points = response.content
        .split('\n')
        .filter(line => line.match(/^\d+\./))
        .map(line => line.replace(/^\d+\.\s*/, '').trim());

      return NextResponse.json({
        success: true,
        data: {
          points,
          week_start_date,
          week_end_date,
          daily_report_count: reports.length,
        },
      });
    }

    // Step 2: 根据用户选择生成美化周报
    if (action === 'generate' && selected_points) {
      const generatePrompt = `请根据用户选择的重点信息，生成一份美观、专业的周报。

用户选择的重点：
${selected_points.map((p: string, i: number) => `${i + 1}. ${p}`).join('\n')}

本周日报原文（供参考）：
${reportsText}

请生成周报，包含以下部分：

## 📋 本周重点
（列出用户选择的重点，保持原意但可优化表达）

## 📈 工作进展
（基于日报内容，补充具体进展描述）

## 💭 心得感悟
（结合心情记录和内容，提炼本周的感受）

## 🎯 下周计划
（基于本周情况，给出3-4个具体建议）

注意：
- 结构清晰，每个部分用标题分隔
- 语言自然流畅，不要太正式
- 控制在400字左右`;

      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: '你是一个专业的周报撰写助手，擅长生成结构清晰、内容丰富的周报。' },
        { role: 'user', content: generatePrompt },
      ];

      const response = await invokeLLM(messages, { model: ai_config?.modelName || 'doubao-seed-2-0-lite-260215', temperature: 0.7 }, request.headers, ai_config);

      const summary = response.content;

      const reportData = {
        week_start_date: new Date(week_start_date),
        week_end_date: new Date(week_end_date),
        summary,
        is_published: true,
      };

      const existing = await db.select().from(weeklyReports)
        .where(eq(weeklyReports.week_start_date, week_start_date)).limit(1);

      if (existing.length > 0) {
        await db.update(weeklyReports)
          .set({ ...reportData, updated_at: new Date() })
          .where(eq(weeklyReports.id, existing[0].id));
        const data = await db.select().from(weeklyReports).where(eq(weeklyReports.id, existing[0].id)).limit(1);
        return NextResponse.json({ success: true, data: data[0] });
      } else {
        const result = await db.insert(weeklyReports).values(reportData);
        const data = await db.select().from(weeklyReports).where(eq(weeklyReports.id, result[0].insertId)).limit(1);
        return NextResponse.json({ success: true, data: data[0] });
      }
    }

    return NextResponse.json(
      { success: false, error: '无效的操作类型' },
      { status: 400 }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
