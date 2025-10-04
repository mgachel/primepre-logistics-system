# Delete Unverified Users - Admin Utility

This utility allows you to delete all unverified users from your production database on Render (free tier) without needing shell access.

## 🚀 How to Use on Render

### Option 1: Using the HTML Page (Easiest)

1. **Deploy the changes** to Render (push your code)

2. **Access the cleanup page** at:
   ```
   https://your-frontend-url.onrender.com/admin-cleanup.html
   ```

3. **Before using**, update the API URL in the HTML file:
   - Open `frontend/public/admin-cleanup.html`
   - Find this line (around line 195):
     ```javascript
     const API_BASE_URL = window.location.hostname === 'localhost' 
         ? 'http://localhost:8000' 
         : 'https://your-backend-url.onrender.com';
     ```
   - Replace `your-backend-url.onrender.com` with your actual Render backend URL

4. **Steps to delete users**:
   - Enter your admin email/phone
   - Enter your admin password
   - Click "Check Count" to see how many unverified users exist
   - Click "Delete All" to permanently delete them
   - Confirm the deletion

### Option 2: Using API Directly (cURL/Postman)

#### Step 1: Login as Admin
```bash
curl -X POST https://your-backend-url.onrender.com/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email_or_phone": "your-admin-email@example.com",
    "password": "your-admin-password"
  }'
```

Save the `access` token from the response.

#### Step 2: Check Unverified User Count
```bash
curl -X GET https://your-backend-url.onrender.com/api/auth/admin/delete-unverified/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Step 3: Delete Unverified Users
```bash
curl -X POST https://your-backend-url.onrender.com/api/auth/admin/delete-unverified/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Option 3: Using Browser Console

1. Open your deployed frontend site
2. Login as admin
3. Open browser console (F12)
4. Run this JavaScript:

```javascript
// Check count
fetch('https://your-backend-url.onrender.com/api/auth/admin/delete-unverified/', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('access_token')
  }
})
.then(r => r.json())
.then(console.log);

// Delete all (after confirming count)
fetch('https://your-backend-url.onrender.com/api/auth/admin/delete-unverified/', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('access_token')
  }
})
.then(r => r.json())
.then(console.log);
```

## 🔐 Security

- ✅ Requires admin authentication (ADMIN or SUPER_ADMIN role)
- ✅ POST request required for deletion (prevents accidental deletion via GET)
- ✅ Returns count before deletion for verification
- ✅ Logs all deletion actions with admin identifier

## 📝 API Endpoints

### GET /api/auth/admin/delete-unverified/
**Purpose**: Check count of unverified users (preview)

**Response**:
```json
{
  "success": true,
  "unverified_count": 4568,
  "message": "Found 4568 unverified users"
}
```

### POST /api/auth/admin/delete-unverified/
**Purpose**: Delete all unverified users

**Response**:
```json
{
  "success": true,
  "message": "Successfully deleted 4568 unverified users",
  "deleted_count": 4568
}
```

## ⚠️ Important Notes

1. **This action is irreversible** - Once deleted, users cannot be recovered
2. **Only affects unverified users** - Verified users are not touched
3. **Requires admin privileges** - Regular customers cannot access this endpoint
4. **Logs all actions** - All deletion operations are logged for audit purposes

## 🧪 Testing Locally

Before deploying to production, test locally:

```bash
# Start Django server
cd primepre-logistics-system
python manage.py runserver

# In another terminal, test the endpoint
# 1. Login as admin
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email_or_phone": "admin@example.com", "password": "your-password"}'

# 2. Check count
curl -X GET http://localhost:8000/api/auth/admin/delete-unverified/ \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Delete (if desired)
curl -X POST http://localhost:8000/api/auth/admin/delete-unverified/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🎯 Use Cases

- Clean up test data before production launch
- Remove unverified signups after verification period expires
- Database maintenance and optimization
- Prepare for fresh customer data upload via Excel

## 📊 What Gets Deleted

Only users with:
- `is_verified = False`
- Any user role (typically customers)
- All associated data is preserved (due to foreign key constraints)

## 🔄 After Deletion

After deleting unverified users:
1. Upload fresh customer data via Excel
2. All new customers will have:
   - `is_verified = True`
   - Password = `PrimeMade`
   - Can login immediately
   - Can change password from profile

---

**Created**: October 2025
**Last Updated**: October 4, 2025
