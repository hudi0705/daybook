import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

interface Tag {
  id: number;
  name: string;
  color?: string;
  created_at: string;
}

// GET - 获取所有标签
export async function GET(request: NextRequest) {
  const client = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const search = searchParams.get('search');

  try {
    // 获取单个标签
    if (id) {
      const { data, error } = await client
        .from('tags')
        .select('*')
        .eq('id', parseInt(id))
        .maybeSingle();

      if (error) throw new Error(`获取标签失败: ${error.message}`);
      return NextResponse.json({ success: true, data });
    }

    // 获取标签列表
    let query = client
      .from('tags')
      .select('*')
      .order('name', { ascending: true });

    // 按名称搜索
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw new Error(`获取标签列表失败: ${error.message}`);
    return NextResponse.json({ success: true, data: data as Tag[] });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// POST - 创建标签
export async function POST(request: NextRequest) {
  const client = getSupabaseClient();

  try {
    const body = await request.json();
    const { name, color } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: '标签名称为必填项' },
        { status: 400 }
      );
    }

    const { data, error } = await client
      .from('tags')
      .insert({
        name,
        color: color || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, error: '该标签名称已存在' },
          { status: 400 }
        );
      }
      throw new Error(`创建标签失败: ${error.message}`);
    }

    return NextResponse.json({ success: true, data: data as Tag });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// DELETE - 删除标签
export async function DELETE(request: NextRequest) {
  const client = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { success: false, error: '标签 ID 为必填项' },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await client
      .from('tags')
      .delete()
      .eq('id', parseInt(id))
      .select();

    if (error) throw new Error(`删除标签失败: ${error.message}`);

    return NextResponse.json({ success: true, data });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
