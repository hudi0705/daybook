export const APP_CONFIG = {
  NAME: 'DayBook',
  DESCRIPTION: '个人日报/周报管理系统',
  VERSION: '1.0.0',
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const DATE_FORMATS = {
  DATE: 'YYYY-MM-DD',
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  WEEK_START: 'YYYY-MM-DD',
  WEEK_END: 'YYYY-MM-DD',
} as const;

export const MOOD_OPTIONS = [
  { value: 'happy', label: '开心', emoji: '😊' },
  { value: 'neutral', label: '一般', emoji: '😐' },
  { value: 'sad', label: '难过', emoji: '😢' },
  { value: 'excited', label: '兴奋', emoji: '🎉' },
  { value: 'tired', label: '疲惫', emoji: '😴' },
] as const;
