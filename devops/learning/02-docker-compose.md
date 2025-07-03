# 🐳 Module 02: Docker Compose - Orchestrating PRIMEPRE Services

## 🎯 Learning Objectives

By the end of this module, you will:
- Understand Docker Compose and service orchestration
- Create a complete multi-service PRIMEPRE environment
- Manage environment-specific configurations
- Handle data persistence and networking
- Debug multi-container applications

## 📚 Part 1: Understanding Docker Compose (20 minutes)

### Why Docker Compose?

Remember our logistics analogy? Managing one container is like managing one shipping container. But PRIMEPRE is a complete logistics operation with multiple moving parts:

```
🏭 PRIMEPRE LOGISTICS SYSTEM
┌─────────────────────────────────────────────────────────┐
│ Frontend (React)    │ Backend (Django)    │ Database     │
│ ├── User Interface  │ ├── API Endpoints   │ ├── User Data│
│ ├── Dashboard       │ ├── Business Logic  │ ├── Goods    │
│ └── Forms          │ └── Authentication  │ └── Analytics│
└─────────────────────────────────────────────────────────┘
         ↕                       ↕                    ↕
    Port 3000               Port 8000            Port 5432
```

Docker Compose lets us:
- **Define** all services in one file
- **Start** everything with one command
- **Connect** services automatically
- **Share** configurations easily

### Core Docker Compose Concepts

1. **Services** - Different parts of your application (frontend, backend, database)
2. **Networks** - How services communicate
3. **Volumes** - Persistent data storage
4. **Environment** - Configuration management

## 💻 Part 2: Hands-On - Complete PRIMEPRE Setup (60 minutes)

### Step 1: Create the Master Docker Compose File

Create `c:\Users\user\Desktop\PRIMEPRE\docker-compose.yml`:

