# 🔄 Module 04: CI/CD with GitHub Actions - Automating PRIMEPRE

## 🎯 Learning Objectives

By the end of this module, you will:
- Understand CI/CD principles and benefits
- Create automated testing and deployment pipelines
- Implement security scanning and quality gates
- Deploy to multiple environments automatically
- Monitor deployment health and rollback capabilities

## 📚 Part 1: Understanding CI/CD (20 minutes)

### What is CI/CD and Why is it Critical for Logistics?

In logistics, timing is everything. A delayed shipment can cost thousands. Similarly, in software:

```
🚛 TRADITIONAL DEPLOYMENT        🚀 CI/CD DEPLOYMENT

Week 1: Developer codes          ┌─────────────────────────┐
Week 2: Manual testing          │ Commit Code             │
Week 3: Deploy to staging       │ ↓ (2 minutes)           │
Week 4: Fix bugs found          │ Automated Tests         │
Week 5: Deploy to production    │ ↓ (3 minutes)           │
Week 6: Production issues! 🔥    │ Security Scans          │
                                │ ↓ (2 minutes)           │
Result: 6 weeks, high risk      │ Deploy to Staging       │
                                │ ↓ (5 minutes)           │
                                │ Deploy to Production    │
                                │ ↓ (5 minutes)           │
                                │ Monitor & Validate      │
                                └─────────────────────────┘
                                Result: 15 minutes, low risk
```

### CI/CD for PRIMEPRE Benefits

1. **Faster Delivery** - Deploy features multiple times per day
2. **Higher Quality** - Automated testing catches bugs early
3. **Reduced Risk** - Small, frequent changes are easier to debug
4. **Team Productivity** - Developers focus on coding, not deployment
5. **Customer Satisfaction** - Bugs fixed quickly, features delivered fast

### Our CI/CD Pipeline Architecture

```
🏗️ PRIMEPRE CI/CD PIPELINE

Developer Push → GitHub → Actions Runner → Multiple Environments

┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Source    │  │   Build     │  │    Test     │  │   Deploy    │
│             │  │             │  │             │  │             │
│ ├─ Code     │→ │ ├─ Backend  │→ │ ├─ Unit     │→ │ ├─ Dev      │
│ ├─ Tests    │  │ ├─ Frontend │  │ ├─ API      │  │ ├─ Staging  │
│ └─ Docs     │  │ └─ Images   │  │ └─ E2E      │  │ └─ Prod     │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
                        ↕                ↕                ↕
                 ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
                 │  Security   │  │   Quality   │  │  Monitor    │
                 │             │  │             │  │             │
                 │ ├─ SAST     │  │ ├─ Coverage │  │ ├─ Health   │
                 │ ├─ DAST     │  │ ├─ Lint     │  │ ├─ Metrics  │
                 │ └─ Deps     │  │ └─ Perf     │  │ └─ Alerts   │
                 └─────────────┘  └─────────────┘  └─────────────┘
```

## 💻 Part 2: Hands-On - Building PRIMEPRE CI/CD Pipeline (60 minutes)

### Step 1: Repository Structure for CI/CD

First, let's organize our repository for automation:

```bash
# Create GitHub Actions directory
mkdir -p c:\Users\user\Desktop\PRIMEPRE\.github\workflows
mkdir -p c:\Users\user\Desktop\PRIMEPRE\.github\ISSUE_TEMPLATE
mkdir -p c:\Users\user\Desktop\PRIMEPRE\scripts
```

### Step 2: Create Main CI/CD Workflow

Create `.github/workflows/ci-cd.yml`:

