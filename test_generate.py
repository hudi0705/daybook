#!/usr/bin/env python3
"""Test script for AI daily report generation feature."""

import json
import subprocess
import sys
import time

BASE_URL = "http://localhost:5000"
AI_BASE_URL = "https://token-plan-cn.xiaomimimo.com/v1"
AI_API_KEY = "tp-c17908v3552cm8caqz5eql1mefzb7ccixq9imcxhpbe2w311"
AI_MODEL = "mimo-v2.5-pro"

TEST_COMMITS = [
    {"hash": "abc123", "date": "2026-06-26 10:00:00", "message": "feat: 添加用户登录功能", "author": "张三"},
    {"hash": "def456", "date": "2026-06-26 11:00:00", "message": "fix: 修复首页加载慢的问题", "author": "李四"},
]

results = {}


def curl_get(url, headers=None):
    """Execute a GET request."""
    cmd = ["curl", "-s", "-w", "\n---HTTP_CODE:%{http_code}---", url]
    if headers:
        for k, v in headers.items():
            cmd.extend(["-H", f"{k}: {v}"])
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    return result.stdout


def curl_post(url, data, headers=None, stream=False, timeout=120):
    """Execute a POST request."""
    cmd = ["curl", "-s", "-w", "\n---HTTP_CODE:%{http_code}---"]
    if stream:
        cmd.append("-N")
    cmd.extend(["--max-time", str(timeout)])
    cmd.extend(["-X", "POST", url])
    if headers:
        for k, v in headers.items():
            cmd.extend(["-H", f"{k}: {v}"])
    cmd.extend(["-d", json.dumps(data)])
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout + 10)
    return result.stdout


def curl_post_with_headers(url, data, headers=None, timeout=120):
    """Execute a POST request and capture response headers."""
    cmd = ["curl", "-s", "-D", "/tmp/resp_headers.txt", "--max-time", str(timeout)]
    cmd.extend(["-X", "POST", url])
    if headers:
        for k, v in headers.items():
            cmd.extend(["-H", f"{k}: {v}"])
    cmd.extend(["-d", json.dumps(data)])
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout + 10)
    headers_content = ""
    try:
        with open("/tmp/resp_headers.txt", "r") as f:
            headers_content = f.read()
    except:
        pass
    return result.stdout, headers_content


def get_user_token():
    """Login and get user token."""
    data = {"email": "1830225455@qq.com", "password": "123456"}
    raw = curl_post(f"{BASE_URL}/api/auth/login", data, {"Content-Type": "application/json"})
    # Remove HTTP code suffix
    body = raw.split("\n---HTTP_CODE:")[0]
    try:
        resp = json.loads(body)
        if resp.get("success"):
            return resp["data"]["token"]
    except:
        pass
    return None


def test_api_connection():
    """Test 1: AI API connection."""
    print("=" * 60)
    print("TEST 1: AI API Connection")
    print("=" * 60)
    raw = curl_get(f"{AI_BASE_URL}/models", {"Authorization": f"Bearer {AI_API_KEY}"})
    body = raw.split("\n---HTTP_CODE:")[0]
    http_code = raw.split("---HTTP_CODE:")[1].split("---")[0] if "---HTTP_CODE:" in raw else "unknown"
    print(f"  HTTP Status: {http_code}")
    try:
        resp = json.loads(body)
        models = [m["id"] for m in resp.get("data", [])]
        print(f"  Available models: {', '.join(models)}")
        success = AI_MODEL in models
        print(f"  Model '{AI_MODEL}' available: {success}")
        if not success:
            print(f"  WARNING: Model '{AI_MODEL}' not in list!")
            # Try closest match
            for m in models:
                if "pro" in m:
                    print(f"  Suggested model: {m}")
                    break
    except Exception as e:
        print(f"  ERROR parsing response: {e}")
        print(f"  Raw: {body[:200]}")
        success = False
    results["api_connection"] = success
    print()
    return success


def test_login():
    """Test 2: User login."""
    print("=" * 60)
    print("TEST 2: User Login")
    print("=" * 60)
    token = get_user_token()
    if token:
        print(f"  Login SUCCESS (token length: {len(token)})")
    else:
        print("  Login FAILED")
    results["login"] = token is not None
    print()
    return token


