import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/storage/database/mysql-client';
import { users } from '@/storage/database/shared/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword, signToken, setAuthCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
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
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: '邮箱和密码为必填项' },
        { status: 400 }
      );
    }

    // 查找用户
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (user.length === 0) {
      return NextResponse.json(
        { success: false, error: '邮箱或密码错误' },
        { status: 401 }
      );
    }

    // 验证密码
    if (!user[0].password_hash) {
      return NextResponse.json(
        { success: false, error: '该账号未设置密码，请使用微信登录' },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user[0].password_hash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: '邮箱或密码错误' },
        { status: 401 }
      );
    }

    // 签发 JWT
    const token = signToken({
      userId: user[0].id,
      username: user[0].username || '',
      loginType: 'email',
    });

    // 创建响应并设置 Cookie
    const response = NextResponse.json({
      success: true,
      data: {
        id: user[0].id,
        username: user[0].username,
        email: user[0].email,
        display_name: user[0].display_name,
        avatar_url: user[0].avatar_url,
      },
    });

    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: false, // 开发环境使用 false
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    console.error('[auth login] 登录失败:', err);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