```yaml
name: 🚀 PRIMEPRE CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  
  # Allow manual triggers
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy to'
        required: true
        default: 'staging'
        type: choice
        options:
        - staging
        - production

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}
  NODE_VERSION: '18'
  PYTHON_VERSION: '3.11'

jobs:
  # 🧪 Test Jobs
  backend-tests:
    name: 🐍 Backend Tests & Quality
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_primepre
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
    - name: 📥 Checkout Code
      uses: actions/checkout@v4
    
    - name: 🐍 Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: ${{ env.PYTHON_VERSION }}
        cache: 'pip'
    
    - name: 📦 Install Dependencies
      run: |
        cd backend
        pip install -r requirements.txt
        pip install pytest pytest-django pytest-cov black flake8 safety bandit
    
    - name: 🔍 Code Quality Checks
      run: |
        cd backend
        # Format check
        black --check .
        # Linting
        flake8 .
        # Security check
        safety check
        bandit -r . -x tests/
    
    - name: 🧪 Run Tests with Coverage
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_primepre
        SECRET_KEY: test-secret-key
        DEBUG: True
      run: |
        cd backend
        pytest --cov=. --cov-report=xml --cov-report=html
    
    - name: 📊 Upload Coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: backend/coverage.xml
        flags: backend
        name: backend-coverage
    
    - name: 📋 Test Report
      uses: dorny/test-reporter@v1
      if: success() || failure()
      with:
        name: Backend Tests
        path: backend/test-results.xml
        reporter: java-junit

  frontend-tests:
    name: ⚛️ Frontend Tests & Quality
    runs-on: ubuntu-latest
    
    steps:
    - name: 📥 Checkout Code
      uses: actions/checkout@v4
    
    - name: 📦 Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
    
    - name: 📦 Install Dependencies
      run: |
        cd frontend
        npm ci
    
    - name: 🔍 Lint & Format Check
      run: |
        cd frontend
        npm run lint
        # npm run format:check  # if you have prettier
    
    - name: 🧪 Run Tests
      run: |
        cd frontend
        npm test -- --coverage --watchAll=false
    
    - name: 📊 Upload Frontend Coverage
      uses: codecov/codecov-action@v3
      with:
        file: frontend/coverage/lcov.info
        flags: frontend
        name: frontend-coverage

  # 🔒 Security Scanning
  security-scan:
    name: 🔒 Security Scan
    runs-on: ubuntu-latest
    needs: [backend-tests, frontend-tests]
    
    steps:
    - name: 📥 Checkout Code
      uses: actions/checkout@v4
    
    - name: 🔍 Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        scan-ref: '.'
        format: 'sarif'
        output: 'trivy-results.sarif'
    
    - name: 📊 Upload Trivy scan results
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'

  # 🏗️ Build Images
  build-images:
    name: 🏗️ Build & Push Images
    runs-on: ubuntu-latest
    needs: [backend-tests, frontend-tests, security-scan]
    if: github.event_name == 'push' || github.event_name == 'workflow_dispatch'
    
    outputs:
      backend-image: ${{ steps.meta-backend.outputs.tags }}
      frontend-image: ${{ steps.meta-frontend.outputs.tags }}
    
    steps:
    - name: 📥 Checkout Code
      uses: actions/checkout@v4
    
    - name: 🔐 Log in to Container Registry
      uses: docker/login-action@v3
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: 🏷️ Extract Backend Metadata
      id: meta-backend
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/backend
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=sha,prefix={{branch}}-
          type=raw,value=latest,enable={{is_default_branch}}
    
    - name: 🏷️ Extract Frontend Metadata  
      id: meta-frontend
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/frontend
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=sha,prefix={{branch}}-
          type=raw,value=latest,enable={{is_default_branch}}
    
    - name: 🏗️ Build and Push Backend Image
      uses: docker/build-push-action@v5
      with:
        context: ./backend
        push: true
        tags: ${{ steps.meta-backend.outputs.tags }}
        labels: ${{ steps.meta-backend.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
    
    - name: 🏗️ Build and Push Frontend Image
      uses: docker/build-push-action@v5
      with:
        context: ./frontend
        push: true
        tags: ${{ steps.meta-frontend.outputs.tags }}
        labels: ${{ steps.meta-frontend.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

  # 🚀 Deploy to Staging
  deploy-staging:
    name: 🚀 Deploy to Staging
    runs-on: ubuntu-latest
    needs: [build-images]
    if: github.ref == 'refs/heads/develop' || github.event.inputs.environment == 'staging'
    environment: staging
    
    steps:
    - name: 📥 Checkout Code
      uses: actions/checkout@v4
    
    - name: 🔧 Setup kubectl
      uses: azure/setup-kubectl@v3
      with:
        version: 'v1.28.0'
    
    - name: 🔐 Configure Kubernetes
      run: |
        echo "${{ secrets.KUBE_CONFIG_STAGING }}" | base64 -d > kubeconfig
        export KUBECONFIG=kubeconfig
    
    - name: 🚀 Deploy to Staging
      run: |
        export KUBECONFIG=kubeconfig
        # Update image tags in k8s manifests
        sed -i "s|primepre-backend:latest|${{ needs.build-images.outputs.backend-image }}|g" devops/k8s/backend.yaml
        sed -i "s|primepre-frontend:latest|${{ needs.build-images.outputs.frontend-image }}|g" devops/k8s/frontend.yaml
        
        # Apply to staging namespace
        kubectl apply -f devops/k8s/ -n primepre-staging
        
        # Wait for rollout to complete
        kubectl rollout status deployment/backend -n primepre-staging --timeout=300s
        kubectl rollout status deployment/frontend -n primepre-staging --timeout=300s
    
    - name: 🧪 Run Smoke Tests
      run: |
        # Wait for services to be ready
        sleep 30
        
        # Get staging URL
        STAGING_URL=$(kubectl get ingress primepre-ingress -n primepre-staging -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
        
        # Basic health checks
        curl -f http://$STAGING_URL/api/health/ || exit 1
        curl -f http://$STAGING_URL/ || exit 1
        
        echo "✅ Staging deployment successful!"
        echo "🌐 Staging URL: http://$STAGING_URL"

  # 🚀 Deploy to Production
  deploy-production:
    name: 🚀 Deploy to Production
    runs-on: ubuntu-latest
    needs: [build-images, deploy-staging]
    if: github.ref == 'refs/heads/main' || github.event.inputs.environment == 'production'
    environment: production
    
    steps:
    - name: 📥 Checkout Code
      uses: actions/checkout@v4
    
    - name: 🔧 Setup kubectl
      uses: azure/setup-kubectl@v3
      with:
        version: 'v1.28.0'
    
    - name: 🔐 Configure Kubernetes  
      run: |
        echo "${{ secrets.KUBE_CONFIG_PRODUCTION }}" | base64 -d > kubeconfig
        export KUBECONFIG=kubeconfig
    
    - name: 🚀 Deploy to Production
      run: |
        export KUBECONFIG=kubeconfig
        # Update image tags
        sed -i "s|primepre-backend:latest|${{ needs.build-images.outputs.backend-image }}|g" devops/k8s/backend.yaml
        sed -i "s|primepre-frontend:latest|${{ needs.build-images.outputs.frontend-image }}|g" devops/k8s/frontend.yaml
        
        # Apply to production namespace
        kubectl apply -f devops/k8s/ -n primepre-production
        
        # Rolling update with careful monitoring
        kubectl rollout status deployment/backend -n primepre-production --timeout=600s
        kubectl rollout status deployment/frontend -n primepre-production --timeout=600s
    
    - name: 🧪 Production Health Check
      run: |
        sleep 60  # Give more time for production
        
        PROD_URL=$(kubectl get ingress primepre-ingress -n primepre-production -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
        
        # Comprehensive health checks
        curl -f https://$PROD_URL/api/health/ || exit 1
        curl -f https://$PROD_URL/ || exit 1
        
        # Check API endpoints
        curl -f https://$PROD_URL/api/goods/china/statistics/ || exit 1
        
        echo "✅ Production deployment successful!"
        echo "🌐 Production URL: https://$PROD_URL"
    
    - name: 📣 Notify Team
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        channel: '#deployments'
        text: |
          🚀 PRIMEPRE Production Deployment Complete!
          📊 Backend: ${{ needs.build-images.outputs.backend-image }}
          ⚛️ Frontend: ${{ needs.build-images.outputs.frontend-image }}
          🌐 URL: https://primepre.com
      env:
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
      if: always()

  # 📊 Performance Testing
  performance-test:
    name: 📊 Performance Test
    runs-on: ubuntu-latest
    needs: [deploy-staging]
    if: github.ref == 'refs/heads/develop'
    
    steps:
    - name: 📥 Checkout Code
      uses: actions/checkout@v4
    
    - name: 🔧 Setup k6
      run: |
        curl https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz -L | tar xvz --strip-components 1
    
    - name: 📊 Run Performance Tests
      run: |
        # Get staging URL
        STAGING_URL="http://staging.primepre.com"
        
        # Run k6 performance tests
        ./k6 run --env BASE_URL=$STAGING_URL scripts/performance-test.js
```

