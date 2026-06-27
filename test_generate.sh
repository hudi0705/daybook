#!/bin/bash
# Test script for AI daily report generation

TOKEN_FILE="/tmp/user_token.txt"
TOKEN=$(cat "$TOKEN_FILE" | tr -d '\n')
URL="http://localhost:5000/api/daily-reports/git-generate"

echo "=== 1. Test API Connection ==="
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" -X GET https://token-plan-cn.xiaomimimo.com/v1/models -H "Authorization: Bearer tp-c17908v3552cm8caqz5eql1mefzb7ccixq9imcxhpbe2w311"

echo ""
echo "=== 2. Login Test ==="
LOGIN_RESP=$(curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"1830225455@qq.com","password":"123456"}')
echo "$LOGIN_RESP"
echo ""

echo "=== 3. Test Detailed Style ==="
RESULT=$(curl -s --max-time 120 -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"date":"2026-06-26","commits":[{"hash":"abc123","date":"2026-06-26 10:00:00","message":"feat: 添加用户登录功能","author":"张三"},{"hash":"def456","date":"2026-06-26 11:00:00","message":"fix: 修复首页加载慢的问题","author":"李四"}],"ai_config":{"baseUrl":"https://token-plan-cn.xiaomimimo.com/v1","apiKey":"tp-c17908v3552cm8caqz5eql1mefzb7ccixq9imcxhpbe2w311","modelId":"mimo-v2.5-pro"},"style":"detailed"}')
echo "Size: ${#RESULT} bytes"
echo "$RESULT" | head -c 500
echo ""
echo ""

echo "=== 4. Test Concise Style ==="
RESULT=$(curl -s --max-time 120 -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"date":"2026-06-26","commits":[{"hash":"abc123","date":"2026-06-26 10:00:00","message":"feat: 添加用户登录功能","author":"张三"},{"hash":"def456","date":"2026-06-26 11:00:00","message":"fix: 修复首页加载慢的问题","author":"李四"}],"ai_config":{"baseUrl":"https://token-plan-cn.xiaomimimo.com/v1","apiKey":"tp-c17908v3552cm8caqz5eql1mefzb7ccixq9imcxhpbe2w311","modelId":"mimo-v2.5-pro"},"style":"concise"}')
echo "Size: ${#RESULT} bytes"
echo "$RESULT" | head -c 500
echo ""
echo ""

echo "=== 5. Test Technical Style ==="
RESULT=$(curl -s --max-time 120 -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"date":"2026-06-26","commits":[{"hash":"abc123","date":"2026-06-26 10:00:00","message":"feat: 添加用户登录功能","author":"张三"},{"hash":"def456","date":"2026-06-26 11:00:00","message":"fix: 修复首页加载慢的问题","author":"李四"}],"ai_config":{"baseUrl":"https://token-plan-cn.xiaomimimo.com/v1","apiKey":"tp-c17908v3552cm8caqz5eql1mefzb7ccixq9imcxhpbe2w311","modelId":"mimo-v2.5-pro"},"style":"technical"}')
echo "Size: ${#RESULT} bytes"
echo "$RESULT" | head -c 500
echo ""
echo ""

echo "=== 6. Test Report Style ==="
RESULT=$(curl -s --max-time 120 -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"date":"2026-06-26","commits":[{"hash":"abc123","date":"2026-06-26 10:00:00","message":"feat: 添加用户登录功能","author":"张三"},{"hash":"def456","date":"2026-06-26 11:00:00","message":"fix: 修复首页加载慢的问题","author":"李四"}],"ai_config":{"baseUrl":"https://token-plan-cn.xiaomimimo.com/v1","apiKey":"tp-c17908v3552cm8caqz5eql1mefzb7ccixq9imcxhpbe2w311","modelId":"mimo-v2.5-pro"},"style":"report"}')
echo "Size: ${#RESULT} bytes"
echo "$RESULT" | head -c 500
echo ""
echo ""

echo "=== 7. Test SSE Stream Headers ==="
curl -s -D /tmp/headers.txt --max-time 120 -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"date":"2026-06-26","commits":[{"hash":"abc123","date":"2026-06-26 10:00:00","message":"feat: 添加用户登录功能","author":"张三"}],"ai_config":{"baseUrl":"https://token-plan-cn.xiaomimimo.com/v1","apiKey":"tp-c17908v3552cm8caqz5eql1mefzb7ccixq9imcxhpbe2w311","modelId":"mimo-v2.5-pro"},"style":"detailed"}' > /dev/null 2>&1
echo "Response Headers:"
cat /tmp/headers.txt
echo ""

echo "=== 8. Test Error Cases ==="
echo "--- Missing date ---"
ERR=$(curl -s --max-time 10 -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"commits":[{"hash":"a","date":"2026-06-26","message":"test","author":"t"}],"ai_config":{"baseUrl":"https://token-plan-cn.xiaomimimo.com/v1","apiKey":"tp-c17908v3552cm8caqz5eql1mefzb7ccixq9imcxhpbe2w311","modelId":"mimo-v2.5-pro"}}')
echo "$ERR"

echo "--- Missing commits ---"
ERR=$(curl -s --max-time 10 -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"date":"2026-06-26","ai_config":{"baseUrl":"https://token-plan-cn.xiaomimimo.com/v1","apiKey":"tp-c17908v3552cm8caqz5eql1mefzb7ccixq9imcxhpbe2w311","modelId":"mimo-v2.5-pro"}}')
echo "$ERR"

echo "--- Missing ai_config ---"
ERR=$(curl -s --max-time 10 -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"date":"2026-06-26","commits":[{"hash":"a","date":"2026-06-26","message":"test","author":"t"}]}')
echo "$ERR"

echo "--- Wrong model ---"
ERR=$(curl -s --max-time 30 -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"date":"2026-06-26","commits":[{"hash":"a","date":"2026-06-26","message":"test","author":"t"}],"ai_config":{"baseUrl":"https://token-plan-cn.xiaomimimo.com/v1","apiKey":"tp-c17908v3552cm8caqz5eql1mefzb7ccixq9imcxhpbe2w311","modelId":"nonexistent-model"}}')
echo "$ERR"

echo ""
echo "=== ALL TESTS COMPLETE ==="
