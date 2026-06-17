import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

interface WeeklyReport {
  id: number;
  week_start_date: string;
  week_end_date: string;
  summary: string;
  is_published: boolean;
  created_at: string;
  updated_at?: string;
}

interface DailyReport {
  id: number;
  date: string;
  title: string;
  content: string;
  mood?: string;
  tags?: string[];
}

// GET - 获取周报列表或单个周报
export async function GET(request: NextRequest) {
  const client = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const startDate = searchParams.get('start_date');

  try {
    if (id) {
      const { data, error } = await client
        .from('weekly_reports')
        .select('*')
        .eq('id', parseInt(id))
        .maybeSingle();

      if (error) throw new Error(`获取周报失败: ${error.message}`);
      return NextResponse.json({ success: true, data });
    }

    let query = client
      .from('weekly_reports')
      .select('*')
      .order('week_start_date', { ascending: false });

    if (startDate) {
      query = query.eq('week_start_date', startDate);
    }

    const { data, error } = await query.limit(50);

    if (error) throw new Error(`获取周报列表失败: ${error.message}`);
    return NextResponse.json({ success: true, data: data as WeeklyReport[] });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// POST - 生成周报
export async function POST(request: NextRequest) {
  const supabaseClient = getSupabaseClient();
  const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
  const llmClient = new LLMClient(new Config(), customHeaders);

  try {
    const body = await request.json();
    const { week_start_date, force_regenerate } = body;

    if (!week_start_date) {
      return NextResponse.json(
        { success: false, error: '周开始日期为必填项' },
        { status: 400 }
      );
    }

    // 计算周结束日期（周日）
    const startDate = new Date(week_start_date);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    const week_end_date = endDate.toISOString().split('T')[0];

    // 检查是否已存在周报
    const { data: existingReport } = await supabaseClient
      .from('weekly_reports')
      .select('*')
      .eq('week_start_date', week_start_date)
      .maybeSingle();

    if (existingReport && !force_regenerate) {
      return NextResponse.json({ success: true, data: existingReport as WeeklyReport });
    }

    // 获取本周的日报
    const { data: dailyReports, error } = await supabaseClient
      .from('daily_reports')
      .select('id, date, title, content, mood, tags')
      .gte('date', week_start_date)
      .lte('date', week_end_date)
      .order('date', { ascending: true });

    if (error) throw new Error(`获取日报失败: ${error.message}`);

    if (!dailyReports || dailyReports.length === 0) {
      return NextResponse.json(
        { success: false, error: '该周没有日报数据，无法生成周报' },
        { status: 400 }
      );
    }

    // 使用 LLM 生成周报
    const reportsText = (dailyReports as DailyReport[])
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

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: '你是一个专业的周报生成助手，擅长提炼和总结日常记录。' },
      { role: 'user', content: prompt },
    ];

    const response = await llmClient.invoke(messages, {
      model: 'doubao-seed-2-0-lite-260215',
      temperature: 0.7,
    });

    const summary = response.content;

    // 存储周报
    const reportData = {
      week_start_date,
      week_end_date,
      summary,
      is_published: true,
    };

    if (existingReport) {
      // 更新已有周报
      const { data, error: updateError } = await supabaseClient
        .from('weekly_reports')
        .update({
          ...reportData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingReport.id)
        .select()
        .single();

      if (updateError) throw new Error(`更新周报失败: ${updateError.message}`);
      return NextResponse.json({ success: true, data: data as WeeklyReport });
    } else {
      // 创建新周报
      const { data, error: insertError } = await supabaseClient
        .from('weekly_reports')
        .insert(reportData)
        .select()
        .single();

      if (insertError) throw new Error(`创建周报失败: ${insertError.message}`);
      return NextResponse.json({ success: true, data: data as WeeklyReport });
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// DELETE - 删除周报
export async function DELETE(request: NextRequest) {
  const client = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { success: false, error: '周报 ID 为必填项' },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await client
      .from('weekly_reports')
      .delete()
      .eq('id', parseInt(id))
      .select();

    if (error) throw new Error(`删除周报失败: ${error.message}`);

    return NextResponse.json({ success: true, data });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}