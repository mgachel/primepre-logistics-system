# 🚀 Prime Pre Logistics - Setup Guide

## Quick Start

### 1. Install Backend Dependencies
```bash
cd backend
npm install
# or
bun install
```

### 2. Start the Backend Server
```bash
cd backend
npm run dev
# or
bun run dev
```

The backend will start on `http://localhost:3001`

### 3. Start the Frontend (in a new terminal)
```bash
# In the root directory
npm run dev
# or
bun dev
```

The frontend will start on `http://localhost:5173`

### 4. Login to the Application
- Go to `http://localhost:5173/login`
- Use credentials:
  - **Username**: `admin`
  - **Password**: `password`

## 🔧 What's Included

### Backend Features
- ✅ JWT Authentication
- ✅ Cargo Management (Sea & Air)
- ✅ Client Management
- ✅ Dashboard Statistics
- ✅ Admin User Management
- ✅ Notifications
- ✅ Pagination & Filtering

### Frontend Features
- ✅ Real-time Dashboard
- ✅ Sea Cargo Management
- ✅ Air Cargo Management
- ✅ Client Management
- ✅ Admin Panel
- ✅ Notifications
- ✅ Responsive Design

## 📊 Sample Data

The backend includes realistic sample data:
- **3 Cargo Items** (2 sea, 1 air)
- **2 Clients** with full details
- **Dashboard Statistics** with realistic numbers
- **Notifications** for system alerts
- **Admin Users** and roles

## 🧪 Testing the API

### Health Check
```bash
curl http://localhost:3001/api/health
```

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'
```

### Get Cargo (with token)
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/cargo
```

## 🔄 Development Workflow

1. **Backend**: Make changes to `backend/server.js`
2. **Frontend**: Make changes to React components
3. **Test**: Both servers auto-restart on file changes
4. **API**: All endpoints are documented in `backend/README.md`

## 🚀 Next Steps

### For Production
1. **Database**: Replace in-memory arrays with MongoDB/PostgreSQL
2. **Security**: Implement proper JWT secrets and validation
3. **Environment**: Use environment variables for configuration
4. **Deployment**: Deploy to cloud platform (Vercel, Heroku, etc.)

### For Development
1. **Add More Data**: Extend the sample data arrays
2. **New Endpoints**: Add more API endpoints as needed
3. **Features**: Implement additional frontend features
4. **Testing**: Add unit tests for both frontend and backend

## 📁 Project Structure

```
prime/
├── src/                 # Frontend React app
├── backend/             # Express.js backend
│   ├── package.json
│   ├── server.js
│   └── README.md
├── setup.md            # This file
└── README.md           # Main documentation
```

## 🆘 Troubleshooting

### Backend Issues
- **Port 3001 in use**: Change PORT in `backend/server.js`
- **Dependencies**: Run `npm install` in backend directory
- **CORS errors**: Backend has CORS enabled for all origins

### Frontend Issues
- **API connection**: Check `VITE_API_BASE_URL` environment variable
- **Build errors**: Clear node_modules and reinstall
- **Login issues**: Verify backend is running on port 3001

### Common Commands
```bash
# Restart backend
cd backend && npm run dev

# Restart frontend
npm run dev

# Check if backend is running
curl http://localhost:3001/api/health

# Clear browser cache
# Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
```

---

**🎉 You're all set!** The application is now running with a real backend API and you can test all the features. 