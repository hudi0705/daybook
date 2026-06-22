import { NextResponse } from 'next/server';
import { WECHAT_CONFIG } from '@/lib/auth';

export async function GET() {
  try {
    if (!WECHAT_CONFIG.appId) {
      return NextResponse.json(
        { success: false, error: '微信登录未配置' },
        { status: 500 }
      );
    }

    // 生成微信登录二维码 URL
    const redirectUri = encodeURIComponent(WECHAT_CONFIG.redirectUri);
    const state = Math.random().toString(36).slice(2);
    const qrcodeUrl = `https://open.weixin.qq.com/connect/qrconnect?appid=${WECHAT_CONFIG.appId}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`;

    return NextResponse.json({
      success: true,
      data: { qrcodeUrl, state },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    console.error('[wechat qrcode] 获取二维码失败:', err);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
