import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/storage/database/mysql-client';
import { dailyReports } from '@/storage/database/shared/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

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

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const date = searchParams.get('date');
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');

  try {
    if (id) {
      const cacheKey = `daily:id:${id}`;
      const cached = getCached(cacheKey);
      if (cached) {
        return NextResponse.json({ success: true, data: cached });
      }
      const data = await db.select().from(dailyReports).where(eq(dailyReports.id, parseInt(id))).limit(1);
      const result = data[0] || null;
      if (result) setCache(cacheKey, result);
      return NextResponse.json({ success: true, data: result });
    }

    if (date) {
      const cacheKey = `daily:date:${date}`;
      const cached = getCached(cacheKey);
      if (cached) {
        return NextResponse.json({ success: true, data: cached });
      }
      const data = await db.select().from(dailyReports).where(sql`${dailyReports.date} = ${date}`).limit(1);
      const result = data[0] || null;
      if (result) setCache(cacheKey, result);
      return NextResponse.json({ success: true, data: result });
    }

    // 列表查询缓存
    const cacheKey = `daily:list:${startDate || ''}:${endDate || ''}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }

    const conditions = [];
    if (startDate && endDate) {
      conditions.push(sql`${dailyReports.date} >= ${startDate}`, sql`${dailyReports.date} <= ${endDate}`);
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await db.select().from(dailyReports).where(whereClause).orderBy(desc(dailyReports.date)).limit(100);
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

  try {
    const body = await request.json();
    const { date, title, content, mood, tags } = body;

    if (!date || !title || !content) {
      return NextResponse.json(
        { success: false, error: '日期、标题和内容为必填项' },
        { status: 400 }
      );
    }

    const result = await db.insert(dailyReports).values({
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
    console.error('[daily-reports POST] 创建日报失败:', errorMessage);

    if (errorMessage.includes('Duplicate entry')) {
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

  try {
    const body = await request.json();
    const { id, title, content, mood, tags } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: '日报 ID 为必填项' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };

    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (mood) updateData.mood = mood;
    if (tags) updateData.tags = tags;

    await db.update(dailyReports).set(updateData).where(eq(dailyReports.id, id));
    const data = await db.select().from(dailyReports).where(eq(dailyReports.id, id)).limit(1);

    invalidateCache('daily:'); // 更新后清除缓存
    return NextResponse.json({ success: true, data: data[0] });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
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

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { success: false, error: '日报 ID 为必填项' },
      { status: 400 }
    );
  }

  try {
    const data = await db.select().from(dailyReports).where(eq(dailyReports.id, parseInt(id))).limit(1);
    await db.delete(dailyReports).where(eq(dailyReports.id, parseInt(id)));

    invalidateCache('daily:'); // 删除后清除缓存
    return NextResponse.json({ success: true, data: data[0] });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
