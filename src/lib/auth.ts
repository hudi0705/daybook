import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'daybook-secret-key-change-in-production';
const COOKIE_NAME = 'auth_token';
const TOKEN_EXPIRY = '7d';
const BCRYPT_ROUNDS = 12;

export interface JwtPayload {
  userId: number;
  username: string;
  loginType: 'email' | 'wechat';
}

// 密码加密
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

// 密码验证
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// 签发 JWT
export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

// 验证 JWT
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (err) {
    console.error('[verifyToken] 验证失败:', err instanceof Error ? err.message : err);
    return null;
  }
}

// 设置 Cookie
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });
}

// 获取 Cookie 中的 token
export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value || null;
}

// 清除 Cookie
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// 获取当前用户 ID
export async function getCurrentUserId(): Promise<number | null> {
  const token = await getAuthToken();
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId || null;
}

// 微信 OAuth 配置
export const WECHAT_CONFIG = {
  appId: process.env.WECHAT_APP_ID || '',
  appSecret: process.env.WECHAT_APP_SECRET || '',
  redirectUri: process.env.WECHAT_REDIRECT_URI || 'http://localhost:5000/api/auth/wechat/callback',
};
