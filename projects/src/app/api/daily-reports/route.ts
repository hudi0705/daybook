import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/storage/database/mysql-client';
import { dailyReports } from '@/storage/database/shared/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { getCurrentUserId } from '@/lib/auth';

// 简单内存缓存（开发模式下有效，生产环境建议用 Redis）
interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 30 * 1000; // 30 秒缓存

function getCached(key: string): unknown | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, timestamp: Date.now() });
}

function invalidateCache(pattern: string): void {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

// GET - 获取日报列表或单个日报
export async function GET(request: NextRequest) {
  let db;
  try {
    db = getDb();
  } catch (err) {
    console.error('[daily-reports GET] 数据库连接失败:', err);
    return NextResponse.json(
      { success: false, error: '数据库连接失败，请检查 MySQL 配置' },
      { status: 500 }
    );
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const date = searchParams.get('date');
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');

  try {
    if (id) {
      const cacheKey = `daily:id:${id}:${userId}`;
      const cached = getCached(cacheKey);
      if (cached) return NextResponse.json({ success: true, data: cached });
      const data = await db.select().from(dailyReports).where(and(eq(dailyReports.id, parseInt(id)), eq(dailyReports.user_id, userId))).limit(1);
      const result = data[0] || null;
      if (result) setCache(cacheKey, result);
      return NextResponse.json({ success: true, data: result });
    }

    if (date) {
      const cacheKey = `daily:date:${date}:${userId}`;
      const cached = getCached(cacheKey);
      if (cached) return NextResponse.json({ success: true, data: cached });
      const data = await db.select().from(dailyReports).where(and(sql`${dailyReports.date} = ${date}`, eq(dailyReports.user_id, userId))).limit(1);
      const result = data[0] || null;
      if (result) setCache(cacheKey, result);
      return NextResponse.json({ success: true, data: result });
    }

    const cacheKey = `daily:list:${startDate || ''}:${endDate || ''}:${userId}`;
    const cached = getCached(cacheKey);
    if (cached) return NextResponse.json({ success: true, data: cached });

    const conditions = [eq(dailyReports.user_id, userId)];
    if (startDate && endDate) {
      conditions.push(sql`${dailyReports.date} >= ${startDate}`, sql`${dailyReports.date} <= ${endDate}`);
    }
    const whereClause = and(...conditions);

    // 列表查询只返回必要字段，不返回完整 content
    const data = await db.select({
      id: dailyReports.id,
      user_id: dailyReports.user_id,
      date: dailyReports.date,
      title: dailyReports.title,
      mood: dailyReports.mood,
      tags: dailyReports.tags,
      is_published: dailyReports.is_published,
      created_at: dailyReports.created_at,
      updated_at: dailyReports.updated_at,
      // 只返回 content 前 200 字符用于预览
      content: sql<string>`LEFT(${dailyReports.content}, 200)`,
    }).from(dailyReports).where(whereClause).orderBy(desc(dailyReports.date)).limit(100);
    setCache(cacheKey, data);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// POST - 创建日报
export async function POST(request: NextRequest) {
  let db;
  try {
    db = getDb();
  } catch (err) {
    console.error('[daily-reports POST] 数据库连接失败:', err);
    return NextResponse.json(
      { success: false, error: '数据库连接失败，请检查 MySQL 配置' },
      { status: 500 }
    );
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { date, mood, tags } = body;
    const title = String(body.title || '').trim();
    const content = String(body.content || '').trim();

    if (!date || !title || !content) {
      return NextResponse.json(
        { success: false, error: '日期、标题和内容为必填项' },
        { status: 400 }
      );
    }

    const result = await db.insert(dailyReports).values({
      user_id: userId,
      date,
      title,
      content,
      mood: mood || null,
      tags: tags || null,
      is_published: true,
    });

    const data = await db.select().from(dailyReports).where(eq(dailyReports.id, result[0].insertId)).limit(1);
    invalidateCache('daily:'); // 写入后清除缓存
    return NextResponse.json({ success: true, data: data[0] });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    const causeMessage = err instanceof Error && err.cause ? String(err.cause) : '';
    console.error('[daily-reports POST] 创建日报失败:', err);

    if (errorMessage.includes('Duplicate entry') || causeMessage.includes('Duplicate entry')) {
      return NextResponse.json(
        { success: false, error: '该日期已有日报，请使用更新功能' },
        { status: 400 }
      );
    }
    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('connect')) {
      return NextResponse.json(
        { success: false, error: '数据库连接失败，请确认 MySQL 服务已启动' },
        { status: 500 }
      );
    }
    if (errorMessage.includes("Table") && errorMessage.includes("doesn't exist")) {
      return NextResponse.json(
        { success: false, error: '数据表不存在，请先执行数据库初始化脚本' },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// PUT - 更新日报
export async function PUT(request: NextRequest) {
  let db;
  try {
    db = getDb();
  } catch (err) {
    console.error('[daily-reports PUT] 数据库连接失败:', err);
    return NextResponse.json(
      { success: false, error: '数据库连接失败，请检查 MySQL 配置' },
      { status: 500 }
    );
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, date, title, content, mood, tags } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: '日报 ID 为必填项' },
        { status: 400 }
      );
    }

    // 验证日报归属
    const existing = await db.select().from(dailyReports).where(and(eq(dailyReports.id, id), eq(dailyReports.user_id, userId))).limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: '日报不存在或无权修改' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (date) updateData.date = date;
    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (mood) updateData.mood = mood;
    if (tags) updateData.tags = tags;

    await db.update(dailyReports).set(updateData).where(and(eq(dailyReports.id, id), eq(dailyReports.user_id, userId)));
    const data = await db.select().from(dailyReports).where(eq(dailyReports.id, id)).limit(1);

    invalidateCache('daily:');
    return NextResponse.json({ success: true, data: data[0] });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    const causeMessage = err instanceof Error && err.cause ? String(err.cause) : '';
    console.error('[daily-reports PUT] 更新日报失败:', err);

    if (errorMessage.includes('Duplicate entry') || causeMessage.includes('Duplicate entry')) {
      return NextResponse.json(
        { success: false, error: '该日期已有日报，请选择其他日期' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// DELETE - 删除日报
export async function DELETE(request: NextRequest) {
  let db;
  try {
    db = getDb();
  } catch (err) {
    console.error('[daily-reports DELETE] 数据库连接失败:', err);
    return NextResponse.json(
      { success: false, error: '数据库连接失败，请检查 MySQL 配置' },
      { status: 500 }
    );
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { success: false, error: '日报 ID 为必填项' },
      { status: 400 }
    );
  }

  try {
    const data = await db.select().from(dailyReports).where(and(eq(dailyReports.id, parseInt(id)), eq(dailyReports.user_id, userId))).limit(1);
    if (data.length === 0) {
      return NextResponse.json({ success: false, error: '日报不存在或无权删除' }, { status: 404 });
    }
    await db.delete(dailyReports).where(and(eq(dailyReports.id, parseInt(id)), eq(dailyReports.user_id, userId)));

    invalidateCache('daily:');
    return NextResponse.json({ success: true, data: data[0] });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
