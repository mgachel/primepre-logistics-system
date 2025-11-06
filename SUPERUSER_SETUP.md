# Creating a Superuser on Render Free Tier

Since Render's free tier doesn't provide shell access, we've created two methods to create an initial superuser.

## Method 1: Using the One-Time Setup Endpoint (Recommended for Render)

### Step 1: Set Environment Variable in Render

1. Go to your Render dashboard
2. Navigate to your service → Environment
3. Add a new environment variable:
   - **Key**: `SETUP_SECRET_KEY`
   - **Value**: Generate a secure random string (e.g., use https://www.uuidgenerator.net/)
   - Example: `SETUP_SECRET_KEY=abc123xyz789-your-secret-key`

4. Save and wait for your service to redeploy

### Step 2: Call the Setup Endpoint

Use curl, Postman, or any HTTP client to make a POST request:

```bash
curl -X POST https://your-app.onrender.com/api/auth/initial-setup/ \
  -H "Content-Type: application/json" \
  -d '{
    "secret_key": "abc123xyz789-your-secret-key",
    "phone": "1234567890",
    "password": "YourSecurePassword123!",
    "email": "admin@example.com",
    "first_name": "Super",
    "last_name": "Admin"
  }'
```

**Or using JavaScript/Browser Console:**

```javascript
fetch('https://your-app.onrender.com/api/auth/initial-setup/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    secret_key: 'abc123xyz789-your-secret-key',
    phone: '1234567890',
    password: 'YourSecurePassword123!',
    email: 'admin@example.com',
    first_name: 'Super',
    last_name: 'Admin'
  })
})
.then(response => response.json())
.then(data => console.log(data));
```

### Step 3: Verify and Secure

1. After successful creation, **immediately remove or change the `SETUP_SECRET_KEY`** environment variable
2. This prevents anyone else from using this endpoint
3. The endpoint will return an error if `SETUP_SECRET_KEY` is not set

### Response Examples

**Success Response:**
```json
{
  "success": true,
  "message": "Superuser created successfully",
  "user": {
    "phone": "1234567890",
    "email": "admin@example.com",
    "name": "Super Admin",
    "role": "SUPER_ADMIN"
  }
}
```

**Already Exists (Upgraded):**
```json
{
  "success": true,
  "message": "User 1234567890 upgraded to superuser",
  "user": {
    "phone": "1234567890",
    "email": "admin@example.com",
    "name": "Super Admin",
    "role": "SUPER_ADMIN"
  }
}
```

**Error Response (Invalid Secret):**
```json
{
  "success": false,
  "error": "Invalid secret key"
}
```

## Method 2: Using Environment Variables + Management Command

If Render allows you to run one-time commands during deployment:

### Step 1: Set Environment Variables

Add these to your Render environment:
```
SUPERUSER_PHONE=1234567890
SUPERUSER_PASSWORD=YourSecurePassword123!
SUPERUSER_EMAIL=admin@example.com
SUPERUSER_FIRST_NAME=Super
SUPERUSER_LAST_NAME=Admin
```

### Step 2: Add to Build/Deploy Script

If you have access to a build command or start script, add:

```bash
python manage.py create_initial_superuser
```

Or in your `start.sh`:
```bash
#!/bin/bash
python manage.py migrate
python manage.py create_initial_superuser || true  # Continue even if it fails
gunicorn primepre.wsgi:application
```

## Security Notes

⚠️ **Important Security Considerations:**

1. **Remove the secret key** after creating your superuser
2. The setup endpoint is **one-time use only** - once a superuser exists, it won't create another
3. Use a **strong, unique password** for your superuser
4. The secret key should be **treated like a password** - don't commit it to git
5. Consider **disabling the endpoint** entirely after initial setup by removing `SETUP_SECRET_KEY`

## Testing Locally

You can test this locally before deploying to Render:

```bash
# Set environment variable
export SETUP_SECRET_KEY="test-secret-123"

# Start your Django server
python manage.py runserver

# In another terminal, make the request
curl -X POST http://localhost:8000/api/auth/initial-setup/ \
  -H "Content-Type: application/json" \
  -d '{
    "secret_key": "test-secret-123",
    "phone": "1234567890",
    "password": "TestPassword123!",
    "email": "test@example.com",
    "first_name": "Test",
    "last_name": "Admin"
  }'
```

## Troubleshooting

### "Setup endpoint is not configured"
- The `SETUP_SECRET_KEY` environment variable is not set
- Solution: Add it in Render's environment variables

### "Invalid secret key"
- The secret key in your request doesn't match the environment variable
- Solution: Double-check the value matches exactly

### "User already exists"
- A user with that phone number already exists
- The endpoint will upgrade them to superuser if they aren't already

### "Failed to create superuser"
- Check the server logs in Render for the specific error
- Common causes: database connection issues, invalid phone format

## After Creating Your Superuser

1. Login at: `https://your-app.onrender.com/login`
2. Use the phone number and password you set
3. You should be redirected to the admin dashboard
4. Go to Settings or My Admins to create additional admin users

## Alternative: Django Admin Panel

Once you have a superuser, you can also use Django's built-in admin panel:

1. Visit: `https://your-app.onrender.com/admin/`
2. Login with your superuser credentials (phone as username)
3. Manage users, view data, etc.
