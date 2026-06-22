import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/storage/database/mysql-client';
import { notes } from '@/storage/database/shared/schema';
import { eq, and, like, or, desc, sql } from 'drizzle-orm';
import { getCurrentUserId } from '@/lib/auth';

// GET - 获取笔记列表（支持分页、筛选、搜索）
export async function GET(request: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const categoryId = searchParams.get('category_id');
  const search = searchParams.get('search');
  const isArchived = searchParams.get('is_archived');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('page_size') || '20');

  try {
    if (id) {
      const data = await db.select().from(notes).where(eq(notes.id, parseInt(id))).limit(1);
      return NextResponse.json({ success: true, data: data[0] || null });
    }

    const conditions = [];

    if (categoryId) {
      conditions.push(eq(notes.category_id, parseInt(categoryId)));
    }

    if (search) {
      conditions.push(or(like(notes.title, `%${search}%`), like(notes.content, `%${search}%`)));
    }

    if (isArchived !== null && isArchived !== undefined) {
      conditions.push(eq(notes.is_archived, isArchived === 'true'));
    } else {
      conditions.push(eq(notes.is_archived, false));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notes)
      .where(whereClause);

    const offset = (page - 1) * pageSize;
    const data = await db
      .select()
      .from(notes)
      .where(whereClause)
      .orderBy(desc(notes.is_pinned), desc(notes.updated_at))
      .limit(pageSize)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        page_size: pageSize,
        total: countResult.count || 0,
      },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// POST - 创建新笔记
export async function POST(request: NextRequest) {
  const db = getDb();
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, content, category_id } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: '标题和内容为必填项' },
        { status: 400 }
      );
    }

    const result = await db.insert(notes).values({
      user_id: userId,
      title,
      content,
      category_id: category_id || null,
      is_pinned: false,
      is_archived: false,
    });

    const data = await db.select().from(notes).where(eq(notes.id, result[0].insertId)).limit(1);
    return NextResponse.json({ success: true, data: data[0] });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// PUT - 更新笔记
export async function PUT(request: NextRequest) {
  const db = getDb();

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
      updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (category_id !== undefined) updateData.category_id = category_id;
    if (tags !== undefined) updateData.tags = tags;
    if (is_pinned !== undefined) updateData.is_pinned = is_pinned;
    if (is_archived !== undefined) updateData.is_archived = is_archived;

    await db.update(notes).set(updateData).where(eq(notes.id, id));
    const data = await db.select().from(notes).where(eq(notes.id, id)).limit(1);

    return NextResponse.json({ success: true, data: data[0] });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// DELETE - 删除笔记
export async function DELETE(request: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { success: false, error: '笔记 ID 为必填项' },
      { status: 400 }
    );
  }

  try {
    const data = await db.select().from(notes).where(eq(notes.id, parseInt(id))).limit(1);
    await db.delete(notes).where(eq(notes.id, parseInt(id)));

    return NextResponse.json({ success: true, data: data[0] });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
