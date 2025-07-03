# 🏆 Module 10: Certification Project - Enterprise PRIMEPRE Deployment

## 🎯 Project Overview

**Congratulations!** You've completed all the foundational DevOps modules. Now it's time to put everything together in a comprehensive, real-world project that demonstrates your mastery of DevOps practices for enterprise logistics systems.

## 🚀 The Challenge: Global PRIMEPRE Expansion

**Scenario**: PRIMEPRE is expanding globally and needs a world-class, enterprise-grade infrastructure that can:

- Handle 10,000+ simultaneous users across 5 continents
- Process 100,000+ shipment transactions per day
- Maintain 99.99% uptime with sub-second response times
- Comply with international data protection regulations
- Scale automatically during peak seasons (Black Friday, Chinese New Year)
- Recover from disasters within 5 minutes

## 📋 Project Requirements

### 🏗️ Infrastructure Requirements

1. **Multi-Cloud Deployment**
   - Primary: AWS (US East)
   - Secondary: Azure (Europe)
   - Tertiary: GCP (Asia-Pacific)

2. **Kubernetes Orchestration**
   - Production clusters in each region
   - Auto-scaling based on traffic
   - Blue-green deployments

3. **Database Architecture**
   - PostgreSQL with read replicas
   - Redis cluster for caching
   - Elasticsearch for search and analytics

4. **Security & Compliance**
   - End-to-end encryption
   - RBAC and network policies
   - SOC 2 compliance ready
   - GDPR compliant data handling

5. **Monitoring & Observability**
   - Full-stack monitoring
   - Distributed tracing
   - Real-time alerting
   - Performance analytics

## 🛠️ Implementation Phases

### Phase 1: Foundation Setup (Week 1)

#### Task 1.1: Infrastructure as Code
Create complete Terraform configurations for all three cloud providers.

```hcl
# File: c:\Users\user\Desktop\PRIMEPRE\devops\terraform\main.tf

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
  
  backend "s3" {
    bucket = "primepre-terraform-state"
    key    = "global/terraform.tfstate"
    region = "us-east-1"
  }
}

# Multi-cloud configuration
module "aws_infrastructure" {
  source = "./modules/aws"
  
  region = "us-east-1"
  environment = "production"
  cluster_name = "primepre-us-east"
  
  # EKS Configuration
  eks_config = {
    version = "1.27"
    node_groups = {
      general = {
        instance_types = ["m5.large", "m5.xlarge"]
        scaling_config = {
          desired_size = 3
          max_size     = 20
          min_size     = 1
        }
      }
      compute = {
        instance_types = ["c5.large", "c5.xlarge"]
        scaling_config = {
          desired_size = 2
          max_size     = 50
          min_size     = 0
        }
      }
    }
  }
  
  # RDS Configuration
  rds_config = {
    engine_version = "14.9"
    instance_class = "db.r5.2xlarge"
    allocated_storage = 1000
    multi_az = true
    backup_retention_period = 30
    backup_window = "03:00-04:00"
    maintenance_window = "sun:04:00-sun:05:00"
  }
  
  # ElastiCache Configuration
  redis_config = {
    node_type = "cache.r6g.large"
    num_cache_nodes = 3
    parameter_group_name = "default.redis7"
  }
}

module "azure_infrastructure" {
  source = "./modules/azure"
  
  location = "West Europe"
  environment = "production"
  cluster_name = "primepre-west-europe"
  
  # AKS Configuration
  aks_config = {
    kubernetes_version = "1.27"
    default_node_pool = {
      vm_size = "Standard_D4s_v3"
      node_count = 3
      max_count = 20
      min_count = 1
    }
  }
  
  # PostgreSQL Configuration
  postgresql_config = {
    sku_name = "GP_Gen5_4"
    storage_mb = 1024000
    backup_retention_days = 30
    geo_redundant_backup_enabled = true
  }
}

module "gcp_infrastructure" {
  source = "./modules/gcp"
  
  region = "asia-east1"
  zone = "asia-east1-a"
  environment = "production"
  cluster_name = "primepre-asia-east"
  
  # GKE Configuration
  gke_config = {
    kubernetes_version = "1.27"
    node_pool = {
      machine_type = "e2-standard-4"
      node_count = 3
      max_node_count = 20
      min_node_count = 1
    }
  }
  
  # Cloud SQL Configuration
  cloudsql_config = {
    database_version = "POSTGRES_14"
    tier = "db-custom-4-16384"
    disk_size = 1000
    backup_enabled = true
  }
}
```

