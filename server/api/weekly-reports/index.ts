import { Router, Response } from 'express';
import { execSync } from 'child_process';
import { authMiddleware, AuthRequest } from '../../middleware/auth.js';
import {
  successResponse,
  createdResponse,
  errorResponse,
  notFoundResponse,
  paginatedResponse,
} from '../../utils/response.js';
import pool from '../../db.js';

export const weeklyReportsRouter = Router();

weeklyReportsRouter.use(authMiddleware);

interface WeeklyReport {
  id: number;
  userId: number;
  weekStart: string;
  weekEnd: string;
  summary: string;
  highlights: string[];
  challenges: string[];
  nextWeekPlan: string;
  dailyReportIds: number[];
  createdAt: string;
  updatedAt: string;
}

const reports: Map<number, WeeklyReport> = new Map();
let nextId = 1;

/**
 * GET /api/weekly-reports
 * List weekly reports with pagination
 */
weeklyReportsRouter.get('/', (req: AuthRequest, res: Response): void => {
  const userId = req.user!.id;
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

  let userReports = Array.from(reports.values())
    .filter((r) => r.userId === userId)
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart));

  const total = userReports.length;
  const offset = (page - 1) * limit;
  const paged = userReports.slice(offset, offset + limit);

  paginatedResponse(res, paged, total, page, limit);
});

/**
 * GET /api/weekly-reports/:id
 * Get a single weekly report
 */
weeklyReportsRouter.get('/:id', (req: AuthRequest, res: Response): void => {
  const reportId = parseInt(req.params.id, 10);
  const report = reports.get(reportId);

  if (!report || report.userId !== req.user!.id) {
    notFoundResponse(res, 'Weekly report');
    return;
  }

  successResponse(res, report);
});

/**
 * POST /api/weekly-reports
 * Create a new weekly report
 */
weeklyReportsRouter.post('/', (req: AuthRequest, res: Response): void => {
  const { weekStart, weekEnd, summary, highlights, challenges, nextWeekPlan, dailyReportIds } = req.body;

  if (!weekStart || !weekEnd || !summary) {
    errorResponse(res, 'Week start, week end, and summary are required');
    return;
  }

  if (weekStart > weekEnd) {
    errorResponse(res, 'Week start must be before week end');
    return;
  }

  const id = nextId++;
  const now = new Date().toISOString();
  const report: WeeklyReport = {
    id,
    userId: req.user!.id,
    weekStart,
    weekEnd,
    summary,
    highlights: highlights || [],
    challenges: challenges || [],
    nextWeekPlan: nextWeekPlan || '',
    dailyReportIds: dailyReportIds || [],
    createdAt: now,
    updatedAt: now,
  };

  reports.set(id, report);
  createdResponse(res, report, 'Weekly report created');
});

/**
 * PUT /api/weekly-reports/:id
 * Update a weekly report
 */
weeklyReportsRouter.put('/:id', (req: AuthRequest, res: Response): void => {
  const reportId = parseInt(req.params.id, 10);
  const existing = reports.get(reportId);

  if (!existing || existing.userId !== req.user!.id) {
    notFoundResponse(res, 'Weekly report');
    return;
  }

  const { summary, highlights, challenges, nextWeekPlan, dailyReportIds } = req.body;

  const updated: WeeklyReport = {
    ...existing,
    ...(summary !== undefined && { summary }),
    ...(highlights !== undefined && { highlights }),
    ...(challenges !== undefined && { challenges }),
    ...(nextWeekPlan !== undefined && { nextWeekPlan }),
    ...(dailyReportIds !== undefined && { dailyReportIds }),
    updatedAt: new Date().toISOString(),
  };

  reports.set(reportId, updated);
  successResponse(res, updated, 'Weekly report updated');
});

/**
 * DELETE /api/weekly-reports/:id
 * Delete a weekly report
 */
weeklyReportsRouter.delete('/:id', (req: AuthRequest, res: Response): void => {
  const reportId = parseInt(req.params.id, 10);
  const report = reports.get(reportId);

  if (!report || report.userId !== req.user!.id) {
    notFoundResponse(res, 'Weekly report');
    return;
  }

  reports.delete(reportId);
  successResponse(res, null, 'Weekly report deleted');
});

/**
 * POST /api/weekly-reports/generate
 * Generate a weekly report from daily reports
 */
