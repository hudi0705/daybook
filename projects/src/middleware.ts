import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'daybook-secret-key-change-in-production'
);

const protectedRoutes = ['/'];
const publicRoutes = ['/login', '/register'];
const publicApiRoutes = ['/api/auth/login', '/api/auth/register', '/api/auth/wechat', '/api/auth/send-code', '/api/auth/verify-code'];

async function verifyTokenEdge(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth_token')?.value;
  const isAuthenticated = token ? await verifyTokenEdge(token) : false;

  // API 路由处理
  if (pathname.startsWith('/api/')) {
    if (publicApiRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.next();
    }
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // 已登录用户访问登录/注册页 -> 重定向到首页
  if (isAuthenticated && publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 未登录用户访问受保护页面 -> 重定向到登录页
  if (!isAuthenticated && protectedRoutes.some(route => pathname === route)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/register', '/daily/:path*', '/weekly/:path*', '/notes/:path*', '/api/:path*'],
};
