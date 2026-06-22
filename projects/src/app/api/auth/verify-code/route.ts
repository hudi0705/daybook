import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

const CODE_PREFIX = 'verify_code:';

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { success: false, error: '请输入邮箱和验证码' },
        { status: 400 }
      );
    }

    // 从 Redis 获取验证码
    const storedCode = await redis.get(`${CODE_PREFIX}${email}`);

    if (!storedCode) {
      return NextResponse.json(
        { success: false, error: '验证码已过期，请重新获取' },
        { status: 400 }
      );
    }

    if (storedCode !== code) {
      return NextResponse.json(
        { success: false, error: '验证码错误' },
        { status: 400 }
      );
    }

    // 验证成功，删除验证码
    await redis.del(`${CODE_PREFIX}${email}`);

    // 设置验证通过标记（有效期 10 分钟，用于注册流程）
    const verifiedKey = `${CODE_PREFIX}verified:${email}`;
    await redis.setex(verifiedKey, 600, 'true');

    // 验证标记是否写入成功
    const checkVerified = await redis.get(verifiedKey);
    console.log(`[verify-code] 设置验证标记: ${verifiedKey} = ${checkVerified}`);

    return NextResponse.json({
      success: true,
      message: '验证码验证成功',
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    console.error('[verify-code] 错误:', err);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