#### Task 1.2: Kubernetes Manifests
Create comprehensive Kubernetes configurations for each environment.

```yaml
# File: c:\Users\user\Desktop\PRIMEPRE\devops\k8s\production\namespace.yaml

apiVersion: v1
kind: Namespace
metadata:
  name: primepre-production
  labels:
    name: primepre-production
    environment: production
    tier: application

---
apiVersion: v1
kind: Namespace
metadata:
  name: primepre-monitoring
  labels:
    name: primepre-monitoring
    environment: production
    tier: monitoring

---
apiVersion: v1
kind: Namespace
metadata:
  name: primepre-ingress
  labels:
    name: primepre-ingress
    environment: production
    tier: infrastructure
```

```yaml
# File: c:\Users\user\Desktop\PRIMEPRE\devops\k8s\production\configmap.yaml

apiVersion: v1
kind: ConfigMap
metadata:
  name: primepre-config
  namespace: primepre-production
data:
  # Application settings
  DEBUG: "false"
  LOG_LEVEL: "INFO"
  ENVIRONMENT: "production"
  
  # Database settings
  DB_POOL_SIZE: "20"
  DB_MAX_OVERFLOW: "30"
  DB_POOL_TIMEOUT: "30"
  
  # Cache settings
  CACHE_TTL: "3600"
  CACHE_KEY_PREFIX: "primepre:prod:"
  
  # Feature flags
  ENABLE_ANALYTICS: "true"
  ENABLE_NOTIFICATIONS: "true"
  ENABLE_RATE_LIMITING: "true"
  
  # External services
  ELASTICSEARCH_URL: "https://elasticsearch.primepre.com:9200"
  REDIS_URL: "redis://redis-cluster.primepre-production.svc.cluster.local:6379"
  
  # Monitoring
  PROMETHEUS_METRICS_ENABLED: "true"
  JAEGER_ENABLED: "true"
  SENTRY_ENVIRONMENT: "production"

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-config
  namespace: primepre-production
data:
  nginx.conf: |
    events {
        worker_connections 1024;
    }
    
    http {
        upstream backend {
            least_conn;
            server primepre-backend:8000 max_fails=3 fail_timeout=30s;
        }
        
        upstream frontend {
            server primepre-frontend:3000;
        }
        
        # Rate limiting
        limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
        limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
        
        server {
            listen 80;
            server_name api.primepre.com;
            
            # Security headers
            add_header X-Frame-Options DENY;
            add_header X-Content-Type-Options nosniff;
            add_header X-XSS-Protection "1; mode=block";
            add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
            
            # API endpoints
            location /api/ {
                limit_req zone=api burst=20 nodelay;
                proxy_pass http://backend;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
                
                # Timeouts
                proxy_connect_timeout 5s;
                proxy_send_timeout 60s;
                proxy_read_timeout 60s;
            }
            
            # Authentication endpoints (stricter rate limiting)
            location /api/auth/ {
                limit_req zone=login burst=5 nodelay;
                proxy_pass http://backend;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
            }
            
            # Health check (no rate limiting)
            location /health/ {
                proxy_pass http://backend;
                access_log off;
            }
            
            # Frontend
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

### Phase 2: Application Optimization (Week 2)

#### Task 2.1: Advanced Django Configuration

```python
# File: c:\Users\user\Desktop\PRIMEPRE\backend\primepre\settings\production.py

import os
from .base import *
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.redis import RedisIntegration

# Security
DEBUG = False
ALLOWED_HOSTS = [
    'api.primepre.com',
    'api-backup.primepre.com',
    '.primepre.com',
    '.elasticbeanstalk.com',
    'localhost',
    '127.0.0.1'
]

# Database optimization
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'primepre_production'),
        'USER': os.getenv('DB_USER', 'primepre'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
        'OPTIONS': {
            'sslmode': 'require',
            'connect_timeout': 10,
            'options': '-c statement_timeout=30000'  # 30 second timeout
        },
        'CONN_MAX_AGE': 600,  # Connection pooling
    },
    'replica': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'primepre_production'),
        'USER': os.getenv('DB_USER', 'primepre'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_REPLICA_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
        'OPTIONS': {
            'sslmode': 'require',
            'connect_timeout': 10,
        },
    }
}

# Database routing for read replicas
DATABASE_ROUTERS = ['primepre.routers.DatabaseRouter']

