import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

interface DailyReport {
  id: number;
  date: string;
  title: string;
  content: string;
  mood?: string;
  tags?: string[];
  is_published: boolean;
  created_at: string;
  updated_at?: string;
}

// GET - 获取日报列表或单个日报
export async function GET(request: NextRequest) {
  const client = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const date = searchParams.get('date');
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');

  try {
    if (id) {
      // 获取单个日报
      const { data, error } = await client
        .from('daily_reports')
        .select('*')
        .eq('id', parseInt(id))
        .maybeSingle();

      if (error) throw new Error(`获取日报失败: ${error.message}`);
      return NextResponse.json({ success: true, data });
    }

    if (date) {
      // 根据日期获取日报
      const { data, error } = await client
        .from('daily_reports')
        .select('*')
        .eq('date', date)
        .maybeSingle();

      if (error) throw new Error(`获取日报失败: ${error.message}`);
      return NextResponse.json({ success: true, data });
    }

    // 获取日报列表
    let query = client
      .from('daily_reports')
      .select('*')
      .order('date', { ascending: false });

    if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate);
    }

    const { data, error } = await query.limit(100);

    if (error) throw new Error(`获取日报列表失败: ${error.message}`);
    return NextResponse.json({ success: true, data: data as DailyReport[] });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// POST - 创建日报
export async function POST(request: NextRequest) {
  const client = getSupabaseClient();
  
  try {
    const body = await request.json();
    const { date, title, content, mood, tags } = body;

    if (!date || !title || !content) {
      return NextResponse.json(
        { success: false, error: '日期、标题和内容为必填项' },
        { status: 400 }
      );
    }

    const { data, error } = await client
      .from('daily_reports')
      .insert({
        date,
        title,
        content,
        mood: mood || null,
        tags: tags || null,
        is_published: true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, error: '该日期已有日报，请使用更新功能' },
          { status: 400 }
        );
      }
      throw new Error(`创建日报失败: ${error.message}`);
    }

    return NextResponse.json({ success: true, data: data as DailyReport });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// PUT - 更新日报
export async function PUT(request: NextRequest) {
  const client = getSupabaseClient();
  
  try {
    const body = await request.json();
    const { id, date, title, content, mood, tags } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: '日报 ID 为必填项' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (mood) updateData.mood = mood;
    if (tags) updateData.tags = tags;

    const { data, error } = await client
      .from('daily_reports')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`更新日报失败: ${error.message}`);

    return NextResponse.json({ success: true, data: data as DailyReport });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// DELETE - 删除日报
export async function DELETE(request: NextRequest) {
  const client = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { success: false, error: '日报 ID 为必填项' },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await client
      .from('daily_reports')
      .delete()
      .eq('id', parseInt(id))
      .select();

    if (error) throw new Error(`删除日报失败: ${error.message}`);

    return NextResponse.json({ success: true, data });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}