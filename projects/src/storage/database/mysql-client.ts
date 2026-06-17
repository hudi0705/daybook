import mysql from 'mysql2/promise';
import { drizzle, MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from './shared/schema';

type DB = MySql2Database<typeof schema> & { $client: mysql.Pool };

let db: DB | null = null;
let pool: mysql.Pool | null = null;

function getPool(): mysql.Pool {
  if (pool) return pool;

  const config = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'daybook',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };

  console.log('[MySQL] 连接配置:', {
    host: config.host,
    port: config.port,
    user: config.user,
    database: config.database,
    password: config.password ? '***' : '(空)',
  });

  pool = mysql.createPool(config);

  return pool;
}

export function getDb(): DB {
  if (db) return db;
  db = drizzle(getPool(), { schema, mode: 'default' }) as DB;
  return db;
}

export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}