```yaml
version: '3.8'

services:
  # PostgreSQL Database - The heart of PRIMEPRE data
  database:
    image: postgres:15-alpine
    container_name: primepre-database
    environment:
      POSTGRES_DB: primepre
      POSTGRES_USER: primepre_user
      POSTGRES_PASSWORD: primepre_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    networks:
      - primepre-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U primepre_user -d primepre"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Redis Cache - For high-performance logistics operations
  redis:
    image: redis:7-alpine
    container_name: primepre-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - primepre-network
    command: redis-server --appendonly yes

  # Django Backend - PRIMEPRE API and business logic
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: primepre-backend
    environment:
      - DEBUG=True
      - DATABASE_URL=postgresql://primepre_user:primepre_password@database:5432/primepre
      - REDIS_URL=redis://redis:6379/0
      - SECRET_KEY=your-super-secret-key-for-development
      - ALLOWED_HOSTS=localhost,127.0.0.1,backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
      - media_files:/app/media
      - static_files:/app/static
    depends_on:
      database:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - primepre-network
    command: >
      sh -c "python manage.py migrate &&
             python manage.py collectstatic --noinput &&
             python manage.py runserver 0.0.0.0:8000"

  # React Frontend - PRIMEPRE User Interface
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: primepre-frontend
    environment:
      - REACT_APP_API_URL=http://localhost:8000/api
      - REACT_APP_ENVIRONMENT=development
    ports:
      - "3000:80"
    depends_on:
      - backend
    networks:
      - primepre-network
    volumes:
      - ./frontend/src:/app/src:ro  # Read-only for live development

  # Nginx Proxy - Production-like setup
  nginx:
    image: nginx:alpine
    container_name: primepre-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./devops/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - static_files:/var/www/static:ro
      - media_files:/var/www/media:ro
    depends_on:
      - frontend
      - backend
    networks:
      - primepre-network

# Named volumes for data persistence
volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  media_files:
    driver: local
  static_files:
    driver: local

# Custom network for service communication
networks:
  primepre-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### Step 2: Update Backend Dockerfile for Production

Update `backend/Dockerfile`:

```dockerfile
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        curl \
        && rm -rf /var/lib/apt/lists/*

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Copy and install Python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . /app/

# Create directories for static and media files
RUN mkdir -p /app/static /app/media

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Health check for the Django application
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health/ || exit 1

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
```

### Step 3: Create Production Nginx Configuration

Create `devops/nginx/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Gzip compression for better performance
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Upstream backend servers
    upstream backend {
        server backend:8000;
    }

    upstream frontend {
        server frontend:80;
    }

    # Main server block
    server {
        listen 80;
        server_name localhost;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";

        # API requests to Django backend
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeouts for logistics operations
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Admin panel
        location /admin/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Static files (Django)
        location /static/ {
            alias /var/www/static/;
            expires 30d;
            add_header Cache-Control "public, immutable";
        }

        # Media files (uploaded content)
        location /media/ {
            alias /var/www/media/;
            expires 7d;
        }

        # Frontend application
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### Step 4: Environment Configuration

Create `.env` file in the root directory:

```env
# Database Configuration
POSTGRES_DB=primepre
POSTGRES_USER=primepre_user
POSTGRES_PASSWORD=primepre_secure_password_2025

# Django Configuration
DEBUG=True
SECRET_KEY=your-super-secret-key-change-in-production
ALLOWED_HOSTS=localhost,127.0.0.1,backend,primepre.com

# Redis Configuration
REDIS_URL=redis://redis:6379/0

# Frontend Configuration
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_ENVIRONMENT=development
```

### Step 5: Launch Your Complete PRIMEPRE System

```bash
# Navigate to the PRIMEPRE root directory
cd c:\Users\user\Desktop\PRIMEPRE

# Start the entire system
docker-compose up -d

# Watch the logs (optional)
docker-compose logs -f

# Check status of all services
docker-compose ps
```

### Step 6: Development vs Production Configurations

Create `docker-compose.prod.yml` for production overrides:

```yaml
version: '3.8'

services:
  database:
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}  # From environment variables
    volumes:
      - postgres_data:/var/lib/postgresql/data
    # Remove port exposure for security
    ports: []

  backend:
    environment:
      - DEBUG=False
      - SECRET_KEY=${SECRET_KEY}
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@database:5432/${POSTGRES_DB}
    # Use gunicorn for production
    command: >
      sh -c "python manage.py migrate &&
             python manage.py collectstatic --noinput &&
             gunicorn primepre.wsgi:application --bind 0.0.0.0:8000 --workers 4"

  frontend:
    environment:
      - REACT_APP_API_URL=https://api.primepre.com/api
      - REACT_APP_ENVIRONMENT=production

  nginx:
    # In production, use SSL
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./devops/nginx/nginx.prod.conf:/etc/nginx/nginx.conf:ro
      - ./devops/ssl:/etc/ssl/certs:ro

volumes:
  postgres_data:
    driver: local

networks:
  primepre-network:
    driver: bridge
```

## 🧪 Part 3: Practice Exercises (30 minutes)

### Exercise 1: Service Management
```bash
# Start specific services
docker-compose up database redis

# Scale services (for load testing)
docker-compose up --scale backend=3

# Stop and remove everything
docker-compose down

# Stop and remove with volumes (careful!)
docker-compose down -v
```

### Exercise 2: Debugging Multi-Container Apps
```bash
# View logs for specific service
docker-compose logs backend

# Follow logs in real-time
docker-compose logs -f frontend

# Execute commands in running services
docker-compose exec backend python manage.py shell
docker-compose exec database psql -U primepre_user -d primepre

# Check service health
docker-compose ps
```

### Exercise 3: Data Persistence Testing
```bash
# Create some test data
docker-compose exec backend python manage.py loaddata fixtures/sample_data.json

# Stop containers
docker-compose down

# Start again - data should persist
docker-compose up -d

# Verify data is still there
docker-compose exec backend python manage.py shell
```

## 📝 Part 4: Reflection and Documentation (10 minutes)

### What You've Accomplished Today:

1. **Multi-Service Orchestration**
   - Frontend, Backend, Database, Cache, Proxy
   - Service communication and networking
   - Health checks and dependencies

2. **Production-Ready Configuration**
   - Environment-specific setups
   - Volume management for data persistence
   - Nginx proxy for performance

3. **DevOps Best Practices**
   - Infrastructure as Code (docker-compose.yml)
   - Environment variable management
   - Service scaling and debugging

### Key Commands to Master:
```bash
docker-compose up -d              # Start all services in background
docker-compose down               # Stop and remove containers
docker-compose ps                 # Show service status
docker-compose logs [service]     # View service logs
docker-compose exec [service] cmd # Execute commands in service
docker-compose build [service]    # Rebuild specific service
```

## 🚀 Tomorrow's Preview

In Module 03, we'll learn:
- Kubernetes fundamentals
- Deploying PRIMEPRE to a Kubernetes cluster
- Service discovery and load balancing
- ConfigMaps and Secrets management

## 🎯 Challenge Exercise (Optional)

Enhance your setup by adding:
1. **Monitoring** - Add Prometheus and Grafana containers
2. **Logging** - Add ELK stack (Elasticsearch, Logstash, Kibana)
3. **Testing** - Add a testing service that runs your test suite

## 🆘 Troubleshooting

### Common Issues:

**Q: Services can't connect to each other**
A: Check network configuration and service names in docker-compose.yml

**Q: Database connection refused**
A: Wait for database health check to pass: `docker-compose logs database`

**Q: Port conflicts**
A: Change port mappings: `"8001:8000"` instead of `"8000:8000"`

**Q: Volume permission errors**
A: Ensure proper user permissions in Dockerfiles

**Q: Frontend can't reach backend API**
A: Check REACT_APP_API_URL environment variable

---

**🎉 Congratulations on Module 02!**

You now have a complete, orchestrated logistics system running in containers. This is enterprise-level DevOps that many companies struggle to implement correctly.

**Ready for Kubernetes?** 👉 [Module 03: Kubernetes Fundamentals](./03-kubernetes-basics.md)
