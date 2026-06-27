export interface User {
  id: number;
  username?: string;
  email?: string;
  display_name?: string;
  avatar_url?: string;
  login_type: 'email' | 'wechat';
  created_at: string;
  updated_at: string;
}
