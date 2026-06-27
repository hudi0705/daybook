import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function successResponse<T>(res: Response, data: T, message?: string, statusCode = 200): void {
  const body: ApiResponse<T> = { success: true, data };
  if (message) body.message = message;
  res.status(statusCode).json(body);
}

export function createdResponse<T>(res: Response, data: T, message = 'Created successfully'): void {
  successResponse(res, data, message, 201);
}

export function errorResponse(res: Response, message: string, statusCode = 400): void {
  const body: ApiResponse = { success: false, error: message };
  res.status(statusCode).json(body);
}

export function notFoundResponse(res: Response, resource = 'Resource'): void {
  errorResponse(res, `${resource} not found`, 404);
}

export function unauthorizedResponse(res: Response, message = 'Unauthorized'): void {
  errorResponse(res, message, 401);
}

export function forbiddenResponse(res: Response, message = 'Forbidden'): void {
  errorResponse(res, message, 403);
}

export function paginatedResponse<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number,
): void {
  res.status(200).json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
