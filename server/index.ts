import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { authRouter } from './api/auth/index.js';
import { dailyReportsRouter } from './api/daily-reports/index.js';
import { weeklyReportsRouter } from './api/weekly-reports/index.js';
import { notesRouter } from './api/notes/index.js';
import { settingsRouter } from './api/settings/index.js';
import { contributionRouter } from './api/contribution/index.js';
import { gitRouter } from './api/git/index.js';

// 打包成 exe 后，以 exe 所在目录为基准查找 .env 和 dist/；
// 普通 node 运行时则以当前工作目录为基准。
const isPackaged = !!(process as { pkg?: unknown }).pkg;
const baseDir = isPackaged ? path.dirname(process.execPath) : process.cwd();

dotenv.config({ path: path.join(baseDir, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(compression({
  filter: (req, res) => {
    // 不压缩 SSE 响应，避免缓冲导致流式传输失败
    if (res.getHeader('Content-Type')?.toString().includes('text/event-stream')) {
      return false;
    }
    return compression.filter(req, res);
  },
}));
app.use(express.json({ limit: '10mb' }));

// API routes
app.use('/api/auth', authRouter);
app.use('/api/daily-reports', dailyReportsRouter);
app.use('/api/weekly-reports', weeklyReportsRouter);
app.use('/api/notes', notesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/contribution', contributionRouter);
app.use('/api/git', gitRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 托管前端静态文件（dist/）──
// dist 目录与 exe（或项目根）同级；存在时才挂载，便于纯 API 部署。
const staticDir = path.join(baseDir, 'dist');
if (fs.existsSync(staticDir)) {
  app.use(express.static(staticDir));

  // SPA 兜底：非 /api 路由一律返回 index.html，交给前端路由处理
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      next();
      return;
    }
    res.sendFile(path.join(staticDir, 'index.html'));
  });
} else {
  console.warn(`[server] 未找到前端目录 ${staticDir}，仅提供 API 服务`);
}

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