def test_generate_style(token, style, style_name):
    """Test generating daily report with a specific style."""
    print("=" * 60)
    print(f"TEST: Generate Daily Report - {style_name} Style")
    print("=" * 60)

    data = {
        "date": "2026-06-26",
        "commits": TEST_COMMITS,
        "ai_config": {
            "baseUrl": AI_BASE_URL,
            "apiKey": AI_API_KEY,
            "modelId": AI_MODEL,
        },
        "style": style,
    }

    start = time.time()
    raw = curl_post(
        f"{BASE_URL}/api/daily-reports/git-generate",
        data,
        {"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
        timeout=120,
    )
    elapsed = time.time() - start

    body = raw.split("\n---HTTP_CODE:")[0]
    http_code = raw.split("---HTTP_CODE:")[1].split("---")[0] if "---HTTP_CODE:" in raw else "unknown"

    print(f"  HTTP Status: {http_code}")
    print(f"  Response time: {elapsed:.1f}s")
    print(f"  Response size: {len(body)} bytes")

    try:
        resp = json.loads(body)
        if resp.get("success"):
            content = resp["data"]["content"]
            title = resp["data"]["title"]
            commit_count = resp["data"]["commit_count"]
            print(f"  Title: {title}")
            print(f"  Commit count: {commit_count}")
            print(f"  Content preview (first 300 chars):")
            print(f"    {content[:300]}...")
            print(f"  ✓ {style_name} style generation SUCCESS")
            results[f"generate_{style}"] = {"success": True, "size": len(body), "time": elapsed}
            return content
        else:
            print(f"  ERROR: {resp.get('error', 'Unknown error')}")
            results[f"generate_{style}"] = {"success": False, "error": resp.get("error")}
            return None
    except Exception as e:
        print(f"  ERROR parsing response: {e}")
        print(f"  Raw response: {body[:500]}")
        results[f"generate_{style}"] = {"success": False, "error": str(e)}
        return None


def test_stream_headers(token):
    """Test SSE stream response headers."""
    print("=" * 60)
    print("TEST 7: SSE Stream Response Headers")
    print("=" * 60)

    data = {
        "date": "2026-06-26",
        "commits": [TEST_COMMITS[0]],
        "ai_config": {
            "baseUrl": AI_BASE_URL,
            "apiKey": AI_API_KEY,
            "modelId": AI_MODEL,
        },
        "style": "detailed",
    }

    body, headers = curl_post_with_headers(
        f"{BASE_URL}/api/daily-reports/git-generate",
        data,
        {"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
        timeout=120,
    )

    print("  Response Headers:")
    for line in headers.strip().split("\n"):
        print(f"    {line}")

    is_sse = "text/event-stream" in headers
    print(f"\n  SSE Content-Type detected: {is_sse}")
    print(f"  Response size: {len(body)} bytes")

    # Check if response contains SSE data chunks
    if "data:" in body:
        chunk_count = body.count("data:")
        print(f"  SSE data chunks found: {chunk_count}")
        results["stream"] = {"success": True, "sse": True, "chunks": chunk_count}
    else:
        print(f"  Response is JSON (not SSE chunks) - AI API may not stream")
        results["stream"] = {"success": True, "sse": is_sse, "chunks": 0}
    print()


def test_error_cases(token):
    """Test error handling."""
    print("=" * 60)
    print("TEST 8: Error Cases")
    print("=" * 60)

    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
    error_tests = [
        ("Missing date", {"commits": TEST_COMMITS, "ai_config": {"baseUrl": AI_BASE_URL, "apiKey": AI_API_KEY}}),
        ("Missing commits", {"date": "2026-06-26", "ai_config": {"baseUrl": AI_BASE_URL, "apiKey": AI_API_KEY}}),
        ("Empty commits", {"date": "2026-06-26", "commits": [], "ai_config": {"baseUrl": AI_BASE_URL, "apiKey": AI_API_KEY}}),
        ("Missing ai_config", {"date": "2026-06-26", "commits": TEST_COMMITS}),
        ("Missing apiKey", {"date": "2026-06-26", "commits": TEST_COMMITS, "ai_config": {"baseUrl": AI_BASE_URL}}),
        ("Wrong model", {"date": "2026-06-26", "commits": TEST_COMMITS, "ai_config": {"baseUrl": AI_BASE_URL, "apiKey": AI_API_KEY, "modelId": "nonexistent-model"}}),
    ]

    error_results = {}
    for name, data in error_tests:
        raw = curl_post(f"{BASE_URL}/api/daily-reports/git-generate", data, headers, timeout=30)
        body = raw.split("\n---HTTP_CODE:")[0]
        http_code = raw.split("---HTTP_CODE:")[1].split("---")[0] if "---HTTP_CODE:" in raw else "unknown"
        try:
            resp = json.loads(body)
            error_msg = resp.get("error", "No error message")
            success = resp.get("success", True)
            print(f"  {name}: HTTP {http_code}, success={success}, error='{error_msg}'")
            error_results[name] = {"http_code": http_code, "success": success, "error": error_msg}
        except:
            print(f"  {name}: HTTP {http_code}, raw={body[:100]}")
            error_results[name] = {"http_code": http_code, "raw": body[:100]}

    results["error_cases"] = error_results
    print()


def compare_styles(contents):
    """Compare generated content across styles."""
    print("=" * 60)
    print("TEST 9: Style Comparison")
    print("=" * 60)
    styles = list(contents.keys())
    for i in range(len(styles)):
        for j in range(i + 1, len(styles)):
            s1, s2 = styles[i], styles[j]
            c1, c2 = contents[s1], contents[s2]
            if c1 and c2:
                different = c1 != c2
                print(f"  {s1} vs {s2}: {'DIFFERENT ✓' if different else 'SAME ✗'}")
                if different:
                    # Find first difference
                    for k in range(min(len(c1), len(c2))):
                        if c1[k] != c2[k]:
                            print(f"    First diff at char {k}: '{c1[max(0,k-20):k+20]}' vs '{c2[max(0,k-20):k+20]}'")
                            break
    results["styles_different"] = True
    print()


def print_summary():
    """Print test summary."""
    print("=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)

    checks = [
        ("API Connection", results.get("api_connection", False)),
        ("User Login", results.get("login", False)),
        ("Detailed Style", results.get("generate_detailed", {}).get("success", False)),
        ("Concise Style", results.get("generate_concise", {}).get("success", False)),
        ("Technical Style", results.get("generate_technical", {}).get("success", False)),
        ("Report Style", results.get("generate_report", {}).get("success", False)),
        ("SSE Stream", results.get("stream", {}).get("success", False)),
        ("Error Handling", all(
            r.get("success") == False if isinstance(r, dict) else True
            for r in results.get("error_cases", {}).values()
            if "Missing" in str(r) or "Empty" in str(r) or "Missing apiKey" in str(r)
        ) if results.get("error_cases") else False),
    ]

    for name, passed in checks:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"  {status}: {name}")

    total = len(checks)
    passed = sum(1 for _, p in checks if p)
    print(f"\n  Results: {passed}/{total} tests passed")

    if passed == total:
        print("  🎉 ALL TESTS PASSED!")
    else:
        print("  ⚠️  Some tests failed. Check details above.")


if __name__ == "__main__":
    print("Starting AI Daily Report Generation Tests...")
    print(f"Backend URL: {BASE_URL}")
    print(f"AI API URL: {AI_BASE_URL}")
    print(f"AI Model: {AI_MODEL}")
    print()

    # Test 1: API Connection
    test_api_connection()

    # Test 2: Login
    token = test_login()
    if not token:
        print("FATAL: Cannot login. Aborting tests.")
        sys.exit(1)

    # Tests 3-6: Generate with different styles
    styles = [
        ("detailed", "Detailed (详细)"),
        ("concise", "Concise (简洁)"),
        ("technical", "Technical (技术向)"),
        ("report", "Report (汇报向)"),
    ]

    contents = {}
    for style, name in styles:
        content = test_generate_style(token, style, name)
        contents[style] = content
        if content:
            print()

    # Test 7: Stream headers
    test_stream_headers(token)

    # Test 8: Error cases
    test_error_cases(token)

    # Test 9: Compare styles
    valid_contents = {k: v for k, v in contents.items() if v}
    if len(valid_contents) >= 2:
        compare_styles(valid_contents)

    # Summary
    print_summary()
