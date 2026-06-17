-- AI配置表创建脚本
-- 请在 Supabase SQL Editor 中执行此脚本

-- 创建AI配置表
CREATE TABLE IF NOT EXISTS ai_settings (
  id SERIAL PRIMARY KEY,
  user_id UUID DEFAULT auth.uid(),
  provider VARCHAR(50) NOT NULL DEFAULT 'openai',
  api_key TEXT NOT NULL,
  api_base_url TEXT,
  model VARCHAR(100) NOT NULL,
  temperature DECIMAL(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 2000,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS ai_settings_user_id_idx ON ai_settings(user_id);
CREATE INDEX IF NOT EXISTS ai_settings_is_active_idx ON ai_settings(is_active);

-- 启用RLS（Row Level Security）
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略：用户只能访问自己的配置
CREATE POLICY "Users can view own ai_settings" ON ai_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai_settings" ON ai_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ai_settings" ON ai_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ai_settings" ON ai_settings
  FOR DELETE USING (auth.uid() = user_id);

SELECT 'AI settings table created successfully!' as status;
