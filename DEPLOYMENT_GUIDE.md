# Complete Heroku Deployment Guide

## Step 1: Deploy Backend Changes

### 1.1 Add and Commit Changes
```bash
# From project root
cd "C:\Users\user\Desktop\PRIMEMADE logistics\primepre-logistics-system"
git add .
git commit -m "Fix CORS configuration for production"
```

### 1.2 Deploy to Backend Heroku App
```bash
# Push to your backend Heroku remote
git push heroku main
```

### 1.3 Set Environment Variables for Backend
```bash
# Set CORS to allow all origins (temporary fix)
heroku config:set CORS_ALLOW_ALL_ORIGINS=true --app primepre-logistics-backend-fb2561752d16

# Verify the config
heroku config --app primepre-logistics-backend-fb2561752d16
```

## Step 2: Deploy Frontend Changes

### 2.1 Navigate to Frontend and Check Status
```bash
cd frontend
git add .
git commit -m "Update API base URL to correct backend"
```

### 2.2 Set Environment Variables for Frontend
```bash
# Set the correct backend URL
heroku config:set VITE_API_BASE_URL=https://primepre-logistics-backend-fb2561752d16.herokuapp.com --app primepre-frontend-ba6f55cc48e5

# Verify the config
heroku config --app primepre-frontend-ba6f55cc48e5
```

### 2.3 Deploy Frontend to Heroku
```bash
# Push to frontend Heroku remote (assuming separate repo/remote)
git push frontend-heroku main
```

## Step 3: Alternative if Single Repository

If both apps deploy from the same repository:

### 3.1 Deploy Backend
```bash
# From project root
git push heroku-backend main
```

### 3.2 Deploy Frontend (using subtree)
```bash
# Deploy frontend subdirectory
git subtree push --prefix=frontend heroku-frontend main
```

## Step 4: Verification

### 4.1 Check Backend Health
```bash
# Test backend API
curl -X OPTIONS https://primepre-logistics-backend-fb2561752d16.herokuapp.com/api/auth/login/
```

### 4.2 Check Frontend Environment
```bash
# Check if frontend has correct environment
heroku config --app primepre-frontend-ba6f55cc48e5
```

### 4.3 Test Login
- Open https://primepre-frontend-ba6f55cc48e5.herokuapp.com
- Try to login
- Check browser console - should see no CORS errors

## Troubleshooting

### If deployment fails:
```bash
# Check logs
heroku logs --tail --app primepre-logistics-backend-fb2561752d16
heroku logs --tail --app primepre-frontend-ba6f55cc48e5
```

### If CORS still fails:
```bash
# Ensure environment variable is set
heroku config:get CORS_ALLOW_ALL_ORIGINS --app primepre-logistics-backend-fb2561752d16
```