# Cache configuration with Redis Cluster
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': [
            'redis://redis-node-1:6379/1',
            'redis://redis-node-2:6379/1',
            'redis://redis-node-3:6379/1',
        ],
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.ShardClient',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 50,
                'retry_on_timeout': True,
            },
            'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
            'IGNORE_EXCEPTIONS': True,
        }
    },
    'sessions': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://redis-sessions:6379/2',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Session configuration
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'sessions'
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'

# Static files (CDN)
STATIC_URL = 'https://cdn.primepre.com/static/'
MEDIA_URL = 'https://cdn.primepre.com/media/'

# AWS S3 Configuration
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
STATICFILES_STORAGE = 'storages.backends.s3boto3.StaticS3Boto3Storage'

AWS_STORAGE_BUCKET_NAME = 'primepre-assets'
AWS_S3_REGION_NAME = 'us-east-1'
AWS_S3_CUSTOM_DOMAIN = 'cdn.primepre.com'
AWS_S3_OBJECT_PARAMETERS = {
    'CacheControl': 'max-age=86400',
}

# Logging configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(levelname)s %(asctime)s %(module)s %(process)d %(thread)d %(message)s'
        }
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json',
        },
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/var/log/primepre/django.log',
            'maxBytes': 1024*1024*10,  # 10MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'GoodsRecieved': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Sentry error monitoring
sentry_sdk.init(
    dsn=os.getenv('SENTRY_DSN'),
    integrations=[
        DjangoIntegration(auto_enabling_integrations=False),
        RedisIntegration(),
    ],
    traces_sample_rate=0.1,
    send_default_pii=True,
    environment='production',
)

# Email configuration
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.amazonaws.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')

# Celery configuration for async tasks
CELERY_BROKER_URL = 'redis://redis-celery:6379/0'
CELERY_RESULT_BACKEND = 'redis://redis-celery:6379/0'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'

# Security settings
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True

# CORS configuration
CORS_ALLOWED_ORIGINS = [
    "https://app.primepre.com",
    "https://admin.primepre.com",
    "https://primepre.com",
]

# API rate limiting
REST_FRAMEWORK['DEFAULT_THROTTLE_CLASSES'] = [
    'rest_framework.throttling.AnonRateThrottle',
    'rest_framework.throttling.UserRateThrottle'
]
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
    'anon': '100/hour',
    'user': '1000/hour'
}
```

#### Task 2.2: React Performance Optimization

```javascript
// File: c:\Users\user\Desktop\PRIMEPRE\frontend\src\config\production.js

export const config = {
  api: {
    baseURL: 'https://api.primepre.com',
    timeout: 30000,
    retries: 3,
  },
  cdn: {
    baseURL: 'https://cdn.primepre.com',
  },
  monitoring: {
    sentry: {
      dsn: process.env.REACT_APP_SENTRY_DSN,
      environment: 'production',
      tracesSampleRate: 0.1,
    },
    analytics: {
      googleAnalytics: process.env.REACT_APP_GA_ID,
      hotjar: process.env.REACT_APP_HOTJAR_ID,
    },
  },
  features: {
    enableServiceWorker: true,
    enableAnalytics: true,
    enableErrorBoundary: true,
    enablePerformanceTracking: true,
  },
  cache: {
    strategies: {
      api: 'stale-while-revalidate',
      static: 'cache-first',
      images: 'cache-first',
    },
    ttl: {
      api: 300000, // 5 minutes
      static: 86400000, // 24 hours
      images: 604800000, // 7 days
    },
  },
};
```

### Phase 3: CI/CD Pipeline (Week 3)

#### Task 3.1: Advanced GitHub Actions Workflow

```yaml
# File: c:\Users\user\Desktop\PRIMEPRE\.github\workflows\production-deploy.yml

name: Production Deployment Pipeline

