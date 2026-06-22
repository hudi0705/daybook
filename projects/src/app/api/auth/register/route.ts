import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/storage/database/mysql-client';
import { users } from '@/storage/database/shared/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, signToken, setAuthCookie } from '@/lib/auth';
import redis from '@/lib/redis';

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
    const { username, email, password } = body;

    if (!username || !email || !password) {
      return NextResponse.json(
        { success: false, error: '用户名、邮箱和密码为必填项' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: '密码至少6位' },
        { status: 400 }
      );
    }

    // 检查邮箱是否已存在
    const existingEmail = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingEmail.length > 0) {
      return NextResponse.json(
        { success: false, error: '该邮箱已被注册' },
        { status: 400 }
      );
    }

    // 检查用户名是否已存在
    const existingUsername = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (existingUsername.length > 0) {
      return NextResponse.json(
        { success: false, error: '该用户名已被使用' },
        { status: 400 }
      );
    }

    // 检查邮箱验证码是否已验证通过
    const verifiedKey = `verify_code:verified:${email}`;
    const codeVerified = await redis.get(verifiedKey);
    console.log(`[register] 检查验证标记: ${verifiedKey} = ${codeVerified}`);

    if (!codeVerified) {
      return NextResponse.json(
        { success: false, error: '请先完成邮箱验证' },
        { status: 400 }
      );
    }

    // 加密密码
    const passwordHash = await hashPassword(password);

    // 创建用户
    const result = await db.insert(users).values({
      username,
      email,
      password_hash: passwordHash,
      display_name: username,
      login_type: 'email',
    });

    const newUser = await db.select().from(users).where(eq(users.id, result[0].insertId)).limit(1);

    // 注册成功，删除验证标记
    await redis.del(`verify_code:verified:${email}`);

    // 签发 JWT
    const token = signToken({
      userId: newUser[0].id,
      username: newUser[0].username || '',
      loginType: 'email',
    });

    // 创建响应并设置 Cookie
    const response = NextResponse.json({
      success: true,
      data: {
        id: newUser[0].id,
        username: newUser[0].username,
        email: newUser[0].email,
        display_name: newUser[0].display_name,
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
    console.error('[auth register] 注册失败:', err);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
