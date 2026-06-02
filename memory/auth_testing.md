# Auth Testing Playbook for Masterliqours

## Step 1: Create Test User & Session

```bash
# Connect to your Supabase database and run:
INSERT INTO users (user_id, email, name, points, tier, role, created_at)
VALUES ('test-user-123', 'test@masterliqours.com', 'Test User', 1000, 'regular', 'customer', NOW());

INSERT INTO user_sessions (session_id, user_id, session_token, expires_at, created_at)
VALUES ('test-session-123', 'test-user-123', 'test_token_12345', NOW() + INTERVAL '7 days', NOW());
```

## Step 2: Test Backend API

```bash
# Test auth endpoint
curl -X GET "https://your-app.com/api/auth/me" \
  -H "Authorization: Bearer test_token_12345"

# Test products endpoint
curl -X GET "https://your-app.com/api/products" \
  -H "Authorization: Bearer test_token_12345"
```

## Step 3: Browser Testing

Set cookie and test in browser:

```javascript
document.cookie = "session_token=test_token_12345; path=/; secure; samesite=none";
```

## Checklist

✅ User document has user_id field (custom UUID)
✅ Session user_id matches user's user_id exactly
✅ API returns user data with user_id field
✅ Dashboard loads without redirect

## Success Indicators

- `/api/auth/me` returns user data
- Dashboard loads without redirect to login
- CRUD operations work

## Failure Indicators

- "User not found" errors
- 401 Unauthorized responses
- Redirect to login page
