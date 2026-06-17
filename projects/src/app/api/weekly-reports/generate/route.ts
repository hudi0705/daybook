import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

interface DailyReport {
  id: number;
  date: string;
  title: string;
  content: string;
  mood?: string;
  tags?: string[];
}

// POST - 提取周报重点信息
export async function POST(request: NextRequest) {
  const supabaseClient = getSupabaseClient();
  const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
  const llmClient = new LLMClient(new Config(), customHeaders);

  try {
    const body = await request.json();
    const { week_start_date, action, selected_points } = body;

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

    const reportsText = (dailyReports as DailyReport[])
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

      const response = await llmClient.invoke(messages, {
        model: 'doubao-seed-2-0-lite-260215',
        temperature: 0.5,
      });

      // 解析提取的重点信息
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
          daily_report_count: dailyReports.length,
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

      // 检查是否已有周报
      const { data: existingReport } = await supabaseClient
        .from('weekly_reports')
        .select('*')
        .eq('week_start_date', week_start_date)
        .maybeSingle();

      if (existingReport) {
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
        return NextResponse.json({ success: true, data });
      } else {
        const { data, error: insertError } = await supabaseClient
          .from('weekly_reports')
          .insert(reportData)
          .select()
          .single();

        if (insertError) throw new Error(`创建周报失败: ${insertError.message}`);
        return NextResponse.json({ success: true, data });
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