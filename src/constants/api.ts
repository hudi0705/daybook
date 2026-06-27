export const API_ROUTES = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    ME: '/api/auth/me',
  },
  DAILY_REPORTS: {
    LIST: '/api/daily-reports',
    CREATE: '/api/daily-reports',
    GET: (id: number) => `/api/daily-reports/${id}`,
    UPDATE: (id: number) => `/api/daily-reports/${id}`,
    DELETE: (id: number) => `/api/daily-reports/${id}`,
  },
  WEEKLY_REPORTS: {
    LIST: '/api/weekly-reports',
    CREATE: '/api/weekly-reports',
    GET: (id: number) => `/api/weekly-reports/${id}`,
    UPDATE: (id: number) => `/api/weekly-reports/${id}`,
    DELETE: (id: number) => `/api/weekly-reports/${id}`,
    GENERATE: '/api/weekly-reports/generate',
  },
  NOTES: {
    LIST: '/api/notes',
    CREATE: '/api/notes',
    GET: (id: number) => `/api/notes/${id}`,
    UPDATE: (id: number) => `/api/notes/${id}`,
    DELETE: (id: number) => `/api/notes/${id}`,
  },
} as const;
