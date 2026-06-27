import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../../middleware/auth.js';
import pool from '../../db.js';
import { successResponse, errorResponse } from '../../utils/response.js';

export const contributionRouter = Router();

// Apply auth middleware
contributionRouter.use(authMiddleware);

/**
 * GET /api/contribution
 * Get daily contribution data (for heatmap)
 * Query params: year (optional, defaults to past 12 months)
 */
contributionRouter.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const yearParam = req.query.year as string | undefined;

  try {
    let query: string;
    const params: any[] = [userId];

    if (yearParam) {
      const year = parseInt(yearParam, 10);
      query = 'SELECT date FROM daily_reports WHERE user_id = ? AND YEAR(date) = ?';
      params.push(year);
    } else {
      // Default: past 12 months
      query = 'SELECT date FROM daily_reports WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)';
    }

    const [rows] = await pool.execute(query, params);

    // Build a map of date -> count
    const counts: Record<string, number> = {};
    for (const row of rows as any[]) {
      const dateStr = row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date);
      counts[dateStr] = (counts[dateStr] || 0) + 1;
    }

    // Convert to array format
    const data = Object.entries(counts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    successResponse(res, data);
  } catch (err) {
    console.error('[contribution] Error fetching contribution data:', err);
    errorResponse(res, '获取贡献数据失败', 500);
  }
});
