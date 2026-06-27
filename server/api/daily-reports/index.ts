import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../../middleware/auth.js';
import pool from '../../db.js';
import {
  successResponse,
  createdResponse,
  errorResponse,
  notFoundResponse,
  paginatedResponse,
} from '../../utils/response.js';

export const dailyReportsRouter = Router();

dailyReportsRouter.use(authMiddleware);

/**
 * GET /api/daily-reports/stats/summary
 * Get report statistics for the current user
 * (must be before /:id to avoid route conflict)
 */
dailyReportsRouter.get('/stats/summary', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;

  try {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as totalReports FROM daily_reports WHERE user_id = ?',
      [userId]
    );
    const totalReports = (rows as any[])[0].totalReports;

    const [dateRows] = await pool.execute(
      'SELECT MIN(date) as firstDate, MAX(date) as lastDate FROM daily_reports WHERE user_id = ?',
      [userId]
    );
    const firstDate = (dateRows as any[])[0]?.firstDate || null;
    const lastDate = (dateRows as any[])[0]?.lastDate || null;

    // Helper to safely format a date value (may be Date object or string from MySQL)
    const fmtDate = (d: any): string | null => {
      if (!d) return null;
      if (d instanceof Date) return d.toISOString().split('T')[0];
      return String(d).split('T')[0];
    };

    // Get all dates for streak calculation
    const [allDates] = await pool.execute(
      'SELECT DISTINCT date FROM daily_reports WHERE user_id = ? ORDER BY date DESC',
      [userId]
    );
    const dates = (allDates as any[]).map((r: any) => r.date);
    const streak = calculateStreak(dates);

    // Get tag counts
    const [tagRows] = await pool.execute(
      'SELECT tags FROM daily_reports WHERE user_id = ? AND tags IS NOT NULL',
      [userId]
    );
    const tags: Record<string, number> = {};
    for (const row of tagRows as any[]) {
      let parsed: string[] = [];
      if (Array.isArray(row.tags)) {
        parsed = row.tags;
      } else if (typeof row.tags === 'string' && row.tags) {
        try { parsed = JSON.parse(row.tags); } catch { parsed = []; }
      }
      for (const tag of parsed) {
        tags[tag] = (tags[tag] || 0) + 1;
      }
    }

    successResponse(res, {
      totalReports,
      streak,
      firstReportDate: fmtDate(firstDate),
      lastReportDate: fmtDate(lastDate),
      tags,
    });
  } catch (err) {
    console.error('[daily-reports] Error fetching stats:', err);
    errorResponse(res, '获取日报统计失败', 500);
  }
});

/**
 * GET /api/daily-reports
 * List daily reports with pagination and filters
 */
dailyReportsRouter.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const search = (req.query.search as string)?.toLowerCase();
  const offset = (page - 1) * limit;

  try {
    let query = 'SELECT * FROM daily_reports WHERE user_id = ?';
    const params: any[] = [userId];

    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }
    if (search) {
      query += ' AND (content LIKE ? OR title LIKE ? OR JSON_CONTAINS(tags, ?))';
      params.push(`%${search}%`, `%${search}%`, JSON.stringify(search));
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [countRows] = await pool.execute(countQuery, params);
    const total = (countRows as any[])[0].total;

    // Get paginated data
    query += ' ORDER BY date DESC, id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.execute(query, params);
    const reports = (rows as any[]).map(formatReport);

    paginatedResponse(res, reports, total, page, limit);
  } catch (err) {
    console.error('[daily-reports] Error fetching reports:', err);
    errorResponse(res, '获取日报列表失败', 500);
  }
});

/**
 * GET /api/daily-reports/:id
 * Get a single daily report
 */
dailyReportsRouter.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const reportId = parseInt(req.params.id, 10);
  const userId = req.user!.id;

  try {
    const [rows] = await pool.execute(
      'SELECT * FROM daily_reports WHERE id = ? AND user_id = ?',
      [reportId, userId]
    );

    if ((rows as any[]).length === 0) {
      notFoundResponse(res, 'Daily report');
      return;
    }

    successResponse(res, formatReport((rows as any[])[0]));
  } catch (err) {
    console.error('[daily-reports] Error fetching report:', err);
    errorResponse(res, '获取日报失败', 500);
  }
});

