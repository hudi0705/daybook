import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';
import { generateVerificationCode, sendVerificationEmail } from '@/lib/email';
import { getDb } from '@/storage/database/mysql-client';
import { users } from '@/storage/database/shared/schema';
import { eq } from 'drizzle-orm';

const CODE_PREFIX = 'verify_code:';
const CODE_EXPIRY = 600; // 10 分钟

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: '请输入邮箱' },
        { status: 400 }
      );
    }

    // 检查邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: '邮箱格式不正确' },
        { status: 400 }
      );
    }

    // 检查邮箱是否已注册
    const db = getDb();
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length > 0) {
      return NextResponse.json(
        { success: false, error: '该邮箱已被注册' },
        { status: 400 }
      );
    }

    // 检查是否频繁发送（防止滥用）
    const lastSendTime = await redis.get(`${CODE_PREFIX}last:${email}`);
    if (lastSendTime) {
      return NextResponse.json(
        { success: false, error: '验证码发送过于频繁，请稍后再试' },
        { status: 429 }
      );
    }

    // 生成并存储验证码
    const code = generateVerificationCode();
    const codeKey = `${CODE_PREFIX}${email}`;
    await redis.setex(codeKey, CODE_EXPIRY, code);
    await redis.setex(`${CODE_PREFIX}last:${email}`, 60, Date.now().toString());

    // 验证码是否写入成功
    const checkCode = await redis.get(codeKey);
    console.log(`[send-code] 存储验证码: ${codeKey} = ${checkCode}`);

    // 发送邮件
    const sent = await sendVerificationEmail(email, code);
    if (!sent) {
      return NextResponse.json(
        { success: false, error: '验证码发送失败，请稍后重试' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '验证码已发送，请查收邮件',
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    console.error('[send-code] 错误:', err);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
