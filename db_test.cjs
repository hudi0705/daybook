const mysql = require('mysql2/promise');
require('dotenv').config();

async function test() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
  });

  console.log('✅ Database connected');

  // Show tables
  const [tables] = await conn.execute('SHOW TABLES');
  console.log('Tables:', tables.map(t => Object.values(t)[0]));

  // Describe daily_reports
  const [cols] = await conn.execute('DESCRIBE daily_reports');
  console.log('\ndaily_reports columns:');
  cols.forEach(c => console.log(`  ${c.Field} | ${c.Type} | ${c.Null} | ${c.Default}`));

  // Try the exact query that stats/summary does
  console.log('\n--- Testing stats queries ---');

  try {
    const [rows] = await conn.execute(
      'SELECT COUNT(*) as totalReports FROM daily_reports WHERE user_id = 1'
    );
    console.log('COUNT query:', rows);
  } catch (err) {
    console.error('COUNT query failed:', err.message);
  }

  try {
    const [dateRows] = await conn.execute(
      'SELECT MIN(date) as firstDate, MAX(date) as lastDate FROM daily_reports WHERE user_id = 1'
    );
    console.log('DATE range query:', dateRows);
  } catch (err) {
    console.error('DATE range query failed:', err.message);
  }

  try {
    const [allDates] = await conn.execute(
      'SELECT DISTINCT date FROM daily_reports WHERE user_id = 1 ORDER BY date DESC'
    );
    console.log('Distinct dates query:', allDates.length, 'rows');
  } catch (err) {
    console.error('Distinct dates query failed:', err.message);
  }

  try {
    const [tagRows] = await conn.execute(
      'SELECT tags FROM daily_reports WHERE user_id = 1 AND tags IS NOT NULL'
    );
    console.log('Tags query:', tagRows.length, 'rows');
    if (tagRows.length > 0) {
      console.log('First tag sample:', typeof tagRows[0].tags, tagRows[0].tags);
    }
  } catch (err) {
    console.error('Tags query failed:', err.message);
  }

  // Test the search query with JSON_CONTAINS
  console.log('\n--- Testing search with JSON_CONTAINS ---');
  try {
    const [rows] = await conn.execute(
      "SELECT COUNT(*) as total FROM daily_reports WHERE user_id = 1 AND (content LIKE ? OR title LIKE ? OR JSON_CONTAINS(tags, ?))",
      ['%test%', '%test%', JSON.stringify('test')]
    );
    console.log('JSON_CONTAINS search query succeeded:', rows);
  } catch (err) {
    console.error('JSON_CONTAINS search query FAILED:', err.message);
  }

  await conn.end();
}

test().catch(console.error);
