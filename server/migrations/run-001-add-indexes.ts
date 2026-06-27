/**
 * Database migration script: Add performance indexes
 *
 * Run with: npx tsx server/migrations/run-001-add-indexes.ts
 *
 * Requires .env file with MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
 */

import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

const indexes = [
  {
    table: 'daily_reports',
    name: 'idx_daily_reports_user_date',
    columns: '(user_id, created_at)',
  },
  {
    table: 'weekly_reports',
    name: 'idx_weekly_reports_user_date',
    columns: '(user_id, created_at)',
  },
  {
    table: 'notes',
    name: 'idx_notes_category_updated',
    columns: '(category_id, updated_at)',
  },
];

async function runMigration() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'daybook',
  });

  console.log('Connected to database. Checking indexes...\n');

  for (const idx of indexes) {
    try {
      const [rows] = await conn.execute(
        'SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.STATISTICS WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?',
        [idx.table, idx.name]
      );

      const count = (rows as any)[0].count;
      if (count === 0) {
        await conn.execute(`CREATE INDEX ${idx.name} ON ${idx.table}${idx.columns}`);
        console.log(`✅ Created index: ${idx.name}`);
      } else {
        console.log(`⏭️  Index already exists: ${idx.name}`);
      }
    } catch (err: any) {
      console.error(`❌ Error creating index ${idx.name}:`, err.message);
    }
  }

  await conn.end();
  console.log('\nMigration completed!');
}

runMigration().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
