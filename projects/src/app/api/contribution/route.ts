import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    const viewMode = searchParams.get('viewMode') || 'year';

    // 计算日期范围
    let startDate: Date;
    let endDate: Date;
    const now = new Date();

    if (viewMode === 'month') {
      startDate = new Date(parseInt(year), now.getMonth(), 1);
      endDate = new Date(parseInt(year), now.getMonth() + 1, 0);
    } else if (viewMode === 'quarter') {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      startDate = new Date(parseInt(year), quarterMonth, 1);
      endDate = new Date(parseInt(year), quarterMonth + 3, 0);
    } else {
      // Year view - 从一年前到现在
      startDate = new Date(parseInt(year) - 1, now.getMonth(), now.getDate());
      endDate = new Date(parseInt(year), now.getMonth(), now.getDate());
    }

    // 查询日报数据
    const { data: reports, error } = await supabase
      .from('daily_reports')
      .select('date, title, content')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching daily reports:', error);
      return NextResponse.json(
        { success: false, error: '获取日报数据失败' },
        { status: 500 }
      );
    }

    // 构建热力图数据
    const contributionData = (reports || []).map((report: { date: string; title: string; content: string }) => ({
      date: report.date,
      count: 1,
      summary: report.title,
    }));

    return NextResponse.json({
      success: true,
      data: contributionData,
      stats: {
        total: reports.length,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      },
    });
  } catch (error) {
    console.error('Error in contribution API:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}