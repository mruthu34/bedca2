# Deployment Guide for Render

This guide explains how to deploy your BED project to Render (or similar cloud platforms).

## Key Changes Made

✅ **Fixed index.js** - Server now binds to `0.0.0.0` instead of just localhost  
✅ **Fixed package.json** - Start script now points to `index.js` (not `app.js`)  
✅ **Database already configured** - Uses environment variables from `.env`  
✅ **Frontend already configured** - Uses relative API paths  

## Steps to Deploy to Render

### 1. **Set Up a Cloud Database (MySQL)**

You have two options:

**Option A: Use Render's MySQL Database**
- Sign up at https://render.com
- Create a new MySQL database
- Copy the connection string

**Option B: Use External MySQL (Planetscale, AWS RDS, etc.)**
- Create a MySQL database on your chosen platform
- Get the connection details (host, user, password, database name)

### 2. **Create a Render Web Service**

1. Go to https://render.com and sign in
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Fill in the settings:
   - **Name**: `your-app-name`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### 3. **Add Environment Variables**

In Render dashboard, go to **Environment** section and add:

```
DB_HOST=your_db_host
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_DATABASE=your_db_name
NODE_ENV=production
```

⚠️ **Important**: Never commit `.env` to Git. Use the platform's environment variables instead.

### 4. **Deploy**

1. Push your code to GitHub (with these changes)
2. Render will automatically build and deploy
3. Your app will be available at: `https://your-app-name.onrender.com`

## Configuration Details

### Server Binding
- **Before**: `app.listen(PORT)` → Only accepts localhost connections
- **After**: `app.listen(PORT, '0.0.0.0')` → Accepts external connections ✓

### Database Connection
Your `db.js` already uses environment variables:
```javascript
host: process.env.DB_HOST
user: process.env.DB_USER
password: process.env.DB_PASSWORD
database: process.env.DB_DATABASE
```

### Frontend API
Your `config.js` uses relative URLs:
```javascript
export const API_BASE = '';
```
This works automatically when frontend and backend are on the same domain ✓

## Testing Locally with .env

1. Create a `.env` file in your project root (it's in `.gitignore`, so it won't be committed):
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_DATABASE=your_db
```

2. Run: `npm run dev`
3. Your app should work normally

## Common Issues

**Issue**: "Cannot connect to database"
- ✓ Check `.env` variables are correct
- ✓ Verify database is running and accessible
- ✓ Check firewall/security group allows connections

**Issue**: "Mixed Content" or CORS errors
- ✓ Frontend and backend are on same domain, so this shouldn't happen
- ✓ If using external API, update CORS in `app.js`

**Issue**: "Port is already in use"
- ✓ On cloud platforms like Render, they assign the PORT automatically
- ✓ Don't hardcode port; always use `process.env.PORT`

## What's Already Working ✓

- Database config uses environment variables
- Frontend serves from same server (no CORS issues)
- API endpoints use relative paths
- PORT is configurable via environment
- Proper error handling in place

You're ready to deploy! Just set up a database and push to GitHub.
