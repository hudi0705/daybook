import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/storage/database/mysql-client';
import { tags } from '@/storage/database/shared/schema';
import { eq, like, and } from 'drizzle-orm';

// GET - 获取所有标签
export async function GET(request: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const search = searchParams.get('search');

  try {
    if (id) {
      const data = await db.select().from(tags).where(eq(tags.id, parseInt(id))).limit(1);
      return NextResponse.json({ success: true, data: data[0] || null });
    }

    const conditions = [];
    if (search) {
      conditions.push(like(tags.name, `%${search}%`));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await db.select().from(tags).where(whereClause).orderBy(tags.name);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// POST - 创建标签
export async function POST(request: NextRequest) {
  const db = getDb();

  try {
    const body = await request.json();
    const { name, color } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: '标签名称为必填项' },
        { status: 400 }
      );
    }

    const result = await db.insert(tags).values({
      name,
      color: color || null,
    });

    const data = await db.select().from(tags).where(eq(tags.id, result[0].insertId)).limit(1);
    return NextResponse.json({ success: true, data: data[0] });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    if (errorMessage.includes('Duplicate entry')) {
      return NextResponse.json(
        { success: false, error: '该标签名称已存在' },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// DELETE - 删除标签
export async function DELETE(request: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { success: false, error: '标签 ID 为必填项' },
      { status: 400 }
    );
  }

  try {
    const data = await db.select().from(tags).where(eq(tags.id, parseInt(id))).limit(1);
    await db.delete(tags).where(eq(tags.id, parseInt(id)));

    return NextResponse.json({ success: true, data: data[0] });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
