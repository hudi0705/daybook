/**
 * POST /api/settings/project-path
 * GET /api/settings/project-path
 * PUT /api/settings/project-path
 * 
 * 管理用户的 Git 项目地址设置
 */
import { Router, Response } from 'express';
import { execSync } from 'child_process';
import { existsSync, statSync } from 'fs';
import { authMiddleware, AuthRequest } from '../../middleware/auth.js';
import {
  successResponse,
  errorResponse,
} from '../../utils/response.js';
import pool from '../../db.js';

export const settingsRouter = Router();

settingsRouter.use(authMiddleware);

/**
 * GET /api/settings/project-path
 * 获取当前用户的项目地址
 */
settingsRouter.get('/project-path', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;

  try {
    const [rows] = await pool.execute(
      'SELECT project_path FROM users WHERE id = ?',
      [userId]
    );
    const users = rows as any[];
    
    if (users.length === 0) {
      errorResponse(res, 'User not found', 404);
      return;
    }

    successResponse(res, { project_path: users[0].project_path || null });
  } catch (err) {
    console.error('[settings] Error fetching project path:', err);
    errorResponse(res, 'Failed to fetch project path', 500);
  }
});

/**
 * PUT /api/settings/project-path
 * 更新当前用户的项目地址
 */
settingsRouter.put('/project-path', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { project_path } = req.body;

  if (!project_path) {
    errorResponse(res, 'project_path is required');
    return;
  }

  // 验证路径是否存在
  if (!existsSync(project_path)) {
    errorResponse(res, '项目路径不存在');
    return;
  }

  // 验证是否是目录
  try {
    if (!statSync(project_path).isDirectory()) {
      errorResponse(res, '项目路径不是一个有效的目录');
      return;
    }
  } catch {
    errorResponse(res, '无法访问项目路径');
    return;
  }

  // 验证是否是 git 仓库
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      cwd: project_path,
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    errorResponse(res, '该项目路径不是一个有效的 Git 仓库');
    return;
  }

  // 保存到数据库
  try {
    await pool.execute(
      'UPDATE users SET project_path = ? WHERE id = ?',
      [project_path, userId]
    );
    successResponse(res, { project_path }, '项目地址已保存');
  } catch (err) {
    console.error('[settings] Error saving project path:', err);
    errorResponse(res, 'Failed to save project path', 500);
  }
});