weeklyReportsRouter.post('/generate', (req: AuthRequest, res: Response): void => {
  const { weekStart, weekEnd } = req.body;

  if (!weekStart || !weekEnd) {
    errorResponse(res, 'Week start and week end are required');
    return;
  }

  // In production, this would aggregate daily reports and call an AI service
  const generated = {
    weekStart,
    weekEnd,
    summary: '[AI-generated summary would appear here]',
    highlights: ['Highlight 1', 'Highlight 2'],
    challenges: ['Challenge 1'],
    nextWeekPlan: '[AI-generated plan would appear here]',
  };

  successResponse(res, generated, 'Weekly report generated (preview)');
});

/**
 * POST /api/weekly-reports/git-generate
 * Generate a weekly report from Git commit history
 */
weeklyReportsRouter.post('/git-generate', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { start_date, end_date, ai_config } = req.body;

  if (!start_date || !end_date) {
    errorResponse(res, 'start_date and end_date are required');
    return;
  }

  if (!ai_config || !ai_config.baseUrl || !ai_config.apiKey) {
    errorResponse(res, 'AI configuration is required');
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
    console.error('[git-generate] Error fetching project path:', err);
    errorResponse(res, 'Failed to fetch project path', 500);
    return;
  }

  // 计算 end_date + 1 天（git log --until 是 exclusive 的）
  const endDateObj = new Date(end_date);
  endDateObj.setDate(endDateObj.getDate() + 1);
  const untilDate = endDateObj.toISOString().split('T')[0];

  // 执行 git log 获取提交记录
  let gitLog: string;
  try {
    const cmd = `git log --since="${start_date}" --until="${untilDate}" --pretty=format:"%H|%ai|%s|%an" --no-merges`;
    gitLog = execSync(cmd, {
      cwd: projectPath,
      timeout: 10000,
      encoding: 'utf-8',
      maxBuffer: 5 * 1024 * 1024,
    }).trim();
  } catch (err: any) {
    console.error('[git-generate] Error running git log:', err);
    if (err.status === 128) {
      errorResponse(res, '项目路径不是一个有效的 Git 仓库');
    } else {
      errorResponse(res, '获取 Git 提交记录失败');
    }
    return;
  }

  if (!gitLog) {
    errorResponse(res, '该时间段内没有找到 Git 提交记录');
    return;
  }

  // 解析 git log
  const commits = gitLog.split('\n').map(line => {
    const [hash, date, ...rest] = line.split('|');
    // 最后一个是 author，倒数第一个是 message
    const author = rest.pop() || '';
    const message = rest.join('|') || '';
    return { hash: hash?.trim(), date: date?.trim(), message: message.trim(), author: author.trim() };
  }).filter(c => c.hash);

  // 限制提交记录数量（最多 15 条）
  const limitedCommits = commits.slice(0, 15);

  // 根据风格生成不同的系统提示
  const stylePrompts: Record<string, string> = {
    detailed: '生成详细的周报，包含完整的工作内容、技术细节、遇到的问题和解决方案。',
    concise: '生成简洁的周报，只列出关键工作点和成果。',
    technical: '生成技术向周报，侧重技术实现、代码变更、架构改动。',
    report: '生成汇报向周报，适合向上级汇报，突出成果和价值。',
  };
  const style = ai_config.style || 'detailed';
  const systemPrompt = `根据 Git 提交生成周报。${stylePrompts[style] || stylePrompts.detailed}格式：本周工作总结、详细工作内容、技术要点、下周计划。使用 Markdown 格式，语言简洁专业。`;
  const userPrompt = `日期范围：${start_date} 至 ${end_date}\n\n提交记录（${limitedCommits.length} 条）：\n${limitedCommits.map((c: any, i: number) => `${i + 1}. ${c.message}`).join('\n')}`;

  try {
    const modelId = ai_config.modelId || ai_config.modelName || 'deepseek-chat';
    const response = await fetch(`${ai_config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ai_config.apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 2048,
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[git-generate-weekly] AI API error:', response.status, errorText);
      errorResponse(res, `AI 服务请求失败 (${response.status})`);
      return;
    }

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // 流式传输 AI 响应
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      res.write(chunk);
    }

    res.end();
  } catch (err: any) {
    console.error('[git-generate-weekly] Error:', err);
    if (!res.headersSent) {
      if (err.name === 'TimeoutError' || err.code === 'ABORT_ERR') {
        errorResponse(res, 'AI 服务请求超时，请稍后重试');
      } else {
        errorResponse(res, '生成周报失败');
      }
    }
  }
});
