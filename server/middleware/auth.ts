import { Request, Response, NextFunction } from 'express';
import * as jose from 'jose';
import { unauthorizedResponse } from '../utils/response.js';

export interface AuthUser {
  id: number;
  email: string;
  username: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret');

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    unauthorizedResponse(res, 'Missing or invalid authorization header');
    return;
  }

  const token = authHeader.slice(7);

  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);

    req.user = {
      id: payload.sub ? parseInt(payload.sub, 10) : 0,
      email: (payload.email as string) || '',
      username: (payload.username as string) || '',
    };

    next();
  } catch {
    unauthorizedResponse(res, 'Invalid or expired token');
  }
}

export async function generateToken(user: AuthUser): Promise<string> {
  return new jose.SignJWT({ email: user.email, username: user.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}
