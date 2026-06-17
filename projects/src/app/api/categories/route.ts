import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

interface Category {
  id: number;
  name: string;
  icon?: string;
  sort_order: number;
  created_at: string;
}

// GET - 获取所有分类
export async function GET(request: NextRequest) {
  const client = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  try {
    // 获取单个分类
    if (id) {
      const { data, error } = await client
        .from('categories')
        .select('*')
        .eq('id', parseInt(id))
        .maybeSingle();

      if (error) throw new Error(`获取分类失败: ${error.message}`);
      return NextResponse.json({ success: true, data });
    }

    // 获取所有分类
    const { data, error } = await client
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw new Error(`获取分类列表失败: ${error.message}`);
    return NextResponse.json({ success: true, data: data as Category[] });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// POST - 创建分类
export async function POST(request: NextRequest) {
  const client = getSupabaseClient();

  try {
    const body = await request.json();
    const { name, icon, sort_order } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: '分类名称为必填项' },
        { status: 400 }
      );
    }

    const { data, error } = await client
      .from('categories')
      .insert({
        name,
        icon: icon || null,
        sort_order: sort_order || 0,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, error: '该分类名称已存在' },
          { status: 400 }
        );
      }
      throw new Error(`创建分类失败: ${error.message}`);
    }

    return NextResponse.json({ success: true, data: data as Category });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// PUT - 更新分类
export async function PUT(request: NextRequest) {
  const client = getSupabaseClient();

  try {
    const body = await request.json();
    const { id, name, icon, sort_order } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: '分类 ID 为必填项' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (icon !== undefined) updateData.icon = icon;
    if (sort_order !== undefined) updateData.sort_order = sort_order;

    const { data, error } = await client
      .from('categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, error: '该分类名称已存在' },
          { status: 400 }
        );
      }
      throw new Error(`更新分类失败: ${error.message}`);
    }

    return NextResponse.json({ success: true, data: data as Category });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// DELETE - 删除分类
export async function DELETE(request: NextRequest) {
  const client = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { success: false, error: '分类 ID 为必填项' },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await client
      .from('categories')
      .delete()
      .eq('id', parseInt(id))
      .select();

    if (error) throw new Error(`删除分类失败: ${error.message}`);

    return NextResponse.json({ success: true, data });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
