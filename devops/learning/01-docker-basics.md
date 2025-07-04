# 🐳 Module 01: Docker Fundamentals for PRIMEPRE

## 🎯 Learning Objectives

By the end of this module, you will:
- Understand what Docker is and why it's essential for logistics systems
- Create Docker containers for your PRIMEPRE backend and frontend
- Build multi-stage Docker images for production
- Understand Docker networking and volumes
- Run your complete PRIMEPRE system in containers

## 📚 Part 1: Understanding Docker (20 minutes)

### What is Docker and Why Do We Need It?

Imagine you're shipping goods from China to Ghana (like PRIMEPRE does). You need:
- **Consistent packaging** - goods arrive the same way they were sent
- **Isolation** - one shipment doesn't affect another
- **Portability** - works in any port or warehouse
- **Efficiency** - optimal use of container space

Docker does the same thing for your software:

```
🏭 TRADITIONAL DEPLOYMENT          🐳 DOCKER DEPLOYMENT
┌─────────────────────────┐       ┌─────────────────────────┐
│ Server 1 (Ubuntu)       │       │ Any Server              │
│ ├── Python 3.9          │       │ ├── Docker Engine       │
│ ├── Node.js 18          │       │ │   ├── Python Container │
│ ├── PostgreSQL          │       │ │   ├── Node.js Container│
│ └── Your App            │       │ │   ├── Database Container│
├─────────────────────────┤       │ │   └── Your App        │
│ Server 2 (CentOS)       │  VS   └─────────────────────────┘
│ ├── Python 3.11 ❌      │       ┌─────────────────────────┐
│ ├── Node.js 16 ❌       │       │ Production Server       │
│ ├── MySQL ❌            │       │ ├── Docker Engine       │
│ └── Broken App ❌       │       │ │   ├── Same Containers  │
└─────────────────────────┘       │ │   └── Works Perfectly ✅│
                                  └─────────────────────────┘
```

### Key Docker Concepts

1. **Image** - Blueprint (like architectural plans for a warehouse)
2. **Container** - Running instance (the actual warehouse)
3. **Dockerfile** - Instructions to build the image
4. **Registry** - Storage for images (like DockerHub)

## 💻 Part 2: Hands-On - Dockerizing PRIMEPRE Backend (60 minutes)

### Step 1: Create Backend Dockerfile

Let's create a Dockerfile for your Django backend:

```dockerfile
# This is our blueprint for the PRIMEPRE backend container
# Save this as: c:\Users\user\Desktop\PRIMEPRE\backend\Dockerfile

# Start with Python 3.11 on slim Linux (smaller, faster)
FROM python:3.11-slim

# Set environment variables for Python
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory inside container
WORKDIR /app

# Install system dependencies (like preparing warehouse infrastructure)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (Docker optimization - layers!)
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire Django project
COPY . /app/

# Create a non-root user for security (good practice!)
RUN adduser --disabled-password --gecos '' appuser \
    && chown -R appuser:appuser /app
USER appuser

# Expose port 8000 (Django default)
EXPOSE 8000

# Command to run when container starts
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
```

### Step 2: Create Frontend Dockerfile

Now for your React frontend:

```dockerfile
# Save as: c:\Users\user\Desktop\PRIMEPRE\frontend\Dockerfile

# Multi-stage build - Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code and build
COPY . .
RUN npm run build

# Production stage - Nginx to serve the built app
FROM nginx:alpine

# Copy built app from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config (we'll create this)
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Step 3: Create Nginx Configuration

Create `frontend/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # Handle React Router
        location / {
            try_files $uri $uri/ /index.html;
        }

        # API proxy to backend
        location /api/ {
            proxy_pass http://backend:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

### Step 4: Build Your First Container

Open your terminal and navigate to the backend directory:

```bash
# Navigate to PRIMEPRE backend
cd c:\Users\user\Desktop\PRIMEPRE\backend

# Build the Docker image
docker build -t primepre-backend:latest .

# See your newly created image
docker images

# Run your backend container
docker run -p 8000:8000 primepre-backend:latest
```

🎉 **Congratulations!** Your Django backend is now running in a container!

### Step 5: Build Frontend Container

```bash
# Navigate to frontend
cd c:\Users\user\Desktop\PRIMEPRE\frontend

# Build frontend image
docker build -t primepre-frontend:latest .

# Run frontend container
docker run -p 3000:80 primepre-frontend:latest
```

## 🧪 Part 3: Practice Exercises (30 minutes)

### Exercise 1: Container Inspection
```bash
# List running containers
docker ps

# Inspect your backend container
docker inspect [container-id]

# View logs
docker logs [container-id]

# Execute commands inside running container
docker exec -it [container-id] bash
```

### Exercise 2: Environment Variables
Modify your backend Dockerfile to accept environment variables:

```dockerfile
# Add these environment variables to your Dockerfile
ENV DEBUG=False
ENV DATABASE_URL=sqlite:///db.sqlite3
ENV SECRET_KEY=your-secret-key-here

# You can override these when running:
# docker run -e DEBUG=True -e SECRET_KEY=new-key primepre-backend
```

### Exercise 3: Volume Mounting
```bash
# Mount your local code directory to the container
docker run -p 8000:8000 \
  -v c:\Users\user\Desktop\PRIMEPRE\backend:/app \
  primepre-backend:latest

# Now changes to your local files will reflect in the container!
```

## 📝 Part 4: Reflection and Documentation (10 minutes)

### What You've Learned Today:

1. **Docker Fundamentals**
   - Images vs Containers
   - Dockerfile structure
   - Building and running containers

2. **PRIMEPRE Containerization**
   - Backend Django container
   - Frontend React container with Nginx
   - Multi-stage builds for optimization

3. **Best Practices**
   - Non-root users for security
   - Layer optimization
   - Environment variable management

### Key Commands to Remember:
```bash
docker build -t name:tag .          # Build image
docker run -p host:container image  # Run container
docker ps                          # List running containers
docker images                      # List images
docker logs [container-id]         # View logs
docker exec -it [container-id] bash # Enter container
```

## 🚀 Tomorrow's Preview

In Module 02, we'll learn:
- Docker Compose for multi-service applications
- Connecting your backend, frontend, and database
- Environment-specific configurations
- Network communication between containers

## 🎯 Challenge Exercise (Optional)

Try to:
1. Add a PostgreSQL database container
2. Connect your Django backend to it
3. Make all three services communicate

Don't worry if you get stuck - we'll cover this properly in Module 02!

## 🆘 Troubleshooting

### Common Issues:

**Q: "docker: command not found"**
A: Install Docker Desktop from docker.com

**Q: Port already in use**
A: Use different ports: `-p 8001:8000` instead of `-p 8000:8000`

**Q: Container exits immediately**
A: Check logs with `docker logs [container-id]`

**Q: Can't access the application**
A: Make sure you're using `0.0.0.0:8000` not `127.0.0.1:8000` in Django

---

**🎉 Congratulations on completing Module 01!**

You've just containerized an enterprise logistics system. That's a significant achievement that many senior developers struggle with. Tomorrow, we'll connect everything together with Docker Compose.

**Ready for Module 02?** 👉 [Docker Compose for PRIMEPRE](./02-docker-compose.md)
