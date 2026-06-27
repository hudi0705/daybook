// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// ── Mock the database pool ──
const mockExecute = vi.fn();
vi.mock('../server/db.js', () => ({
  default: { execute: (...args) => mockExecute(...args) },
}));

// ── Mock jose for JWT verification ──
vi.mock('jose', () => ({
  jwtVerify: vi.fn().mockResolvedValue({
    payload: { sub: '1', email: 'test@example.com', username: 'testuser' },
  }),
  SignJWT: vi.fn().mockImplementation(() => ({
    setProtectedHeader: vi.fn().mockReturnThis(),
    setSubject: vi.fn().mockReturnThis(),
    setIssuedAt: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    sign: vi.fn().mockResolvedValue('mock-token'),
  })),
}));

// Import the router after mocks are set up
const { dailyReportsRouter } = await import('../server/api/daily-reports/index.js');

// ── Helper: create a test Express app ──
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/daily-reports', dailyReportsRouter);
  return app;
}

const AUTH_HEADER = 'Bearer mock-token';

// ── Sample data ──
const sampleReport = {
  id: 1,
  user_id: 1,
  date: '2026-06-27',
  title: '测试日报标题',
  content: '<h2>今日工作总结</h2><ul><li>完成功能开发</li><li>修复 Bug</li></ul>',
  mood: '😊',
  tags: '["开发","测试"]',
  created_at: '2026-06-27 10:00:00',
  updated_at: '2026-06-27 10:00:00',
};