on:
  push:
    branches: [main]
    tags: ['v*']
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        default: 'staging'
        type: choice
        options:
        - staging
        - production

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  security-scan:
    name: Security Scanning
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        format: 'sarif'
        output: 'trivy-results.sarif'
    
    - name: Upload Trivy scan results
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'
    
    - name: OWASP Dependency Check
      uses: dependency-check/Dependency-Check_Action@main
      with:
        project: 'PRIMEPRE'
        path: '.'
        format: 'ALL'
    
    - name: Upload dependency check results
      uses: actions/upload-artifact@v3
      with:
        name: dependency-check-report
        path: reports/

  test-backend:
    name: Backend Tests
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_primepre
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
        cache: 'pip'
    
    - name: Install dependencies
      run: |
        cd backend
        pip install -r requirements.txt
        pip install coverage pytest-cov
    
    - name: Run tests with coverage
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_primepre
        REDIS_URL: redis://localhost:6379/0
      run: |
        cd backend
        python manage.py migrate
        coverage run --source='.' manage.py test
        coverage report --fail-under=80
        coverage xml
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./backend/coverage.xml
    
    - name: Performance tests
      run: |
        cd backend
        python manage.py test --tag=performance

  test-frontend:
    name: Frontend Tests
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
    
    - name: Install dependencies
      run: |
        cd frontend
        npm ci
    
    - name: Run linting
      run: |
        cd frontend
        npm run lint
    
    - name: Run tests
      run: |
        cd frontend
        npm run test:ci
    
    - name: Build application
      run: |
        cd frontend
        npm run build
    
    - name: Upload build artifacts
      uses: actions/upload-artifact@v3
      with:
        name: frontend-build
        path: frontend/dist/

  build-and-push:
    name: Build and Push Images
    needs: [security-scan, test-backend, test-frontend]
    runs-on: ubuntu-latest
    outputs:
      backend-image: ${{ steps.backend-meta.outputs.tags }}
      frontend-image: ${{ steps.frontend-meta.outputs.tags }}
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3
    
    - name: Log in to Container Registry
      uses: docker/login-action@v3
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Extract backend metadata
      id: backend-meta
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/backend
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=semver,pattern={{version}}
          type=semver,pattern={{major}}.{{minor}}
          type=sha,prefix={{branch}}-
    
    - name: Build and push backend image
      uses: docker/build-push-action@v5
      with:
        context: ./backend
        push: true
        tags: ${{ steps.backend-meta.outputs.tags }}
        labels: ${{ steps.backend-meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
    
    - name: Extract frontend metadata
      id: frontend-meta
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/frontend
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=semver,pattern={{version}}
          type=semver,pattern={{major}}.{{minor}}
          type=sha,prefix={{branch}}-
    
    - name: Build and push frontend image
      uses: docker/build-push-action@v5
      with:
        context: ./frontend
        push: true
        tags: ${{ steps.frontend-meta.outputs.tags }}
        labels: ${{ steps.frontend-meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

  deploy-staging:
    name: Deploy to Staging
    needs: build-and-push
    runs-on: ubuntu-latest
    environment: staging
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1
    
    - name: Update kubeconfig
      run: |
        aws eks update-kubeconfig --region us-east-1 --name primepre-staging
    
    - name: Deploy to Kubernetes
      run: |
        cd devops/k8s/staging
        
        # Update image tags
        kustomize edit set image backend=${{ needs.build-and-push.outputs.backend-image }}
        kustomize edit set image frontend=${{ needs.build-and-push.outputs.frontend-image }}
        
        # Apply manifests
        kubectl apply -k .
        
        # Wait for rollout
        kubectl rollout status deployment/primepre-backend -n primepre-staging --timeout=600s
        kubectl rollout status deployment/primepre-frontend -n primepre-staging --timeout=600s
    
    - name: Run smoke tests
      run: |
        # Wait for deployment to be ready
        sleep 30
        
        # Run smoke tests
        ./devops/scripts/smoke-tests.sh staging

  deploy-production:
    name: Deploy to Production
    needs: [build-and-push, deploy-staging]
    runs-on: ubuntu-latest
    environment: production
    if: startsWith(github.ref, 'refs/tags/v') || (github.event_name == 'workflow_dispatch' && github.event.inputs.environment == 'production')
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1
    
    - name: Update kubeconfig for all regions
      run: |
        aws eks update-kubeconfig --region us-east-1 --name primepre-us-east --alias us-east-1
        aws eks update-kubeconfig --region us-west-2 --name primepre-us-west --alias us-west-2
        aws eks update-kubeconfig --region eu-west-1 --name primepre-eu-west --alias eu-west-1
    
    - name: Blue-Green Deployment
      run: |
        ./devops/scripts/blue-green-deploy.sh \
          --backend-image="${{ needs.build-and-push.outputs.backend-image }}" \
          --frontend-image="${{ needs.build-and-push.outputs.frontend-image }}" \
          --regions="us-east-1,us-west-2,eu-west-1"
    
    - name: Run production health checks
      run: |
        ./devops/scripts/production-health-check.sh
    
    - name: Update monitoring dashboards
      run: |
        # Update Grafana dashboards with new deployment info
        python3 devops/scripts/update-dashboards.py \
          --version="${{ github.ref_name }}" \
          --build-id="${{ github.run_id }}"

  post-deployment:
    name: Post-Deployment Tasks
    needs: deploy-production
    runs-on: ubuntu-latest
    if: always()
    
    steps:
    - name: Notify Slack
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        channel: '#deployments'
        text: |
          Production deployment ${{ job.status }}!
          Version: ${{ github.ref_name }}
          Commit: ${{ github.sha }}
          Author: ${{ github.actor }}
      env:
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
    
    - name: Create GitHub release
      if: startsWith(github.ref, 'refs/tags/v')
      uses: actions/create-release@v1
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        tag_name: ${{ github.ref }}
        release_name: Release ${{ github.ref }}
        body: |
          ## Changes in this release
          
          - Backend image: ${{ needs.build-and-push.outputs.backend-image }}
          - Frontend image: ${{ needs.build-and-push.outputs.frontend-image }}
          
          ## Deployment regions
          - US East (Primary)
          - US West (Secondary)
          - EU West (Tertiary)
        draft: false
        prerelease: false
```

### Phase 4: Monitoring & Observability (Week 4)

#### Task 4.1: Comprehensive Monitoring Stack

```yaml
# File: c:\Users\user\Desktop\PRIMEPRE\devops\monitoring\prometheus\values.yaml

prometheus:
  prometheusSpec:
    retention: 30d
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: gp3
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 100Gi
    
    additionalScrapeConfigs:
    - job_name: 'primepre-backend'
      kubernetes_sd_configs:
      - role: endpoints
        namespaces:
          names: ['primepre-production']
      relabel_configs:
      - source_labels: [__meta_kubernetes_service_name]
        action: keep
        regex: primepre-backend
    
    - job_name: 'primepre-frontend'
      kubernetes_sd_configs:
      - role: endpoints
        namespaces:
          names: ['primepre-production']
      relabel_configs:
      - source_labels: [__meta_kubernetes_service_name]
        action: keep
        regex: primepre-frontend
    
    - job_name: 'redis-exporter'
      static_configs:
      - targets: ['redis-exporter:9121']
    
    - job_name: 'postgres-exporter'
      static_configs:
      - targets: ['postgres-exporter:9187']
    
    - job_name: 'nginx-exporter'
      static_configs:
      - targets: ['nginx-exporter:9113']

  alerting:
    alertmanagers:
    - kubernetes_sd_configs:
      - role: pod
        namespaces:
          names: ['primepre-monitoring']

alertmanager:
  config:
    global:
      smtp_smarthost: 'smtp.amazonaws.com:587'
      smtp_from: 'alerts@primepre.com'
    
    route:
      group_by: ['alertname', 'severity']
      group_wait: 10s
      group_interval: 10s
      repeat_interval: 1h
      receiver: 'web.hook'
      routes:
      - match:
          severity: critical
        receiver: 'critical-alerts'
      - match:
          severity: warning
        receiver: 'warning-alerts'
    
    receivers:
    - name: 'web.hook'
      webhook_configs:
      - url: 'http://alertmanager-webhook/alerts'
    
    - name: 'critical-alerts'
      slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#critical-alerts'
        title: '🚨 Critical Alert - PRIMEPRE'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
      pagerduty_configs:
      - routing_key: 'YOUR_PAGERDUTY_KEY'
        description: '{{ .GroupLabels.alertname }}: {{ .GroupLabels.instance }}'
    
    - name: 'warning-alerts'
      slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#alerts'
        title: '⚠️ Warning Alert - PRIMEPRE'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'

grafana:
  adminPassword: 'secure-admin-password'
  ingress:
    enabled: true
    hosts:
    - grafana.primepre.com
    tls:
    - secretName: grafana-tls
      hosts:
      - grafana.primepre.com
  
  dashboardProviders:
    dashboardproviders.yaml:
      apiVersion: 1
      providers:
      - name: 'default'
        orgId: 1
        folder: ''
        type: file
        disableDeletion: false
        editable: true
        options:
          path: /var/lib/grafana/dashboards/default
  
  dashboards:
    default:
      primepre-overview:
        gnetId: 1860
        revision: 27
        datasource: Prometheus
      
      kubernetes-cluster:
        gnetId: 7249
        revision: 1
        datasource: Prometheus
      
      redis-dashboard:
        gnetId: 763
        revision: 4
        datasource: Prometheus
```

### Phase 5: Final Integration & Testing (Week 5)

#### Task 5.1: End-to-End Testing Suite

```python
# File: c:\Users\user\Desktop\PRIMEPRE\tests\e2e\test_production_scenarios.py

import pytest
import requests
import time
import concurrent.futures
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class TestProductionScenarios:
    """End-to-end tests for production environment"""
    
    @pytest.fixture(scope="class")
    def api_client(self):
        """Setup API client with authentication"""
        client = requests.Session()
        
        # Login and get token
        login_response = client.post(
            'https://api.primepre.com/api/auth/login/',
            json={
                'username': 'test@primepre.com',
                'password': 'test-password'
            }
        )
        assert login_response.status_code == 200
        
        token = login_response.json()['token']
        client.headers.update({'Authorization': f'Bearer {token}'})
        
        return client
    
    @pytest.fixture(scope="class")
    def selenium_driver(self):
        """Setup Selenium WebDriver"""
        options = webdriver.ChromeOptions()
        options.add_argument('--headless')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        
        driver = webdriver.Chrome(options=options)
        driver.implicitly_wait(10)
        
        yield driver
        driver.quit()
    
    def test_global_load_balancing(self):
        """Test that requests are properly load balanced across regions"""
        urls = [
            'https://api.primepre.com/health/',
            'https://api-backup.primepre.com/health/',
        ]
        
        response_times = {}
        
        for url in urls:
            start_time = time.time()
            response = requests.get(url, timeout=10)
            end_time = time.time()
            
            assert response.status_code == 200
            response_times[url] = end_time - start_time
        
        # All endpoints should respond within 2 seconds
        for url, response_time in response_times.items():
            assert response_time < 2.0, f"{url} took {response_time:.2f}s"
    
    def test_high_load_scenario(self, api_client):
        """Test system under high concurrent load"""
        def make_request():
            response = api_client.get('/api/goods-received/')
            return response.status_code == 200
        
        # Simulate 100 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
            futures = [executor.submit(make_request) for _ in range(100)]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        # At least 95% of requests should succeed
        success_rate = sum(results) / len(results)
        assert success_rate >= 0.95, f"Success rate was {success_rate:.2%}"
    
    def test_database_failover(self, api_client):
        """Test that read operations continue during database failover"""
        # Make initial request to ensure baseline works
        response = api_client.get('/api/goods-received/')
        assert response.status_code == 200
        
        # Simulate database failover (this would be done by chaos engineering)
        # In real scenario, this would trigger automatic failover
        
        # Continue making requests during failover window
        success_count = 0
        total_requests = 20
        
        for i in range(total_requests):
            try:
                response = api_client.get('/api/goods-received/')
                if response.status_code == 200:
                    success_count += 1
            except requests.exceptions.RequestException:
                pass  # Expected during failover
            
            time.sleep(0.5)  # Small delay between requests
        
        # At least 70% of requests should succeed during failover
        success_rate = success_count / total_requests
        assert success_rate >= 0.70, f"Success rate during failover was {success_rate:.2%}"
    
    def test_cdn_performance(self):
        """Test CDN performance for static assets"""
        static_urls = [
            'https://cdn.primepre.com/static/css/main.css',
            'https://cdn.primepre.com/static/js/main.js',
            'https://cdn.primepre.com/static/images/logo.png',
        ]
        
        for url in static_urls:
            start_time = time.time()
            response = requests.get(url, timeout=5)
            end_time = time.time()
            
            assert response.status_code == 200
            
            # CDN responses should be fast
            response_time = end_time - start_time
            assert response_time < 1.0, f"{url} took {response_time:.2f}s"
            
            # Check for proper caching headers
            assert 'cache-control' in response.headers
            assert 'etag' in response.headers
    
    def test_security_headers(self):
        """Test that security headers are properly set"""
        response = requests.get('https://app.primepre.com/')
        
        required_headers = [
            'strict-transport-security',
            'x-content-type-options',
            'x-frame-options',
            'x-xss-protection',
        ]
        
        for header in required_headers:
            assert header in response.headers, f"Missing security header: {header}"
    
    def test_user_journey_web(self, selenium_driver):
        """Test complete user journey through web interface"""
        driver = selenium_driver
        
        # Navigate to login page
        driver.get('https://app.primepre.com/login')
        
        # Login
        username_field = driver.find_element(By.NAME, 'username')
        password_field = driver.find_element(By.NAME, 'password')
        login_button = driver.find_element(By.TYPE, 'submit')
        
        username_field.send_keys('test@primepre.com')
        password_field.send_keys('test-password')
        login_button.click()
        
        # Wait for dashboard to load
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CLASS_NAME, 'dashboard'))
        )
        
        # Navigate to goods received
        goods_link = driver.find_element(By.LINK_TEXT, 'Goods Received')
        goods_link.click()
        
        # Wait for goods list to load
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CLASS_NAME, 'goods-list'))
        )
        
        # Create new goods record
        new_goods_button = driver.find_element(By.ID, 'new-goods-btn')
        new_goods_button.click()
        
        # Fill form and submit
        # ... (form filling logic)
        
        # Verify success message
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CLASS_NAME, 'success-message'))
        )
        
        success_message = driver.find_element(By.CLASS_NAME, 'success-message')
        assert 'successfully created' in success_message.text.lower()
    
    def test_api_performance_sla(self, api_client):
        """Test that API meets performance SLA requirements"""
        endpoints = [
            '/api/goods-received/',
            '/api/dashboard/stats/',
            '/api/customers/',
            '/api/tracking/',
        ]
        
        for endpoint in endpoints:
            response_times = []
            
            # Make 10 requests to get average response time
            for _ in range(10):
                start_time = time.time()
                response = api_client.get(endpoint)
                end_time = time.time()
                
                assert response.status_code == 200
                response_times.append(end_time - start_time)
            
            avg_response_time = sum(response_times) / len(response_times)
            
            # API SLA: 95th percentile < 500ms
            response_times.sort()
            p95_response_time = response_times[int(0.95 * len(response_times))]
            
            assert avg_response_time < 0.3, f"{endpoint} avg response time: {avg_response_time:.3f}s"
            assert p95_response_time < 0.5, f"{endpoint} p95 response time: {p95_response_time:.3f}s"
    
    def test_monitoring_endpoints(self):
        """Test that monitoring endpoints are working"""
        monitoring_urls = [
            'https://grafana.primepre.com/api/health',
            'https://prometheus.primepre.com/-/healthy',
            'https://alertmanager.primepre.com/-/healthy',
        ]
        
        for url in monitoring_urls:
            response = requests.get(url, timeout=10)
            assert response.status_code == 200

