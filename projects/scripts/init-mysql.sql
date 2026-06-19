-- 日报笔记系统 MySQL 数据库初始化脚本
-- 请在 MySQL 中执行此脚本

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS daybook DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE daybook;

-- 1. 健康检查表
CREATE TABLE IF NOT EXISTS health_check (
  id INT AUTO_INCREMENT PRIMARY KEY,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. 日报表
CREATE TABLE IF NOT EXISTS daily_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  mood VARCHAR(50),
  tags JSON,
  is_published BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_daily_reports_date (date),
  INDEX idx_daily_reports_date (date),
  INDEX idx_daily_reports_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 周报表
CREATE TABLE IF NOT EXISTS weekly_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  summary TEXT NOT NULL,
  is_published BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_weekly_reports_week_start_date (week_start_date),
  INDEX idx_weekly_reports_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. 分类表
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  sort_order INT DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE KEY uk_categories_name (name),
  INDEX idx_categories_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. 标签表
CREATE TABLE IF NOT EXISTS tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE KEY uk_tags_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. 笔记表
CREATE TABLE IF NOT EXISTS notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  category_id INT,
  is_pinned BOOLEAN DEFAULT FALSE NOT NULL,
  is_archived BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_notes_category_id (category_id),
  INDEX idx_notes_is_pinned (is_pinned),
  INDEX idx_notes_is_archived (is_archived),
  INDEX idx_notes_created_at (created_at),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. 笔记-标签关联表
CREATE TABLE IF NOT EXISTS note_tags (
  note_id INT NOT NULL,
  tag_id INT NOT NULL,
  UNIQUE KEY uk_note_tags (note_id, tag_id),
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. 插入默认分类（可选）
INSERT IGNORE INTO categories (name, icon, sort_order) VALUES
  ('工作', '💼', 1),
  ('学习', '📚', 2),
  ('生活', '🏠', 3),
  ('技术', '💻', 4),
  ('读书', '📖', 5),
  ('项目', '📁', 6),
  ('灵感', '💡', 7),
  ('其他', '📌', 8);

-- 9. 插入默认标签（可选）
INSERT IGNORE INTO tags (name, color) VALUES
  ('重要', '#ef4444'),
  ('待办', '#f59e0b'),
  ('参考', '#3b82f6'),
  ('笔记', '#10b981'),
  ('想法', '#8b5cf6'),
  ('总结', '#06b6d4'),
  ('计划', '#6366f1'),
  ('问题', '#ec4899');

-- 完成！
SELECT 'MySQL 数据库初始化完成！' AS status;
