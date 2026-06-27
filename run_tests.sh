#!/bin/bash
# Comprehensive API Test Script for daybook-enterprise

BASE="http://localhost:5000"
PASS=0
FAIL=0
TOTAL=0

test_endpoint() {
  local method=$1
  local url=$2
  local expected_status=$3
  local description=$4
  local data=$5
  local auth=$6

  TOTAL=$((TOTAL + 1))

  local cmd="curl -s -o /tmp/test_body.txt -w '%{http_code}' -X $method '$url'"
  if [ -n "$data" ]; then
    cmd="$cmd -H 'Content-Type: application/json' -d '$data'"
  fi
  if [ -n "$auth" ]; then
    cmd="$cmd -H 'Authorization: Bearer $auth'"
  fi

  STATUS=$(eval $cmd)
  BODY=$(cat /tmp/test_body.txt 2>/dev/null)

  if [ "$STATUS" = "$expected_status" ]; then
    echo "✅ PASS [$STATUS] $description"
    PASS=$((PASS + 1))
  else
    echo "❌ FAIL [$STATUS, expected $expected_status] $description"
    echo "   Response: $(echo "$BODY" | head -c 200)"
    FAIL=$((FAIL + 1))
  fi
}

echo "=========================================="
echo "  Daybook Enterprise API Test Suite"
echo "=========================================="
echo ""

# ── 1. Health Check ──
echo "── 1. Health Check ──"
test_endpoint GET "$BASE/api/health" 200 "Health check"

# ── 2. Auth Tests ──
echo ""
echo "── 2. Authentication ──"
test_endpoint POST "$BASE/api/auth/login" 400 "Login without body"
test_endpoint POST "$BASE/api/auth/login" 401 "Login with wrong password" '{"email":"test@test.com","password":"wrong"}'
test_endpoint POST "$BASE/api/auth/login" 200 "Login with valid credentials" '{"email":"1830225455@qq.com","password":"123456"}'

