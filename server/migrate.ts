import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 5,
  });

  try {
    console.log('Connecting to database...');

    // Check if column already exists
    const [columns] = await pool.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'project_path'",
      [process.env.MYSQL_DATABASE as string]
    );

    if ((columns as any[]).length > 0) {
      console.log('Column project_path already exists, skipping...');
    } else {
      console.log('Adding project_path column to users table...');
      await pool.execute('ALTER TABLE users ADD COLUMN project_path VARCHAR(500) DEFAULT NULL');
      console.log('Column added successfully!');
    }

    // Also check if weekly_reports table exists
    const [tables] = await pool.execute(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'weekly_reports'",
      [process.env.MYSQL_DATABASE as string]
    );

    if ((tables as any[]).length === 0) {
      console.log('Creating weekly_reports table...');
      await pool.execute(`
        CREATE TABLE weekly_reports (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          week_start_date DATE NOT NULL,
          week_end_date DATE NOT NULL,
          summary TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_week_start (week_start_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('weekly_reports table created!');
    } else {
      console.log('weekly_reports table already exists, skipping...');
    }

    // Check if daily_reports table exists
    const [dailyTables] = await pool.execute(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'daily_reports'",
      [process.env.MYSQL_DATABASE as string]
    );

    if ((dailyTables as any[]).length === 0) {
      console.log('Creating daily_reports table...');
      await pool.execute(`
        CREATE TABLE daily_reports (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          date DATE NOT NULL,
          title VARCHAR(255) DEFAULT '',
          content TEXT NOT NULL,
          mood VARCHAR(20) DEFAULT NULL,
          tags JSON DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user_date (user_id, date),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('daily_reports table created!');
    } else {
      console.log('daily_reports table already exists, skipping...');
    }

    console.log('Migration complete!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