/**
 * POST /api/daily-reports
 * Create a new daily report
 */
dailyReportsRouter.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { date, title, content, mood, tags } = req.body;

  if (!date || !content) {
    errorResponse(res, 'Date and content are required');
    return;
  }

  try {
    // Check for duplicate date
    const [existing] = await pool.execute(
      'SELECT id FROM daily_reports WHERE user_id = ? AND date = ?',
      [userId, date]
    );
    if ((existing as any[]).length > 0) {
      errorResponse(res, 'A daily report already exists for this date', 409);
      return;
    }

    const [result] = await pool.execute(
      'INSERT INTO daily_reports (user_id, date, title, content, mood, tags) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, date, title || '', content, mood || null, JSON.stringify(tags || [])]
    );
    const insertId = (result as any).insertId;

    const [rows] = await pool.execute('SELECT * FROM daily_reports WHERE id = ?', [insertId]);
    createdResponse(res, formatReport((rows as any[])[0]), 'Daily report created');
  } catch (err) {
    console.error('[daily-reports] Error creating report:', err);
    errorResponse(res, '创建日报失败', 500);
  }
});

/**
 * PUT /api/daily-reports/:id
 * Update an existing daily report
 */
dailyReportsRouter.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const reportId = parseInt(req.params.id, 10);
  const { title, content, mood, tags, date } = req.body;

  try {
    // Check exists and belongs to user
    const [existing] = await pool.execute(
      'SELECT * FROM daily_reports WHERE id = ? AND user_id = ?',
      [reportId, userId]
    );

    if ((existing as any[]).length === 0) {
      notFoundResponse(res, 'Daily report');
      return;
    }

    const old = (existing as any[])[0];
    await pool.execute(
      'UPDATE daily_reports SET title = ?, content = ?, mood = ?, tags = ?, date = ? WHERE id = ?',
      [
        title !== undefined ? title : old.title,
        content !== undefined ? content : old.content,
        mood !== undefined ? mood : old.mood,
        tags !== undefined ? JSON.stringify(tags) : old.tags,
        date !== undefined ? date : old.date,
        reportId,
      ]
    );

    const [rows] = await pool.execute('SELECT * FROM daily_reports WHERE id = ?', [reportId]);
    successResponse(res, formatReport((rows as any[])[0]), 'Daily report updated');
  } catch (err) {
    console.error('[daily-reports] Error updating report:', err);
    errorResponse(res, '更新日报失败', 500);
  }
});

/**
 * DELETE /api/daily-reports/:id
 * Delete a daily report
 */
dailyReportsRouter.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const reportId = parseInt(req.params.id, 10);

  try {
    const [existing] = await pool.execute(
      'SELECT id FROM daily_reports WHERE id = ? AND user_id = ?',
      [reportId, userId]
    );

    if ((existing as any[]).length === 0) {
      notFoundResponse(res, 'Daily report');
      return;
    }

    await pool.execute('DELETE FROM daily_reports WHERE id = ?', [reportId]);
    successResponse(res, null, 'Daily report deleted');
  } catch (err) {
    console.error('[daily-reports] Error deleting report:', err);
    errorResponse(res, '删除日报失败', 500);
  }
});

/**
 * POST /api/daily-reports/git-generate
 * 根据 Git 提交记录生成日报内容（不自动保存，返回给前端让用户确认）
 */
