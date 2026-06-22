import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/storage/database/mysql-client';
import { categories } from '@/storage/database/shared/schema';
import { eq } from 'drizzle-orm';

// GET - 获取所有分类
export async function GET(request: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  try {
    if (id) {
      const data = await db.select().from(categories).where(eq(categories.id, parseInt(id))).limit(1);
      return NextResponse.json({ success: true, data: data[0] || null });
    }

    const data = await db.select().from(categories).orderBy(categories.sort_order, categories.name);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// POST - 创建分类
export async function POST(request: NextRequest) {
  const db = getDb();

  try {
    const body = await request.json();
    const { name, icon, sort_order } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: '分类名称为必填项' },
        { status: 400 }
      );
    }

    const result = await db.insert(categories).values({
      name,
      icon: icon || null,
      sort_order: sort_order || 0,
    });

    const data = await db.select().from(categories).where(eq(categories.id, result[0].insertId)).limit(1);
    return NextResponse.json({ success: true, data: data[0] });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    if (errorMessage.includes('Duplicate entry')) {
      return NextResponse.json(
        { success: false, error: '该分类名称已存在' },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// PUT - 更新分类
export async function PUT(request: NextRequest) {
  const db = getDb();

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

    await db.update(categories).set(updateData).where(eq(categories.id, id));
    const data = await db.select().from(categories).where(eq(categories.id, id)).limit(1);

    return NextResponse.json({ success: true, data: data[0] });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    if (errorMessage.includes('Duplicate entry')) {
      return NextResponse.json(
        { success: false, error: '该分类名称已存在' },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// DELETE - 删除分类
export async function DELETE(request: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { success: false, error: '分类 ID 为必填项' },
      { status: 400 }
    );
  }

  try {
    const data = await db.select().from(categories).where(eq(categories.id, parseInt(id))).limit(1);
    await db.delete(categories).where(eq(categories.id, parseInt(id)));

    return NextResponse.json({ success: true, data: data[0] });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
