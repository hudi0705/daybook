#!/bin/bash
export TOKEN=$(cat /tmp/user_token.txt | tr -d "
")
URL="http://localhost:5000/api/daily-reports/git-generate"
echo "=== SSE Stream Test ==="
curl -s -N --max-time 60 -X POST "$URL" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"date":"2026-06-26","commits":[{"hash":"s1","date":"2026-06-26 10:00:00","message":"feat: test stream","author":"test"}],"ai_config":{"baseUrl":"https://token-plan-cn.xiaomimimo.com/v1","apiKey":"tp-c17908v3552cm8caqz5eql1mefzb7ccixq9imcxhpbe2w311","modelId":"mimo-v2.5-pro"},"style":"detailed"}' 2>/dev/null | head -c 2000
echo ""
echo "=== Stream Test Done ==="
