-- Performance optimization Phase 1: Add composite indexes
-- Run this migration against your MySQL database
-- Uses INFORMATION_SCHEMA check since MySQL doesn't support CREATE INDEX IF NOT EXISTS

-- 为 daily_reports 表添加复合索引（user_id + created_at）
-- 优化按用户查询日报并按时间排序的场景
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE table_schema = DATABASE()
   AND table_name = 'daily_reports'
   AND index_name = 'idx_daily_reports_user_date') = 0,
  'CREATE INDEX idx_daily_reports_user_date ON daily_reports(user_id, created_at)',
  'SELECT "Index idx_daily_reports_user_date already exists"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为 weekly_reports 表添加复合索引（user_id + created_at）
-- 优化按用户查询周报并按时间排序的场景
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE table_schema = DATABASE()
   AND table_name = 'weekly_reports'
   AND index_name = 'idx_weekly_reports_user_date') = 0,
  'CREATE INDEX idx_weekly_reports_user_date ON weekly_reports(user_id, created_at)',
  'SELECT "Index idx_weekly_reports_user_date already exists"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为 notes 表添加复合索引（category_id + updated_at）
-- 注意：notes 表没有 user_id 列，使用 category_id 代替
-- 优化按分类查询笔记并按更新时间排序的场景
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE table_schema = DATABASE()
   AND table_name = 'notes'
   AND index_name = 'idx_notes_category_updated') = 0,
  'CREATE INDEX idx_notes_category_updated ON notes(category_id, updated_at)',
  'SELECT "Index idx_notes_category_updated already exists"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
