import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/storage/database/mysql-client';
import { users } from '@/storage/database/shared/schema';
import { eq } from 'drizzle-orm';
import { signToken, setAuthCookie, WECHAT_CONFIG } from '@/lib/auth';

export async function GET(request: NextRequest) {
  let db;
  try {
    db = getDb();
  } catch (err) {
    return NextResponse.redirect(new URL('/login?error=db_error', request.url));
  }

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.redirect(new URL('/login?error=wechat_no_code', request.url));
    }

    // 用 code 换取 access_token
    const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${WECHAT_CONFIG.appId}&secret=${WECHAT_CONFIG.appSecret}&code=${code}&grant_type=authorization_code`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.errcode) {
      console.error('[wechat callback] 获取 token 失败:', tokenData);
      return NextResponse.redirect(new URL('/login?error=wechat_token_error', request.url));
    }

    const { access_token, openid, unionid } = tokenData;

    // 获取用户信息
    const userInfoUrl = `https://api.weixin.qq.com/sns/userinfo?access_token=${access_token}&openid=${openid}&lang=zh_CN`;
    const userInfoRes = await fetch(userInfoUrl);
    const userInfo = await userInfoRes.json();

    if (userInfo.errcode) {
      console.error('[wechat callback] 获取用户信息失败:', userInfo);
      return NextResponse.redirect(new URL('/login?error=wechat_userinfo_error', request.url));
    }

    // 查找或创建用户
    let user = await db.select().from(users).where(eq(users.wechat_openid, openid)).limit(1);

    if (user.length === 0) {
      const result = await db.insert(users).values({
        wechat_openid: openid,
        wechat_unionid: unionid || null,
        display_name: userInfo.nickname || '微信用户',
        avatar_url: userInfo.headimgurl || null,
        login_type: 'wechat',
      });
      user = await db.select().from(users).where(eq(users.id, result[0].insertId)).limit(1);
    }

    // 签发 JWT
    const token = signToken({
      userId: user[0].id,
      username: user[0].username || '',
      loginType: 'wechat',
    });

    // 设置 Cookie
    await setAuthCookie(token);

    return NextResponse.redirect(new URL('/', request.url));
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    console.error('[wechat callback] 微信登录失败:', err);
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorMessage)}`, request.url));
  }
}
