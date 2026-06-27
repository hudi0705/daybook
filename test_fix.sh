#!/bin/bash
# Login and get token
RESP=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"1830225455@qq.com","password":"123456"}')

echo "Login response: $RESP"

# Extract token using grep/sed (no python dependency)
TOKEN=$(echo "$RESP" | grep -o '"token": *"[^"]*"' | sed 's/"token": *"//;s/"$//')
echo "Token: ${TOKEN:0:30}..."

# Test git-generate
echo ""
echo "=== Testing git-generate ==="
curl -s -w "\nHTTP_CODE:%{http_code}\n" -X POST http://localhost:5000/api/daily-reports/git-generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer *** \
  -d '{"date":"2026-06-26","commits":[{"hash":"test123","date":"2026-06-26 10:00:00","message":"feat: test feature","author":"test"}],"ai_config":{"baseUrl":"https://token-plan-cn.xiaomimimo.com/v1","apiKey":"tp-c17908v3552cm8caqz5eql1mefzb7ccixq9imcxhpbe2w311","modelId":"mimo-v2.5-pro"},"style":"detailed"}'
