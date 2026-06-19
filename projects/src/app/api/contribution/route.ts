import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/storage/database/mysql-client';
import { dailyReports } from '@/storage/database/shared/schema';
import { asc, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    const viewMode = searchParams.get('viewMode') || 'year';

    let startDate: Date;
    let endDate: Date;
    const now = new Date();

    if (viewMode === 'month') {
      startDate = new Date(parseInt(year), now.getMonth(), 1);
      endDate = new Date(parseInt(year), now.getMonth() + 1, 0);
    } else if (viewMode === 'quarter') {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      startDate = new Date(parseInt(year), quarterMonth, 1);
      endDate = new Date(parseInt(year), quarterMonth + 3, 0);
    } else {
      startDate = new Date(parseInt(year) - 1, now.getMonth(), now.getDate());
      endDate = new Date(parseInt(year), now.getMonth(), now.getDate());
    }

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const reports = await db
      .select({
        date: dailyReports.date,
        count: sql<number>`count(*)`.as('count'),
      })
      .from(dailyReports)
      .where(sql`${dailyReports.date} >= ${startStr} AND ${dailyReports.date} <= ${endStr}`)
      .groupBy(dailyReports.date)
      .orderBy(asc(dailyReports.date));

    const contributionData = reports.map((report) => {
      // 确保日期格式为 YYYY-MM-DD
      const dateStr = typeof report.date === 'string'
        ? report.date.split('T')[0]
        : new Date(report.date).toISOString().split('T')[0];
      return {
        date: dateStr,
        count: report.count,
      };
    });

    return NextResponse.json({
      success: true,
      data: contributionData,
      stats: {
        total: reports.length,
        start_date: startStr,
        end_date: endStr,
      },
    });
  } catch (error) {
    console.error('Error in contribution API:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
