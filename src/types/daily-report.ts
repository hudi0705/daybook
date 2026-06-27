export interface DailyReport {
  id: number;
  user_id: number;
  date: string;
  title: string;
  content: string;
  mood?: string;
  tags?: string[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
}
