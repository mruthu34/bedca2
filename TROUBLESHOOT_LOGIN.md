# Login/Register Troubleshooting

## Common Issues on Render

### Issue 1: Database Connection Failed ❌
The most common problem - environment variables not set or database unreachable.

**Check on Render:**
1. Go to your Render Web Service dashboard
2. Click **Environment** tab
3. Verify these variables are set exactly:
   ```
   DB_HOST=your_mysql_host
   DB_USER=your_mysql_user
   DB_PASSWORD=your_mysql_password
   DB_DATABASE=your_mysql_database_name
   ```

4. Check if database is accessible:
   - Is the database running?
   - Is the firewall allowing connections from Render's IP?
   - Are credentials correct?

### Issue 2: Database Tables Not Created ❌
If database connected but tables missing.

**Solution:**
1. Check Render logs - if `initTables.js` ran, you should see:
   ```
   Creating CA1 tables...
   ```
   in the startup logs

2. If NOT there, the database connection failed

3. To manually fix:
   - Connect to your database directly
   - Run these SQL commands:
   ```sql
   CREATE TABLE IF NOT EXISTS User (
     user_id INT AUTO_INCREMENT PRIMARY KEY,
     username VARCHAR(255) UNIQUE NOT NULL,
     email VARCHAR(255) UNIQUE,
     password VARCHAR(255),
     points INT DEFAULT 0,
     inventory_capacity INT NOT NULL DEFAULT 20
   );
   ```

### Issue 3: Check Browser Console for Errors ⚠️

1. Go to your live URL (e.g., `https://your-app.onrender.com`)
2. Open DevTools: **F12** → **Console** tab
3. Look for errors like:
   - `404 /login` → Route not working
   - `500 Internal Server Error` → Backend error
   - CORS errors → Check `app.js` middleware

### Issue 4: Check Render Logs 📋

1. Go to your Render dashboard
2. Click **Logs** tab
3. Look for any error messages during startup
4. Search for "Error" or "FATAL"

Common error patterns:
- `Error: connect ECONNREFUSED` → Can't reach database
- `Error: ER_ACCESS_DENIED_FOR_USER` → Wrong credentials
- `Cannot find module` → Missing package

## Quick Diagnosis Steps

### Step 1: Verify environment variables
```bash
# On Render, check that these work:
# (Add these as debug endpoints)
```

### Step 2: Test database connection
The `initTables.js` runs on startup. If you don't see "Creating CA1 tables..." in logs, database isn't connecting.

### Step 3: Check API endpoints manually
Try these in your browser or Postman:

**Test register (should work even if DB fails gracefully):**
```
POST https://your-app.onrender.com/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@gmail.com",
  "password": "password123"
}
```

**Expected responses:**
- 500 error with message = database connection issue
- 400 error = validation failed
- 201 success = working!

## Most Likely Fix

**99% of the time, it's one of these:**

1. **Missing environment variables** on Render
   - Set DB_HOST, DB_USER, DB_PASSWORD, DB_DATABASE
   - Restart your service

2. **Database not running** or wrong credentials
   - Verify database is active
   - Test credentials work locally first

3. **Database firewall blocking Render**
   - For cloud databases, add Render's IP to allowlist
   - For local database, it won't work (Render can't reach it)

## Testing Locally Before Deploying

If you haven't tested locally yet:

```bash
# 1. Create .env file
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_DATABASE=your_db_name

# 2. Make sure local MySQL is running
# 3. npm install
# 4. npm run dev
# 5. Try register/login at http://localhost:3000
```

## Next Steps

1. **Check Render logs** first - this will tell you if DB is connecting
2. **Verify environment variables** are set correctly
3. **Test a manual API call** using Postman to `/register` endpoint
4. Let me know what error message you see

---

**Need help?** Share:
- Screenshot of Render Environment variables
- Error message from browser console (F12)
- Error message from Render logs