dailyReportsRouter.post('/git-generate', async (req: AuthRequest, res: Response): Promise<void> => {
  const { date, commits, ai_config } = req.body;

  if (!date) {
    errorResponse(res, 'date 是必需的');
    return;
  }

  if (!commits || !Array.isArray(commits) || commits.length === 0) {
    errorResponse(res, '请至少提供一条提交记录');
    return;
  }

  if (!ai_config || !ai_config.baseUrl || !ai_config.apiKey) {
    errorResponse(res, 'AI 配置是必需的');
    return;
  }

  // 限制提交记录数量（最多 15 条）
  const limitedCommits = commits.slice(0, 15);

  // 根据风格生成不同的系统提示
  const stylePrompts: Record<string, string> = {
    detailed: '生成详细的日报，包含完整的工作内容、技术细节、遇到的问题和解决方案。',
    concise: '生成简洁的日报，只列出关键工作点和成果。',
    technical: '生成技术向日报，侧重技术实现、代码变更、架构改动。',
    report: '生成汇报向日报，适合向上级汇报，突出成果和价值。',
  };
  const style = ai_config.style || 'detailed';

  let systemPrompt: string;
  if (style === 'pony') {
    systemPrompt = `你是研发日报助手，严格按「小马笔记日报」结构生成日报，仅依据提供的提交记录、不要编造内容。使用 HTML：<h1> 作为标题，<h2> 表示“一、二、…”大标题，<h3> 表示“2.1、2.2…”小节，<ul>/<li> 列要点，并在每条要点末尾用 <code> 标注对应的 commit 短哈希（如 <code>350f425a3</code>）。结构如下：\n标题：小马笔记日报 - ${date}\n一、今日提交统计：项目名称、分支、提交数（不含 Merge）。项目名与分支若无法从提交信息判断则写“未知”，提交数按下方提供的记录条数统计。\n二、完成工作：按功能/模块分组；重点模块拆分为 2.1、2.2 等小节，每条说明改动内容并附对应 commit 短哈希；若某提交为 revert/撤销，归入“已撤销的修改”小节并注明原因。\n三、待处理事项：列出未完成或需跟进的事项，没有则写“无”。\n四、其他项目：今日无提交的其它项目标注“今日无提交”，没有可省略该节。\n五、备注：用一句话总结今日工作重点。`;
  } else {
    systemPrompt = `根据 Git 提交生成日报。${stylePrompts[style] || stylePrompts.detailed}格式：今日工作总结、主要工作内容、技术要点、明日计划。使用 HTML 格式（h2/ol/ul/li），语言简洁专业。`;
  }

  const userPrompt = `日期：${date}\n\n提交记录（${limitedCommits.length} 条）：\n${limitedCommits.map((c: any, i: number) => `${i + 1}. [${String(c.hash || '').slice(0, 9)}] ${c.message}${c.author ? ` (@${c.author})` : ''}`).join('\n')}`;

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
      console.error('[git-generate-daily] AI API error:', response.status, errorText);
      errorResponse(res, `AI 服务请求失败 (${response.status})`);
      return;
    }

    // 设置 SSE 响应头（使用 setHeader 而非 writeHead，
    // 让 compression 中间件的 filter 能正确检测到 text/event-stream 并跳过压缩，
    // 避免 SSE 流被缓冲导致前端无法正常接收流式数据）
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // 流式传输 AI 响应
    if (!response.body) {
      res.end();
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      res.write(chunk);
      // 强制刷新缓冲区，确保 SSE 数据立即发送到客户端
      if (typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
    }

    res.end();
  } catch (err: any) {
    console.error('[git-generate-daily] Error:', err);
    if (!res.headersSent) {
      if (err.name === 'TimeoutError' || err.code === 'ABORT_ERR') {
        errorResponse(res, 'AI 服务请求超时，请稍后重试');
      } else {
        errorResponse(res, '生成日报失败');
      }
    } else {
      // 如果 headers 已发送但发生错误，确保关闭连接
      try { res.end(); } catch {}
    }
  }
});

/**
 * Format a DB row into a camelCase DailyReport object
 */
function formatReport(row: any) {
  // Handle tags: MySQL2 may return JSON columns as already-parsed objects
  let tags: string[] = [];
  if (row.tags) {
    if (typeof row.tags === 'string') {
      try { tags = JSON.parse(row.tags); } catch { tags = []; }
    } else if (Array.isArray(row.tags)) {
      tags = row.tags;
    }
  }

  return {
    id: row.id,
    userId: row.user_id,
    date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : row.date,
    title: row.title || '',
    content: row.content,
    mood: row.mood || undefined,
    tags,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function calculateStreak(dates: any[]): number {
  if (dates.length === 0) return 0;

  // dates come sorted DESC from the query, may be Date objects from MySQL
  const sorted = dates.map(d => d instanceof Date ? d.toISOString().split('T')[0] : String(d));
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Streak must include today or yesterday
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (prev.getTime() - curr.getTime()) / 86400000;
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
