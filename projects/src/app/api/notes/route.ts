import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

interface Note {
  id: number;
  title: string;
  content: string;
  category_id?: number;
  tags?: string[];
  is_pinned: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at?: string;
}

// GET - 获取笔记列表（支持分页、筛选、搜索）
export async function GET(request: NextRequest) {
  const client = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const categoryId = searchParams.get('category_id');
  const tag = searchParams.get('tag');
  const search = searchParams.get('search');
  const isArchived = searchParams.get('is_archived');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('page_size') || '20');

  try {
    // 获取单个笔记
    if (id) {
      const { data, error } = await client
        .from('notes')
        .select('*')
        .eq('id', parseInt(id))
        .maybeSingle();

      if (error) throw new Error(`获取笔记失败: ${error.message}`);
      return NextResponse.json({ success: true, data });
    }

    // 构建列表查询
    let query = client
      .from('notes')
      .select('*', { count: 'exact' })
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    // 按分类筛选
    if (categoryId) {
      query = query.eq('category_id', parseInt(categoryId));
    }

    // 按标签筛选（JSONB 数组包含查询）
    if (tag) {
      query = query.contains('tags', [tag]);
    }

    // 按关键词搜索（标题和内容）
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    // 是否已归档
    if (isArchived !== null && isArchived !== undefined) {
      query = query.eq('is_archived', isArchived === 'true');
    } else {
      // 默认不返回归档笔记
      query = query.eq('is_archived', false);
    }

    // 分页
    const offset = (page - 1) * pageSize;
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) throw new Error(`获取笔记列表失败: ${error.message}`);
    return NextResponse.json({
      success: true,
      data: data as Note[],
      pagination: {
        page,
        page_size: pageSize,
        total: count || 0,
      },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// POST - 创建新笔记
export async function POST(request: NextRequest) {
  const client = getSupabaseClient();

  try {
    const body = await request.json();
    const { title, content, category_id, tags } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: '标题和内容为必填项' },
        { status: 400 }
      );
    }

    const { data, error } = await client
      .from('notes')
      .insert({
        title,
        content,
        category_id: category_id || null,
        tags: tags || null,
        is_pinned: false,
        is_archived: false,
      })
      .select()
      .single();

    if (error) throw new Error(`创建笔记失败: ${error.message}`);

    return NextResponse.json({ success: true, data: data as Note });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// PUT - 更新笔记
export async function PUT(request: NextRequest) {
  const client = getSupabaseClient();

  try {
    const body = await request.json();
    const { id, title, content, category_id, tags, is_pinned, is_archived } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: '笔记 ID 为必填项' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (category_id !== undefined) updateData.category_id = category_id;
    if (tags !== undefined) updateData.tags = tags;
    if (is_pinned !== undefined) updateData.is_pinned = is_pinned;
    if (is_archived !== undefined) updateData.is_archived = is_archived;

    const { data, error } = await client
      .from('notes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`更新笔记失败: ${error.message}`);

    return NextResponse.json({ success: true, data: data as Note });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// DELETE - 删除笔记
export async function DELETE(request: NextRequest) {
  const client = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { success: false, error: '笔记 ID 为必填项' },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await client
      .from('notes')
      .delete()
      .eq('id', parseInt(id))
      .select();

    if (error) throw new Error(`删除笔记失败: ${error.message}`);

    return NextResponse.json({ success: true, data });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
