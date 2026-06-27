const mysql = require('mysql2/promise');
require('dotenv').config();

async function test() {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  const userId = 1;

  try {
    // Step 1: COUNT
    console.log('Step 1: COUNT...');
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as totalReports FROM daily_reports WHERE user_id = ?',
      [userId]
    );
    const totalReports = rows[0].totalReports;
    console.log('  totalReports:', totalReports);

    // Step 2: DATE range
    console.log('Step 2: DATE range...');
    const [dateRows] = await pool.execute(
      'SELECT MIN(date) as firstDate, MAX(date) as lastDate FROM daily_reports WHERE user_id = ?',
      [userId]
    );
    const firstDate = dateRows[0] ? dateRows[0].firstDate : null;
    const lastDate = dateRows[0] ? dateRows[0].lastDate : null;
    console.log('  firstDate:', firstDate, typeof firstDate);
    console.log('  lastDate:', lastDate, typeof lastDate);

    // Step 3: All dates for streak
    console.log('Step 3: Distinct dates...');
    const [allDates] = await pool.execute(
      'SELECT DISTINCT date FROM daily_reports WHERE user_id = ? ORDER BY date DESC',
      [userId]
    );
    console.log('  dates count:', allDates.length);
    const dates = allDates.map((r) => r.date);
    console.log('  first date:', dates[0], typeof dates[0]);
    console.log('  date instanceof Date:', dates[0] instanceof Date);

    // Convert dates like the code does
    const sorted = dates.map(d => d instanceof Date ? d.toISOString().split('T')[0] : String(d));
    console.log('  sorted[0]:', sorted[0]);

    // calculateStreak
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    console.log('  today:', today, 'yesterday:', yesterday);
    console.log('  streak match today?', sorted[0] === today);
    console.log('  streak match yesterday?', sorted[0] === yesterday);

    let streak = 0;
    if (sorted[0] === today || sorted[0] === yesterday) {
      streak = 1;
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
    }
    console.log('  streak:', streak);

    // Step 4: Tags
    console.log('Step 4: Tags...');
    const [tagRows] = await pool.execute(
      'SELECT tags FROM daily_reports WHERE user_id = ? AND tags IS NOT NULL',
      [userId]
    );
    console.log('  tagRows count:', tagRows.length);
    const tags = {};
    for (const row of tagRows) {
      console.log('  row.tags:', typeof row.tags, JSON.stringify(row.tags));
      const parsed = row.tags ? JSON.parse(row.tags) : [];
      console.log('  parsed:', parsed);
      for (const tag of parsed) {
        tags[tag] = (tags[tag] || 0) + 1;
      }
    }
    console.log('  tags:', tags);

    // Step 5: Final result
    const result = {
      totalReports,
      streak,
      firstReportDate: firstDate ? String(firstDate).split('T')[0] : null,
      lastReportDate: lastDate ? String(lastDate).split('T')[0] : null,
      tags,
    };
    console.log('\nFinal result:', JSON.stringify(result, null, 2));
    console.log('\n✅ All steps succeeded');

  } catch (err) {
    console.error('❌ Error at step:', err.message);
    console.error('Stack:', err.stack);
  }

  await pool.end();
}

test().catch(console.error);
