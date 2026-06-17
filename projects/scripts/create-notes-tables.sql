-- 笔记功能数据库表创建脚本
-- 请在 Supabase SQL Editor 中执行此脚本

-- 1. 创建分类表
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  icon VARCHAR(50),
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS categories_sort_order_idx ON categories(sort_order);

-- 2. 创建标签表
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  color VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. 创建笔记表
CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  is_pinned BOOLEAN DEFAULT FALSE NOT NULL,
  is_archived BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS notes_category_id_idx ON notes(category_id);
CREATE INDEX IF NOT EXISTS notes_is_pinned_idx ON notes(is_pinned);
CREATE INDEX IF NOT EXISTS notes_is_archived_idx ON notes(is_archived);
CREATE INDEX IF NOT EXISTS notes_created_at_idx ON notes(created_at);

-- 4. 创建笔记-标签关联表
CREATE TABLE IF NOT EXISTS note_tags (
  note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE(note_id, tag_id)
);

-- 5. 插入默认分类（可选）
INSERT INTO categories (name, icon, sort_order) VALUES
  ('工作', '💼', 1),
  ('学习', '📚', 2),
  ('生活', '🏠', 3),
  ('技术', '💻', 4),
  ('读书', '📖', 5),
  ('项目', '📁', 6),
  ('灵感', '💡', 7),
  ('其他', '📌', 8)
ON CONFLICT (name) DO NOTHING;

-- 6. 插入默认标签（可选）
INSERT INTO tags (name, color) VALUES
  ('重要', '#ef4444'),
  ('待办', '#f59e0b'),
  ('参考', '#3b82f6'),
  ('笔记', '#10b981'),
  ('想法', '#8b5cf6'),
  ('总结', '#06b6d4'),
  ('计划', '#6366f1'),
  ('问题', '#ec4899')
ON CONFLICT (name) DO NOTHING;

-- 完成！
SELECT 'Notes tables created successfully!' as status;
