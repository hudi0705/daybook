/**
 * GET /api/git/commits?date=2025-01-15&search=keyword
 * 获取 Git 提交记录（可选按日期筛选，不传则返回全部）
 */
import { Router, Response } from 'express';
import { execSync } from 'child_process';
import { authMiddleware, AuthRequest } from '../../middleware/auth.js';
import {
  successResponse,
  errorResponse,
} from '../../utils/response.js';
import pool from '../../db.js';

export const gitRouter = Router();

gitRouter.use(authMiddleware);

// ── 内存缓存 ──
const commitsCache = new Map<string, {
  data: any[];
  timestamp: number;
}>();

// ── 文件列表缓存（单个 commit） ──
const filesCache = new Map<string, { files: string[]; timestamp: number }>();
const FILES_CACHE_TTL = 10 * 60 * 1000; // 10 分钟

const CACHE_TTL = 5 * 60 * 1000; // 5 分钟

/**
 * 获取单个 commit 变更的文件列表
 */
function getCommitFiles(projectPath: string, hash: string): string[] {
  try {
    const output = execSync(
      `git diff-tree --no-commit-id --name-only -r ${hash}`,
      {
        cwd: projectPath,
        timeout: 5000,
        encoding: 'utf-8',
        maxBuffer: 1024 * 1024,
      }
    ).trim();
    return output ? output.split('\n').filter(Boolean) : [];
  } catch {
    return [];
  }
}

/**
 * GET /api/git/commits?date=YYYY-MM-DD&search=keyword
 * 获取 Git 提交记录
 * - date 可选：不传则返回全部提交记录
 * - search 可选：按关键词搜索提交信息
 */
gitRouter.get('/commits', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const date = req.query.date as string | undefined;
  const search = (req.query.search as string) || '';
  const author = (req.query.author as string) || '';
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 20;
  const offset = (page - 1) * limit;

  // 如果传了 date，验证格式
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errorResponse(res, '日期格式无效，请使用 YYYY-MM-DD');
    return;
  }

  // 从数据库读取用户的 project_path
  let projectPath: string;
  try {
    const [rows] = await pool.execute(
      'SELECT project_path FROM users WHERE id = ?',
      [userId]
    );
    const users = rows as any[];
    if (users.length === 0 || !users[0].project_path) {
      errorResponse(res, '请先在设置中配置项目地址');
      return;
    }
    projectPath = users[0].project_path;
  } catch (err) {
    console.error('[git] Error fetching project path:', err);
    errorResponse(res, '获取项目地址失败', 500);
    return;
  }

  // 从缓存或 git 获取提交记录（按 projectPath + date 缓存）
  const cacheKey = `${projectPath}:${date || 'all'}`;
  let commits: { hash: string; date: string; message: string; author: string; filesChanged: number; files: string[] }[];

  const cached = commitsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    commits = cached.data;
  } else {
    // 构建 git log 命令 — 使用 --name-only 一次获取 commit + 文件列表
    // 格式：COMMIT_SEP\nhash|date|message|author\nfile1\nfile2\n...
    let cmd: string;
    if (date) {
      const endDateObj = new Date(date);
      endDateObj.setDate(endDateObj.getDate() + 1);
      const untilDate = endDateObj.toISOString().split('T')[0];
      cmd = `git log --since="${date}" --until="${untilDate}" --pretty=format:"COMMIT_SEP%n%H|%ai|%s|%an" --name-only --no-merges`;
    } else {
      cmd = `git log -n 500 --pretty=format:"COMMIT_SEP%n%H|%ai|%s|%an" --name-only --no-merges`;
    }

    // 执行 git log 获取提交记录（单次命令获取所有信息）
    let gitLog: string;
    try {
      gitLog = execSync(cmd, {
        cwd: projectPath,
        timeout: 30000,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
      }).trim();
    } catch (err: any) {
      console.error('[git] Error running git log:', err);
      if (err.status === 128) {
        errorResponse(res, '项目路径不是一个有效的 Git 仓库');
      } else {
        successResponse(res, { data: [], meta: { total: 0, lastSync: new Date().toISOString() } });
      }
      return;
    }

    if (!gitLog) {
      commitsCache.set(cacheKey, { data: [], timestamp: Date.now() });
      successResponse(res, { data: [], meta: { total: 0, lastSync: new Date().toISOString() } });
      return;
    }

    // 解析 git log 输出 —— 按 COMMIT_SEP 分割
    const sections = gitLog.split('COMMIT_SEP').filter(s => s.trim());
    commits = [];
    for (const section of sections) {
      const lines = section.trim().split('\n');
      if (lines.length === 0) continue;

      // 第一行：hash|date|message|author
      const headerLine = lines[0];
      const [hash, dateStr, ...rest] = headerLine.split('|');
      const author = rest.pop() || '';
      const message = rest.join('|') || '';

      // 后续行：文件列表（可能为空）
      const files = lines.slice(1).filter(f => f.trim());

      commits.push({
        hash: hash?.trim() || '',
        date: dateStr?.trim() || '',
        message: message.trim(),
        author: author.trim(),
        filesChanged: files.length,
        files,
      });
    }

    // 更新缓存（包含文件信息）
    commitsCache.set(cacheKey, { data: commits, timestamp: Date.now() });
  }

  // 提取去重后的提交用户列表（基于过滤前的全部提交，供前端下拉筛选使用）
  const authors = Array.from(new Set(commits.map(c => c.author).filter(Boolean))).sort();

  // 搜索过滤
  if (search) {
    const searchLower = search.toLowerCase();
    commits = commits.filter(c => c.message.toLowerCase().includes(searchLower));
  }

  // 按提交用户过滤
  if (author) {
    commits = commits.filter(c => c.author === author);
  }

  // 已在 git log --name-only 中一次性获取文件列表，无需逐个查询
  const total = commits.length;
  const pagedCommits = commits.slice(offset, offset + limit);

  successResponse(res, {
    data: pagedCommits,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      authors,
      lastSync: new Date().toISOString(),
    },
  });
});

/**
 * GET /api/git/commits/:hash/files
 * 获取单个 commit 变更的文件列表（用于延迟加载 / 缓存补充）
 */
gitRouter.get('/commits/:hash/files', async (req: AuthRequest, res: Response): Promise<void> => {
  const { hash } = req.params;
  const userId = req.user!.id;

  // 校验 hash 格式
  if (!/^[a-f0-9]{7,40}$/i.test(hash)) {
    errorResponse(res, '无效的 commit hash');
    return;
  }

  // 检查文件缓存
  const cached = filesCache.get(hash);
  if (cached && Date.now() - cached.timestamp < FILES_CACHE_TTL) {
    successResponse(res, { files: cached.files });
    return;
  }

  // 从数据库读取用户的 project_path
  try {
    const [rows] = await pool.execute('SELECT project_path FROM users WHERE id = ?', [userId]);
    const users = rows as any[];
    if (!users[0]?.project_path) {
      errorResponse(res, '请先在设置中配置项目地址');
      return;
    }

    const files = getCommitFiles(users[0].project_path, hash);
    filesCache.set(hash, { files, timestamp: Date.now() });
    successResponse(res, { files });
  } catch (err) {
    console.error('[git] Error fetching commit files:', err);
    errorResponse(res, '获取文件列表失败', 500);
  }
});
