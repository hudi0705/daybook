import { NextResponse } from 'next/server';
import { getDb } from '@/storage/database/mysql-client';
import { users } from '@/storage/database/shared/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUserId } from '@/lib/auth';

export async function GET() {
  let db;
  try {
    db = getDb();
  } catch (err) {
    return NextResponse.json(
      { success: false, error: '数据库连接失败' },
      { status: 500 }
    );
  }

  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      );
    }

    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user.length === 0) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user[0].id,
        username: user[0].username,
        email: user[0].email,
        display_name: user[0].display_name,
        avatar_url: user[0].avatar_url,
        login_type: user[0].login_type,
      },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    console.error('[auth me] 获取用户信息失败:', err);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