# Extract token
LOGIN_RESP=$(curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"1830225455@qq.com","password":"123456"}')
TOKEN=$(echo "$LOGIN_RESP" | python -c "import sys,json; d=json.load(sys.stdin); print(d['data']['token'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ FATAL: Could not get auth token, aborting tests"
  exit 1
fi
echo "   Token obtained (${#TOKEN} chars)"

test_endpoint GET "$BASE/api/auth/me" 200 "Get current user info" "" "$TOKEN"
test_endpoint GET "$BASE/api/auth/me" 401 "Get user info without token"
test_endpoint POST "$BASE/api/auth/logout" 200 "Logout"

# ── 3. Daily Reports CRUD ──
echo ""
echo "── 3. Daily Reports CRUD ──"
test_endpoint GET "$BASE/api/daily-reports" 200 "List daily reports" "" "$TOKEN"
test_endpoint GET "$BASE/api/daily-reports/stats/summary" 200 "Get report stats" "" "$TOKEN"

# Create a daily report
CREATE_RESP=$(curl -s -X POST "$BASE/api/daily-reports" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"date":"2099-12-31","title":"Test Report","content":"Test content for API testing","tags":["test","api"]}')
CREATE_STATUS=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/daily-reports" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"date":"2099-12-31","title":"Test Report","content":"Test content"}')
echo "$CREATE_STATUS" | grep -q "201" && echo "✅ PASS [201] Create daily report" && PASS=$((PASS+1)) || echo "❌ FAIL Create daily report (status: $CREATE_STATUS)"
TOTAL=$((TOTAL + 1))

# Get the created report ID
REPORT_ID=$(echo "$CREATE_RESP" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id',''))" 2>/dev/null)
echo "   Created report ID: $REPORT_ID"

if [ -n "$REPORT_ID" ]; then
  test_endpoint GET "$BASE/api/daily-reports/$REPORT_ID" 200 "Get single daily report" "" "$TOKEN"
  test_endpoint PUT "$BASE/api/daily-reports/$REPORT_ID" 200 "Update daily report" '{"title":"Updated Title","content":"Updated content"}' "$TOKEN"
  test_endpoint GET "$BASE/api/daily-reports?page=1&limit=5" 200 "List daily reports with pagination" "" "$TOKEN"
  test_endpoint GET "$BASE/api/daily-reports?search=test" 200 "Search daily reports" "" "$TOKEN"
  # Duplicate date should fail
  test_endpoint POST "$BASE/api/daily-reports" 409 "Duplicate date should fail" '{"date":"2099-12-31","content":"dup"}' "$TOKEN"
fi

# ── 4. Weekly Reports ──
echo ""
echo "── 4. Weekly Reports ──"
test_endpoint GET "$BASE/api/weekly-reports" 200 "List weekly reports" "" "$TOKEN"
test_endpoint POST "$BASE/api/weekly-reports" 201 "Create weekly report" '{"weekStart":"2099-12-22","weekEnd":"2099-12-28","summary":"Test week"}' "$TOKEN"

# ── 5. Notes ──
echo ""
echo "── 5. Notes ──"
test_endpoint GET "$BASE/api/notes" 200 "List notes" "" "$TOKEN"
test_endpoint POST "$BASE/api/notes" 201 "Create note" '{"title":"Test Note","content":"Test note content","category":"test"}' "$TOKEN"

# ── 6. Settings ──
echo ""
echo "── 6. Settings ──"
test_endpoint GET "$BASE/api/settings/project-path" 200 "Get project path" "" "$TOKEN"

# ── 7. Git ──
echo ""
echo "── 7. Git Commits ──"
test_endpoint GET "$BASE/api/git/commits" 200 "Get git commits" "" "$TOKEN"

# ── 8. Contribution ──
echo ""
echo "── 8. Contribution ──"
test_endpoint GET "$BASE/api/contribution" 200 "Get contribution data" "" "$TOKEN"

# ── 9. AI Generate ──
echo ""
echo "── 9. AI Git Generate ──"
GEN_STATUS=$(curl -s -o /tmp/test_body.txt -w '%{http_code}' -X POST "$BASE/api/daily-reports/git-generate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "date": "2026-06-26",
    "commits": [
      {"hash": "abc123", "date": "2026-06-26 10:00:00", "message": "feat: 测试功能", "author": "测试"}
    ],
    "ai_config": {
      "baseUrl": "https://token-plan-cn.xiaomimimo.com/v1",
      "apiKey": "tp-c17908v3552cm8caqz5eql1mefzb7ccixq9imcxhpbe2w311",
      "modelId": "mimo-v2.5-pro"
    },
    "style": "detailed"
  }' --max-time 30 2>/dev/null)
TOTAL=$((TOTAL + 1))
echo "   AI Generate status: $GEN_STATUS"
if [ "$GEN_STATUS" = "200" ]; then
  echo "   Response first 200 chars:"
  head -c 200 /tmp/test_body.txt 2>/dev/null
  echo ""
  # Check if it's an SSE stream
  if head -c 50 /tmp/test_body.txt 2>/dev/null | grep -q "data:"; then
    echo "✅ PASS [200] AI Generate (SSE stream received)"
    PASS=$((PASS + 1))
  elif head -c 100 /tmp/test_body.txt 2>/dev/null | grep -q "error\|Error"; then
    echo "❌ FAIL [200] AI Generate - error in response"
    FAIL=$((FAIL + 1))
  else
    echo "✅ PASS [200] AI Generate (got response)"
    PASS=$((PASS + 1))
  fi
else
  echo "❌ FAIL [$GEN_STATUS] AI Generate"
  cat /tmp/test_body.txt 2>/dev/null | head -c 300
  echo ""
  FAIL=$((FAIL + 1))
fi

# ── Cleanup: Delete test report ──
if [ -n "$REPORT_ID" ]; then
  echo ""
  echo "── Cleanup ──"
  test_endpoint DELETE "$BASE/api/daily-reports/$REPORT_ID" 200 "Delete test daily report" "" "$TOKEN"
fi

# ── Summary ──
echo ""
echo "=========================================="
echo "  Test Summary"
echo "=========================================="
echo "  Total: $TOTAL"
echo "  Passed: $PASS"
echo "  Failed: $FAIL"
echo "=========================================="

if [ $FAIL -gt 0 ]; then
  exit 1
fi
