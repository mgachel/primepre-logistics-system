# CORS Fix Deployment Instructions

## Problem
The frontend is still trying to connect to the old backend URL `https://primepre-logistics-backend.herokuapp.com` instead of `https://primepre-logistics-backend-fb2561752d16.herokuapp.com`.

## Solution Steps

### 1. Backend (Already Fixed)
✅ Updated `settings.py` with:
- `CORS_ALLOW_ALL_ORIGINS = True` (temporarily for immediate fix)
- Correct URLs in `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`
- Proper ALLOWED_HOSTS configuration

### 2. Frontend Environment Variables (Already Fixed)
✅ Updated `.env` files with correct backend URL:
```
VITE_API_BASE_URL=https://primepre-logistics-backend-fb2561752d16.herokuapp.com
```

### 3. Heroku Deployment (REQUIRED)

#### For Frontend App:
1. Go to your Heroku dashboard for the frontend app
2. Settings → Config Vars → Add:
   ```
   VITE_API_BASE_URL = https://primepre-logistics-backend-fb2561752d16.herokuapp.com
   ```
3. Deploy → Manual Deploy → Deploy Branch (or push to trigger auto-deploy)

#### For Backend App:
1. Go to your Heroku dashboard for the backend app  
2. Settings → Config Vars → Add/Update:
   ```
   CORS_ALLOW_ALL_ORIGINS = true
   ```
3. Deploy the updated settings

### 4. Local Testing
Run these commands to test locally:
```bash
# Frontend
cd frontend
npm run build
npm run preview

# Backend  
cd ..
python manage.py runserver 8000
```

### 5. Verification
After deployment, the CORS error should be resolved. You can verify by:
1. Opening browser dev tools → Network tab
2. Attempting login from frontend
3. Check that the request goes to the correct backend URL
4. Verify response includes `Access-Control-Allow-Origin` header

## Files Modified
- ✅ `frontend/.env`
- ✅ `frontend/.env.production`
- ✅ `frontend/.env.local`
- ✅ `primepre/settings.py`

## Next Steps
1. **Deploy backend** with updated settings
2. **Set environment variable** in Heroku frontend config
3. **Deploy frontend** to rebuild with correct URL
4. **Test login** - should work without CORS errors
