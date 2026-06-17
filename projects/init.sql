-- Daybook 数据库初始化脚本
-- 在 MySQL 中执行: mysql -u daybook -p daybook < init.sql

CREATE TABLE IF NOT EXISTS health_check (
  id INT AUTO_INCREMENT PRIMARY KEY,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  mood VARCHAR(50),
  tags JSON,
  is_published BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX daily_reports_date_idx (date),
  INDEX daily_reports_created_at_idx (created_at)
);

CREATE TABLE IF NOT EXISTS weekly_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  summary TEXT NOT NULL,
  is_published BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX weekly_reports_week_start_date_idx (week_start_date),
  INDEX weekly_reports_created_at_idx (created_at)
);

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  icon VARCHAR(50),
  sort_order INT DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX categories_sort_order_idx (sort_order)
);

CREATE TABLE IF NOT EXISTS tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  color VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  category_id INT,
  is_pinned BOOLEAN DEFAULT FALSE NOT NULL,
  is_archived BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX notes_category_id_idx (category_id),
  INDEX notes_is_pinned_idx (is_pinned),
  INDEX notes_is_archived_idx (is_archived),
  INDEX notes_created_at_idx (created_at),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS note_tags (
  note_id INT NOT NULL,
  tag_id INT NOT NULL,
  UNIQUE KEY note_tags_note_id_tag_id_key (note_id, tag_id),
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