if __name__ == '__main__':
    pytest.main(['-v', '--tb=short'])
```

## 🎯 Certification Requirements

To earn your **PRIMEPRE DevOps Master Certificate**, you must:

### ✅ Technical Deliverables (80 points)

1. **Infrastructure Code** (20 points)
   - [ ] Complete Terraform configurations for 3 cloud providers
   - [ ] Kubernetes manifests for production deployment
   - [ ] Network security policies and RBAC

2. **Application Deployment** (20 points)
   - [ ] Dockerized applications with multi-stage builds
   - [ ] Production-ready configurations
   - [ ] Auto-scaling and load balancing

3. **CI/CD Pipeline** (20 points)
   - [ ] Automated testing and security scanning
   - [ ] Blue-green deployment strategy
   - [ ] Multi-environment deployment pipeline

4. **Monitoring & Observability** (20 points)
   - [ ] Comprehensive monitoring stack
   - [ ] Custom dashboards and alerting
   - [ ] Distributed tracing and logging

### ✅ Documentation & Knowledge Transfer (20 points)

5. **Documentation** (10 points)
   - [ ] Complete runbooks and procedures
   - [ ] Architecture decision records
   - [ ] Incident response playbooks

6. **Knowledge Demonstration** (10 points)
   - [ ] 30-minute technical presentation
   - [ ] Q&A session with senior DevOps engineers
   - [ ] Troubleshooting scenario walkthrough

### 🏆 Bonus Challenges (Extra Credit)

- **Chaos Engineering**: Implement automated failure injection (+5 points)
- **Cost Optimization**: Achieve 30% infrastructure cost reduction (+5 points)
- **Security Excellence**: Pass external security audit (+10 points)
- **Innovation**: Implement cutting-edge DevOps technology (+5 points)

## 📊 Project Evaluation Rubric

| Category | Excellent (4) | Good (3) | Satisfactory (2) | Needs Improvement (1) |
|----------|---------------|----------|------------------|----------------------|
| **Infrastructure** | Multi-cloud, HA, auto-scaling | Cloud-native, scalable | Basic cloud deployment | Manual deployment |
| **Security** | Zero-trust, compliance-ready | Encrypted, monitored | Basic security | Minimal security |
| **Performance** | <100ms p95, 99.99% uptime | <500ms p95, 99.9% uptime | <1s p95, 99% uptime | >1s response time |
| **Automation** | Fully automated, self-healing | Mostly automated | Partially automated | Largely manual |
| **Monitoring** | Proactive, predictive | Comprehensive, alerting | Basic monitoring | Minimal monitoring |

## 🎓 Certification Levels

### 🥉 **Bronze Certification** (60-69 points)
**DevOps Associate**
- Basic infrastructure deployment
- Simple CI/CD pipeline
- Essential monitoring

### 🥈 **Silver Certification** (70-84 points)
**DevOps Professional**
- Production-ready deployment
- Advanced automation
- Comprehensive monitoring

### 🥇 **Gold Certification** (85-100 points)
**DevOps Expert**
- Enterprise-grade solution
- Best practices implementation
- Innovation and excellence

## 📅 Project Timeline

### Week 1: Foundation
- [ ] Set up infrastructure as code
- [ ] Deploy basic Kubernetes clusters
- [ ] Configure networking and security

### Week 2: Application
- [ ] Optimize application configurations
- [ ] Implement caching and performance tuning
- [ ] Set up database replication

### Week 3: Automation
- [ ] Build CI/CD pipelines
- [ ] Implement automated testing
- [ ] Configure blue-green deployments

### Week 4: Observability
- [ ] Deploy monitoring stack
- [ ] Create dashboards and alerts
- [ ] Implement logging and tracing

### Week 5: Validation
- [ ] Run comprehensive tests
- [ ] Conduct security audit
- [ ] Prepare documentation and presentation

## 🚀 Getting Started

1. **Fork the Repository**
   ```bash
   git clone https://github.com/your-username/PRIMEPRE.git
   cd PRIMEPRE
   git checkout -b certification-project
   ```

2. **Set Up Development Environment**
   ```bash
   # Install required tools
   ./devops/scripts/setup-dev-environment.sh
   
   # Configure cloud credentials
   ./devops/scripts/configure-credentials.sh
   ```

3. **Start with Infrastructure**
   ```bash
   cd devops/terraform
   terraform init
   terraform plan
   ```

4. **Track Your Progress**
   ```bash
   # Use the progress tracker
   cp devops/learning/progress-tracker.md my-certification-progress.md
   ```

## 📞 Support & Mentorship

### Office Hours
- **Mondays 2-4 PM EST**: Infrastructure & Cloud
- **Wednesdays 10-12 PM EST**: CI/CD & Automation
- **Fridays 3-5 PM EST**: Monitoring & Troubleshooting

### Community Support
- **Slack**: #primepre-devops-certification
- **Discord**: DevOps Study Group
- **GitHub Discussions**: Technical Q&A

### 1:1 Mentorship
Book a session with our senior DevOps engineers:
- Infrastructure Architecture Review
- Code Review and Best Practices
- Career Guidance and Interview Prep

## 🎉 Certification Benefits

Upon successful completion, you'll receive:

- **Digital Certificate** with verification code
- **LinkedIn Skill Badge** for professional profile
- **Letter of Recommendation** from technical leads
- **Portfolio Project** for job interviews
- **Alumni Network** access for career opportunities
- **Continuing Education** credits for professional development

## 🌟 Success Stories

> *"The PRIMEPRE DevOps certification helped me land a senior DevOps role at a Fortune 500 company. The hands-on project experience was invaluable during interviews."*
> 
> **- Sarah Chen, Senior DevOps Engineer at TechCorp**

> *"This program taught me not just the tools, but the thinking behind enterprise DevOps. I'm now leading our company's cloud transformation."*
> 
> **- Marcus Johnson, DevOps Team Lead at LogisticsPro**

---

## 🎯 Ready to Begin?

**Start your certification journey today!**

1. Review all previous modules (01-09)
2. Set up your development environment
3. Begin Phase 1: Foundation Setup
4. Join our community for support
5. Track your progress daily

**Remember**: This is more than a certification - it's your pathway to becoming a DevOps expert who can architect, deploy, and maintain enterprise-grade logistics systems.

**Good luck, and welcome to the ranks of elite DevOps professionals! 🚀**

---

## 📖 Learning Reflection

**What excites you most about this certification project?**
[Write your response here]

**Which phase do you anticipate being most challenging?**
[Write your response here]

**How will you use this certification in your career?**
[Write your response here]

**What's your target completion date?**
[Write your response here]
