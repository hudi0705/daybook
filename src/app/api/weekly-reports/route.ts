import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/storage/database/mysql-client';
import { weeklyReports, dailyReports } from '@/storage/database/shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { callOpenAICompatible, validateAiConfig, type AiProviderConfig, type LLMMessage } from '@/lib/ai-config';
import { getCurrentUserId } from '@/lib/auth';

// GET - 获取周报列表或单个周报
export async function GET(request: NextRequest) {
  let db;
  try {
    db = getDb();
  } catch (err) {
    console.error('[weekly-reports GET] 数据库连接失败:', err);
    return NextResponse.json(
      { success: false, error: '数据库连接失败，请检查 MySQL 配置' },
      { status: 500 }
    );
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const startDate = searchParams.get('start_date');

  try {
    if (id) {
      const data = await db.select().from(weeklyReports).where(and(eq(weeklyReports.id, parseInt(id)), eq(weeklyReports.user_id, userId))).limit(1);
      return NextResponse.json({ success: true, data: data[0] || null });
    }

    const conditions = [eq(weeklyReports.user_id, userId)];
    if (startDate) {
      conditions.push(sql`${weeklyReports.week_start_date} = ${startDate}`);
    }
    const whereClause = and(...conditions);

    const data = await db.select().from(weeklyReports).where(whereClause).orderBy(desc(weeklyReports.week_start_date)).limit(50);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// POST - 生成周报
export async function POST(request: NextRequest) {
  let db;
  try {
    db = getDb();
  } catch (err) {
    console.error('[weekly-reports POST] 数据库连接失败:', err);
    return NextResponse.json(
      { success: false, error: '数据库连接失败，请检查 MySQL 配置' },
      { status: 500 }
    );
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { week_start_date, force_regenerate, ai_config } = body;

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

    const existing = await db.select().from(weeklyReports)
      .where(and(sql`${weeklyReports.week_start_date} = ${week_start_date}`, eq(weeklyReports.user_id, userId))).limit(1);

    if (existing.length > 0 && !force_regenerate) {
      return NextResponse.json({ success: true, data: existing[0] });
    }

    const reports = await db.select({
      id: dailyReports.id,
      date: dailyReports.date,
      title: dailyReports.title,
      content: dailyReports.content,
      mood: dailyReports.mood,
      tags: dailyReports.tags,
    })
      .from(dailyReports)
      .where(and(sql`${dailyReports.date} >= ${week_start_date} AND ${dailyReports.date} <= ${week_end_date}`, eq(dailyReports.user_id, userId)))
      .orderBy(dailyReports.date);

    if (!reports || reports.length === 0) {
      return NextResponse.json(
        { success: false, error: '该周没有日报数据，无法生成周报' },
        { status: 400 }
      );
    }

    const reportsText = reports
      .map((r) => `${r.date} (${r.mood || '无心情记录'}): ${r.title}\n${r.content}`)
      .join('\n\n');

    const prompt = `你是一个专业的周报生成助手。请根据以下本周的日报内容，生成一份简洁、有条理的周报总结。

本周日报内容：
${reportsText}

请生成周报，包含以下部分：
1. **本周重点**：提炼本周最重要的工作或事件（2-3条）
2. **工作进展**：概述本周完成的主要任务
3. **心得感悟**：基于心情记录和内容，总结本周的感受和思考
4. **下周计划**：基于本周情况，给出下周建议的方向

注意：
- 保持简洁，控制在300字左右
- 语言要自然流畅，不要过于正式
- 如果某天没有心情记录，就忽略该部分`;

    const messages: LLMMessage[] = [
      { role: 'system', content: '你是一个专业的周报生成助手，擅长提炼和总结日常记录。' },
      { role: 'user', content: prompt },
    ];

    if (!ai_config) {
      return NextResponse.json({ success: false, error: '未配置 AI 密钥，请在设置中填写 API Key' }, { status: 400 });
    }
    const validationError = validateAiConfig(ai_config);
    if (validationError) {
      return NextResponse.json({ success: false, error: `AI 配置无效：${validationError}，请在设置中重新配置` }, { status: 400 });
    }
    const response = await callOpenAICompatible(ai_config, messages, { model: ai_config.modelName || 'doubao-seed-2-0-lite-260215', temperature: 0.7 });

    const summary = response.content;

    const reportData = {
      user_id: userId,
      week_start_date: new Date(week_start_date),
      week_end_date: new Date(week_end_date),
      summary,
      is_published: true,
    };

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
  } catch (err) {
    console.error('[weekly-reports] POST Error:', err);
    const errorMessage = err instanceof Error ? err.message : '未知错误';

    if (errorMessage.includes('AI 配置无效') || errorMessage.includes('请填写') || errorMessage.includes('请检查')) {
      return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// DELETE - 删除周报
export async function DELETE(request: NextRequest) {
  let db;
  try {
    db = getDb();
  } catch (err) {
    console.error('[weekly-reports DELETE] 数据库连接失败:', err);
    return NextResponse.json(
      { success: false, error: '数据库连接失败，请检查 MySQL 配置' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { success: false, error: '周报 ID 为必填项' },
      { status: 400 }
    );
  }

  try {
    const data = await db.select().from(weeklyReports).where(eq(weeklyReports.id, parseInt(id))).limit(1);
    await db.delete(weeklyReports).where(eq(weeklyReports.id, parseInt(id)));

    return NextResponse.json({ success: true, data: data[0] });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