// ════════════════════════════════════════════════════════════
// Test Suite: Create Daily Report (POST /api/daily-reports)
// ════════════════════════════════════════════════════════════
describe('POST /api/daily-reports — 创建日报', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    mockExecute.mockReset();
  });

  it('测试 1: 创建新日报 — 应返回 201', async () => {
    mockExecute
      .mockResolvedValueOnce([[]]) // duplicate check: no existing
      .mockResolvedValueOnce([{ insertId: 1 }]) // INSERT
      .mockResolvedValueOnce([[sampleReport]]); // SELECT after insert

    const res = await request(app)
      .post('/api/daily-reports')
      .set('Authorization', AUTH_HEADER)
      .send({
        date: '2026-06-27',
        title: '测试日报标题',
        content: '<h2>今日工作总结</h2><ul><li>完成功能开发</li><li>修复 Bug</li></ul>',
        mood: '😊',
        tags: ['开发', '测试'],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.title).toBe('测试日报标题');
    expect(res.body.data.mood).toBe('😊');
    expect(res.body.data.tags).toEqual(['开发', '测试']);
  });

  it('测试 2: 创建重复日期日报 — 应返回 409', async () => {
    mockExecute.mockResolvedValueOnce([[{ id: 1 }]]);

    const res = await request(app)
      .post('/api/daily-reports')
      .set('Authorization', AUTH_HEADER)
      .send({
        date: '2026-06-27',
        title: '重复日报',
        content: '重复内容',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('测试 3: 创建缺少必填字段的日报 — 应返回 400', async () => {
    const res = await request(app)
      .post('/api/daily-reports')
      .set('Authorization', AUTH_HEADER)
      .send({
        title: '缺少日期和内容',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/required/i);
  });
});

// ════════════════════════════════════════════════════════════
// Test Suite: Get Daily Reports (GET /api/daily-reports)
// ════════════════════════════════════════════════════════════
describe('GET /api/daily-reports — 获取日报列表', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    mockExecute.mockReset();
  });

  it('测试 4: 获取日报列表 — 应返回 200 和分页数据', async () => {
    mockExecute
      .mockResolvedValueOnce([[{ total: 1 }]]) // COUNT
      .mockResolvedValueOnce([[sampleReport]]); // SELECT

    const res = await request(app)
      .get('/api/daily-reports?page=1&limit=10')
      .set('Authorization', AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(10);
  });
});

// ════════════════════════════════════════════════════════════
// Test Suite: Get Single Report (GET /api/daily-reports/:id)
// ════════════════════════════════════════════════════════════
describe('GET /api/daily-reports/:id — 获取单个日报', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    mockExecute.mockReset();
  });

  it('测试 5: 获取单个日报 — 应返回 200 和日报详情', async () => {
    mockExecute.mockResolvedValueOnce([[sampleReport]]);

    const res = await request(app)
      .get('/api/daily-reports/1')
      .set('Authorization', AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(1);
    expect(res.body.data.title).toBe('测试日报标题');
    expect(res.body.data.tags).toEqual(['开发', '测试']);
  });

  it('测试 5b: 获取不存在的日报 — 应返回 404', async () => {
    mockExecute.mockResolvedValueOnce([[]]);

    const res = await request(app)
      .get('/api/daily-reports/99999')
      .set('Authorization', AUTH_HEADER);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════
// Test Suite: Update Daily Report (PUT /api/daily-reports/:id)
// ════════════════════════════════════════════════════════════
describe('PUT /api/daily-reports/:id — 更新日报', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    mockExecute.mockReset();
  });

  it('测试 6: 更新日报 — 应返回 200 和更新后的数据', async () => {
    const updatedReport = { ...sampleReport, title: '更新后的标题', mood: '💪', tags: '["开发","测试","更新"]' };
    mockExecute
      .mockResolvedValueOnce([[sampleReport]]) // SELECT existing
      .mockResolvedValueOnce([{}]) // UPDATE
      .mockResolvedValueOnce([[updatedReport]]); // SELECT after update

    const res = await request(app)
      .put('/api/daily-reports/1')
      .set('Authorization', AUTH_HEADER)
      .send({
        title: '更新后的标题',
        content: '<h2>更新后的内容</h2><p>新增了一些内容</p>',
        mood: '💪',
        tags: ['开发', '测试', '更新'],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('更新后的标题');
    expect(res.body.data.mood).toBe('💪');
    expect(res.body.data.tags).toEqual(['开发', '测试', '更新']);
  });

  it('测试 7: 更新不存在的日报 — 应返回 404', async () => {
    mockExecute.mockResolvedValueOnce([[]]);

    const res = await request(app)
      .put('/api/daily-reports/99999')
      .set('Authorization', AUTH_HEADER)
      .send({
        title: '不存在',
        content: '不存在',
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/not found/i);
  });
});

// ════════════════════════════════════════════════════════════
// Test Suite: Delete Daily Report (DELETE /api/daily-reports/:id)
// ════════════════════════════════════════════════════════════
describe('DELETE /api/daily-reports/:id — 删除日报', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    mockExecute.mockReset();
  });

  it('测试 8: 删除日报 — 应返回 200', async () => {
    mockExecute
      .mockResolvedValueOnce([[{ id: 1 }]]) // SELECT existing
      .mockResolvedValueOnce([{}]); // DELETE

    const res = await request(app)
      .delete('/api/daily-reports/1')
      .set('Authorization', AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('测试 9: 删除不存在的日报 — 应返回 404', async () => {
    mockExecute.mockResolvedValueOnce([[]]);

    const res = await request(app)
      .delete('/api/daily-reports/99999')
      .set('Authorization', AUTH_HEADER);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/not found/i);
  });
});

// ════════════════════════════════════════════════════════════
// Test Suite: Data Validation — 数据验证
// ════════════════════════════════════════════════════════════
describe('数据验证测试', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    mockExecute.mockReset();
  });

  it('测试 10: 特殊字符内容 — 应正确处理', async () => {
    const specialReport = {
      ...sampleReport,
      id: 2,
      date: '2026-06-28',
      title: '特殊字符测试 <>&"',
      content: '<h2>HTML 内容</h2><script>alert(1)</script><p>正常内容</p>',
      mood: '🤔',
      tags: '["特殊<字符>","标签&测试"]',
    };

    mockExecute
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ insertId: 2 }])
      .mockResolvedValueOnce([[specialReport]]);

    const res = await request(app)
      .post('/api/daily-reports')
      .set('Authorization', AUTH_HEADER)
      .send({
        date: '2026-06-28',
        title: '特殊字符测试 <>&"',
        content: '<h2>HTML 内容</h2><script>alert(1)</script><p>正常内容</p>',
        mood: '🤔',
        tags: ['特殊<字符>', '标签&测试'],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('特殊字符测试 <>&"');
    expect(res.body.data.tags).toEqual(['特殊<字符>', '标签&测试']);
  });

  it('测试 11: 超长内容 — 应正确处理', async () => {
    const longContent = '<p>' + 'A'.repeat(10000) + '</p>';
    const longReport = {
      ...sampleReport,
      id: 3,
      date: '2026-06-29',
      title: '超长内容测试',
      content: longContent,
      mood: '🔥',
      tags: '["长内容"]',
    };

    mockExecute
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ insertId: 3 }])
      .mockResolvedValueOnce([[longReport]]);

    const res = await request(app)
      .post('/api/daily-reports')
      .set('Authorization', AUTH_HEADER)
      .send({
        date: '2026-06-29',
        title: '超长内容测试',
        content: longContent,
        mood: '🔥',
        tags: ['长内容'],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.content.length).toBeGreaterThan(10000);
  });
});
