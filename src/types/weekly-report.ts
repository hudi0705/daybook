export interface WeeklyReport {
  id: number;
  user_id: number;
  week_start_date: string;
  week_end_date: string;
  summary: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}
