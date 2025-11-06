# Quick Start: Creating Superuser on Render Free Tier

## 🚀 Fast Setup (3 Steps)

### Step 1: Set Environment Variable in Render
```
SETUP_SECRET_KEY=your-random-secret-here-abc123xyz
```
> Generate a random string at https://www.uuidgenerator.net/

### Step 2: Call the Setup Endpoint

**Using curl:**
```bash
curl -X POST https://your-backend.onrender.com/api/auth/initial-setup/ \
  -H "Content-Type: application/json" \
  -d '{
    "secret_key": "your-random-secret-here-abc123xyz",
    "phone": "0501234567",
    "password": "YourSecurePass123!",
    "email": "admin@example.com",
    "first_name": "Admin",
    "last_name": "User"
  }'
```

**Using the Web Interface:**
1. Open: `https://your-frontend.onrender.com/superuser-setup.html`
2. Fill in the form
3. Click "Create Superuser"

**Using Browser Console:**
```javascript
fetch('https://your-backend.onrender.com/api/auth/initial-setup/', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    secret_key: 'your-random-secret-here-abc123xyz',
    phone: '0501234567',
    password: 'YourSecurePass123!',
    email: 'admin@example.com',
    first_name: 'Admin',
    last_name: 'User'
  })
}).then(r => r.json()).then(console.log);
```

### Step 3: Remove the Secret Key
⚠️ **IMPORTANT**: Go back to Render and delete or change `SETUP_SECRET_KEY`

---

## ✅ Success Response
```json
{
  "success": true,
  "message": "Superuser created successfully",
  "user": {
    "phone": "0501234567",
    "email": "admin@example.com",
    "name": "Admin User",
    "role": "SUPER_ADMIN"
  }
}
```

---

## 🔑 Login After Setup

1. Go to: `https://your-frontend.onrender.com/login`
2. Phone: `0501234567`
3. Password: `YourSecurePass123!`
4. You'll be redirected to the admin dashboard

---

## 🛠️ Troubleshooting

### "Setup endpoint is not configured"
→ Add `SETUP_SECRET_KEY` to Render environment variables

### "Invalid secret key"
→ Make sure the secret_key in your request matches the env variable exactly

### "User already exists"
→ The endpoint will upgrade them to superuser automatically

### Still having issues?
→ Check Render logs for detailed error messages

---

## 📚 More Details

See `SUPERUSER_SETUP.md` for complete documentation

## 🎯 Files Created

- `SUPERUSER_SETUP.md` - Full documentation
- `frontend/public/superuser-setup.html` - Web interface
- `users/management/commands/create_initial_superuser.py` - Django command
- `CHANGES_SUMMARY.md` - All changes made