### Step 3: Create Performance Test Script

Create `scripts/performance-test.js`:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
export let errorRate = new Rate('errors');

// Test configuration
export let options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up
    { duration: '5m', target: 10 }, // Stay at 10 users
    { duration: '2m', target: 20 }, // Ramp up to 20 users
    { duration: '5m', target: 20 }, // Stay at 20 users
    { duration: '2m', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must be below 2s
    http_req_failed: ['rate<0.1'],     // Error rate must be below 10%
    errors: ['rate<0.1'],              // Custom error rate
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost';

export default function() {
  // Test scenarios for PRIMEPRE logistics system
  
  // 1. Homepage load test
  let response = http.get(`${BASE_URL}/`);
  check(response, {
    'Homepage status is 200': (r) => r.status === 200,
    'Homepage load time < 1s': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);
  
  sleep(1);
  
  // 2. API health check
  response = http.get(`${BASE_URL}/api/health/`);
  check(response, {
    'API health status is 200': (r) => r.status === 200,
    'API response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);
  
  sleep(1);
  
  // 3. Load China warehouse statistics
  response = http.get(`${BASE_URL}/api/goods/china/statistics/`);
  check(response, {
    'China stats status is 200': (r) => r.status === 200,
    'China stats response time < 2s': (r) => r.timings.duration < 2000,
  }) || errorRate.add(1);
  
  sleep(2);
  
  // 4. Load Ghana warehouse statistics
  response = http.get(`${BASE_URL}/api/goods/ghana/statistics/`);
  check(response, {
    'Ghana stats status is 200': (r) => r.status === 200,
    'Ghana stats response time < 2s': (r) => r.timings.duration < 2000,
  }) || errorRate.add(1);
  
  sleep(2);
}
```

### Step 4: Create Test Configuration

Create `backend/pytest.ini`:

```ini
[tool:pytest]
DJANGO_SETTINGS_MODULE = primepre.settings
python_files = tests.py test_*.py *_tests.py
addopts = 
    --verbose
    --tb=short
    --strict-markers
    --strict-config
    --cov=.
    --cov-branch
    --cov-report=term-missing:skip-covered
    --cov-report=html:htmlcov
    --cov-report=xml
    --junit-xml=test-results.xml
```

Create `backend/setup.cfg`:

```ini
[flake8]
max-line-length = 88
extend-ignore = E203, W503, E501
exclude = 
    migrations,
    __pycache__,
    manage.py,
    settings.py,
    .env
    
[coverage:run]
source = .
omit = 
    */migrations/*
    */tests/*
    */venv/*
    manage.py
    */settings/*
    */wsgi.py
    */asgi.py

[coverage:report]
precision = 2
show_missing = True
skip_covered = False
```

### Step 5: Create Environment-Specific Configs

Create `.github/environments/staging.yml`:

```yaml
# Staging environment configuration
name: staging
url: https://staging.primepre.com
protection_rules:
  required_reviewers: 1
  prevent_self_review: true
variables:
  ENVIRONMENT: staging
  LOG_LEVEL: DEBUG
  REPLICAS: 2
```

Create `.github/environments/production.yml`:

```yaml
# Production environment configuration  
name: production
url: https://primepre.com
protection_rules:
  required_reviewers: 2
  prevent_self_review: true
  required_status_checks:
    - backend-tests
    - frontend-tests
    - security-scan
    - deploy-staging
variables:
  ENVIRONMENT: production
  LOG_LEVEL: WARNING
  REPLICAS: 5
```

## 🧪 Part 3: Practice Exercises (30 minutes)

### Exercise 1: Trigger Your First Pipeline

```bash
# Initialize git repo if not already done
cd c:\Users\user\Desktop\PRIMEPRE
git init
git add .
git commit -m "Initial PRIMEPRE setup with CI/CD"

# Create GitHub repository and push
# (Follow GitHub's instructions for new repo)
git remote add origin https://github.com/yourusername/PRIMEPRE.git
git branch -M main
git push -u origin main
```

### Exercise 2: Create Feature Branch Workflow

```bash
# Create feature branch
git checkout -b feature/improve-analytics

# Make a small change
echo "# Analytics Improvement" >> backend/GoodsRecieved/analytics.py

# Commit and push
git add .
git commit -m "Add analytics improvement"
git push -u origin feature/improve-analytics

# Create pull request on GitHub
# Watch CI/CD pipeline run automatically
```

### Exercise 3: Monitor Pipeline Execution

```bash
# Watch GitHub Actions in real-time
# Visit: https://github.com/yourusername/PRIMEPRE/actions

# Check logs for each job
# Troubleshoot any failures
# Monitor resource usage
```

## 📝 Part 4: Reflection and Documentation (10 minutes)

### What You've Accomplished Today:

1. **Complete CI/CD Pipeline**
   - Automated testing for backend and frontend
   - Security scanning and quality gates
   - Multi-environment deployment

2. **Production-Ready Practices**
   - Code coverage reporting
   - Performance testing
   - Environment protection rules

3. **Monitoring and Alerting**
   - Deployment notifications
   - Health checks and smoke tests
   - Rollback capabilities

### Key GitHub Actions Concepts:
```yaml
on: [triggers]              # When to run
jobs: [job-name]           # What to run  
runs-on: ubuntu-latest     # Where to run
steps: [step-list]         # How to run
needs: [dependencies]      # Order of execution
environment: [env-name]    # Deployment targets
```

## 🚀 Tomorrow's Preview

In Module 05, we'll learn:
- AWS deployment strategies
- Infrastructure as Code with Terraform
- Auto-scaling and load balancing
- Database management in the cloud

## 🎯 Challenge Exercise (Optional)

Enhance your CI/CD pipeline:
1. **Add Integration Tests** - Full API integration testing
2. **Blue-Green Deployment** - Zero-downtime deployments
3. **Canary Releases** - Gradual rollout to production
4. **Automated Rollback** - Auto-rollback on health check failures

## 🆘 Troubleshooting

### Common Issues:

**Q: Tests failing in CI but work locally**
A: Check environment differences, database setup, environment variables

**Q: Docker build fails in Actions**
A: Verify Dockerfile, check file paths, ensure all files are committed

**Q: Deployment timeouts**
A: Increase timeout values, check resource limits, verify cluster health

**Q: Security scan failures**
A: Update dependencies, fix vulnerabilities, adjust scan thresholds

---

**🎉 Congratulations on Module 04!**

You've built a complete CI/CD pipeline that automatically tests, builds, and deploys your enterprise logistics system. This level of automation is what separates professional DevOps teams from amateur setups.

**Ready for the cloud?** 👉 [Module 05: AWS Deployment](./05-aws-deployment.md)
