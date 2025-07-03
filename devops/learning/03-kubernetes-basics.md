# ☸️ Module 03: Kubernetes Fundamentals - Scaling PRIMEPRE

## 🎯 Learning Objectives

By the end of this module, you will:
- Understand Kubernetes architecture and concepts
- Deploy PRIMEPRE to a local Kubernetes cluster
- Manage pods, services, and deployments
- Handle configuration with ConfigMaps and Secrets
- Implement basic monitoring and scaling

## 📚 Part 1: Understanding Kubernetes (20 minutes)

### What is Kubernetes and Why Do We Need It?

Think of Docker Compose as managing a single warehouse, but PRIMEPRE operates globally. Kubernetes is like managing an entire **logistics network** across multiple cities, countries, and continents:

```
🌍 GLOBAL PRIMEPRE LOGISTICS NETWORK

China Region          Ghana Region          Global Control
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ Guangzhou Hub   │   │ Accra Hub       │   │ Control Center  │
│ ├─ Frontend×3   │   │ ├─ Frontend×2   │   │ ├─ Load Balancer│
│ ├─ Backend×5    │   │ ├─ Backend×3    │   │ ├─ Auto-scaling │
│ ├─ Database×2   │   │ ├─ Database×1   │   │ ├─ Health Checks│
│ └─ Cache×2      │   │ └─ Cache×1      │   │ └─ Monitoring   │
└─────────────────┘   └─────────────────┘   └─────────────────┘
      ↕ Auto-scale        ↕ Auto-scale         ↕ Orchestration
```

### Kubernetes vs Docker Compose

| Feature | Docker Compose | Kubernetes |
|---------|----------------|------------|
| **Scale** | Single machine | Multiple machines/clouds |
| **High Availability** | Manual restart | Automatic healing |
| **Load Balancing** | Basic | Advanced with health checks |
| **Rolling Updates** | Manual | Automated zero-downtime |
| **Secret Management** | Environment files | Encrypted secrets |
| **Monitoring** | Basic | Built-in metrics |

### Core Kubernetes Components

```
☸️ KUBERNETES CLUSTER ARCHITECTURE

Master Node (Control Plane)     Worker Nodes
┌─────────────────────────────┐  ┌─────────────────────────────┐
│ API Server                  │  │ Node 1                      │
│ ├─ REST API                 │  │ ├─ kubelet (node agent)     │
│ └─ Authentication           │  │ ├─ kube-proxy (networking)  │
├─────────────────────────────┤  │ └─ Pods                     │
│ etcd (Cluster Database)     │  │   ├─ PRIMEPRE Frontend     │
├─────────────────────────────┤  │   ├─ PRIMEPRE Backend      │
│ Scheduler                   │  │   └─ Database              │
│ ├─ Pod placement            │  ├─────────────────────────────┤
│ └─ Resource allocation      │  │ Node 2                      │
├─────────────────────────────┤  │ ├─ kubelet                  │
│ Controller Manager          │  │ ├─ kube-proxy               │
│ ├─ Desired state            │  │ └─ Pods                     │
│ └─ Self-healing             │  │   ├─ PRIMEPRE Backend×2    │
└─────────────────────────────┘  │   └─ Cache                 │
                                 └─────────────────────────────┘
```

## 💻 Part 2: Hands-On - PRIMEPRE on Kubernetes (60 minutes)

### Step 1: Set Up Local Kubernetes (Minikube)

```bash
# Install minikube (if not already installed)
# Windows: chocolatey install minikube
# Mac: brew install minikube
# Linux: curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64

# Start local Kubernetes cluster
minikube start --driver=docker --memory=4096 --cpus=2

# Enable required addons
minikube addons enable ingress
minikube addons enable metrics-server
minikube addons enable dashboard

# Verify cluster is running
kubectl cluster-info
kubectl get nodes
```

### Step 2: Create Kubernetes Namespace

Create `devops/k8s/namespace.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: primepre
  labels:
    name: primepre
    environment: development
```

### Step 3: Configure Database Deployment

Create `devops/k8s/database.yaml`:

```yaml
# PostgreSQL Deployment for PRIMEPRE
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: primepre
  labels:
    app: postgres
    tier: database
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
        tier: database
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          valueFrom:
            configMapKeyRef:
              name: primepre-config
              key: database-name
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: primepre-secrets
              key: database-user
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: primepre-secrets
              key: database-password
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - $(POSTGRES_USER)
            - -d
            - $(POSTGRES_DB)
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - $(POSTGRES_USER)
            - -d
            - $(POSTGRES_DB)
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc

---
# PostgreSQL Service
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
  namespace: primepre
  labels:
    app: postgres
    tier: database
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
  type: ClusterIP

---
# Persistent Volume Claim for Database
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: primepre
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
```

### Step 4: Create ConfigMaps and Secrets

Create `devops/k8s/config.yaml`:

```yaml
# ConfigMap for non-sensitive configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: primepre-config
  namespace: primepre
data:
  database-name: "primepre"
  redis-url: "redis://redis-service:6379/0"
  allowed-hosts: "localhost,127.0.0.1,primepre.local"
  debug: "true"
  environment: "development"

---
# Secret for sensitive data
apiVersion: v1
kind: Secret
metadata:
  name: primepre-secrets
  namespace: primepre
type: Opaque
data:
  # Base64 encoded values
  database-user: cHJpbWVwcmVfdXNlcg==  # primepre_user
  database-password: cHJpbWVwcmVfcGFzc3dvcmQ=  # primepre_password
  secret-key: eW91ci1zdXBlci1zZWNyZXQta2V5LWZvci1kZXZlbG9wbWVudA==  # your-super-secret-key-for-development
```

### Step 5: Deploy PRIMEPRE Backend

Create `devops/k8s/backend.yaml`:

```yaml
# Django Backend Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: primepre
  labels:
    app: backend
    tier: api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
        tier: api
    spec:
      containers:
      - name: backend
        image: primepre-backend:latest
        imagePullPolicy: Never  # Use local image
        ports:
        - containerPort: 8000
        env:
        - name: DEBUG
          valueFrom:
            configMapKeyRef:
              name: primepre-config
              key: debug
        - name: DATABASE_URL
          value: "postgresql://$(DATABASE_USER):$(DATABASE_PASSWORD)@postgres-service:5432/$(DATABASE_NAME)"
        - name: DATABASE_USER
          valueFrom:
            secretKeyRef:
              name: primepre-secrets
              key: database-user
        - name: DATABASE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: primepre-secrets
              key: database-password
        - name: DATABASE_NAME
          valueFrom:
            configMapKeyRef:
              name: primepre-config
              key: database-name
        - name: SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: primepre-secrets
              key: secret-key
        - name: ALLOWED_HOSTS
          valueFrom:
            configMapKeyRef:
              name: primepre-config
              key: allowed-hosts
        - name: REDIS_URL
          valueFrom:
            configMapKeyRef:
              name: primepre-config
              key: redis-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health/
            port: 8000
          initialDelaySeconds: 60
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health/
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 5
        command: 
        - sh
        - -c
        - |
          python manage.py migrate &&
          python manage.py collectstatic --noinput &&
          python manage.py runserver 0.0.0.0:8000

---
# Backend Service
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: primepre
  labels:
    app: backend
    tier: api
spec:
  selector:
    app: backend
  ports:
  - port: 8000
    targetPort: 8000
  type: ClusterIP

---
# Horizontal Pod Autoscaler for Backend
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: primepre
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Step 6: Deploy Frontend

Create `devops/k8s/frontend.yaml`:

```yaml
# React Frontend Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: primepre
  labels:
    app: frontend
    tier: ui
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
        tier: ui
    spec:
      containers:
      - name: frontend
        image: primepre-frontend:latest
        imagePullPolicy: Never
        ports:
        - containerPort: 80
        env:
        - name: REACT_APP_API_URL
          value: "http://primepre.local/api"
        - name: REACT_APP_ENVIRONMENT
          valueFrom:
            configMapKeyRef:
              name: primepre-config
              key: environment
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5

---
# Frontend Service
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
  namespace: primepre
  labels:
    app: frontend
    tier: ui
spec:
  selector:
    app: frontend
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
```

### Step 7: Create Ingress for External Access

Create `devops/k8s/ingress.yaml`:

```yaml
# Ingress for PRIMEPRE application
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: primepre-ingress
  namespace: primepre
  annotations:
    kubernetes.io/ingress.class: "nginx"
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "false"
spec:
  rules:
  - host: primepre.local
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 8000
      - path: /admin
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 8000
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
```

### Step 8: Deploy Everything to Kubernetes

```bash
# Navigate to k8s directory
cd c:\Users\user\Desktop\PRIMEPRE\devops\k8s

# Build images first (make sure Docker is pointing to minikube)
eval $(minikube docker-env)
docker build -t primepre-backend:latest ../../backend/
docker build -t primepre-frontend:latest ../../frontend/

# Apply all configurations
kubectl apply -f namespace.yaml
kubectl apply -f config.yaml
kubectl apply -f database.yaml
kubectl apply -f backend.yaml
kubectl apply -f frontend.yaml
kubectl apply -f ingress.yaml

# Check deployment status
kubectl get all -n primepre

# Watch pods come online
kubectl get pods -n primepre -w
```

### Step 9: Access Your Application

```bash
# Add to hosts file for local testing
echo "$(minikube ip) primepre.local" | sudo tee -a /etc/hosts

# Or on Windows (run as Administrator):
# echo [minikube ip] primepre.local >> C:\Windows\System32\drivers\etc\hosts

# Open in browser
minikube service frontend-service -n primepre --url
# Visit: http://primepre.local
```

## 🧪 Part 3: Practice Exercises (30 minutes)

### Exercise 1: Scaling and Monitoring
```bash
# Scale backend manually
kubectl scale deployment backend -n primepre --replicas=5

# Watch scaling in action
kubectl get pods -n primepre -w

# Check resource usage
kubectl top pods -n primepre
kubectl top nodes

# View HPA status
kubectl get hpa -n primepre
```

### Exercise 2: Rolling Updates
```bash
# Update backend image
kubectl set image deployment/backend backend=primepre-backend:v2 -n primepre

# Watch rolling update
kubectl rollout status deployment/backend -n primepre

# Rollback if needed
kubectl rollout undo deployment/backend -n primepre
```

### Exercise 3: Debugging
```bash
# Check logs
kubectl logs -f deployment/backend -n primepre

# Execute commands in pods
kubectl exec -it [pod-name] -n primepre -- bash

# Port forward for debugging
kubectl port-forward service/backend-service -n primepre 8000:8000

# Describe resources for troubleshooting
kubectl describe pod [pod-name] -n primepre
```

## 📝 Part 4: Reflection and Documentation (10 minutes)

### What You've Accomplished Today:

1. **Kubernetes Deployment**
   - Multi-tier application deployment
   - Service discovery and networking
   - Persistent storage management

2. **Production Features**
   - Auto-scaling with HPA
   - Health checks and self-healing
   - Rolling updates and rollbacks

3. **Configuration Management**
   - ConfigMaps for settings
   - Secrets for sensitive data
   - Environment-specific deployments

### Key Kubernetes Commands:
```bash
kubectl get [resource] -n [namespace]    # List resources
kubectl describe [resource] [name]       # Detailed info
kubectl logs [pod-name]                  # View logs
kubectl exec -it [pod] -- [command]      # Execute commands
kubectl scale deployment [name] --replicas=N  # Scale manually
kubectl rollout status deployment/[name] # Check rollout
```

## 🚀 Tomorrow's Preview

In Module 04, we'll learn:
- GitHub Actions for CI/CD
- Automated testing and deployment
- Security scanning and compliance
- Multi-environment deployment strategies

## 🎯 Challenge Exercise (Optional)

Enhance your Kubernetes setup:
1. **Add Redis** - Deploy Redis cluster for caching
2. **Monitoring** - Add Prometheus and Grafana
3. **Logging** - Implement centralized logging with ELK
4. **Backup** - Set up automated database backups

## 🆘 Troubleshooting

### Common Issues:

**Q: Pods stuck in Pending state**
A: Check resource constraints: `kubectl describe pod [name] -n primepre`

**Q: ImagePullBackOff errors**
A: Ensure images are built in minikube environment: `eval $(minikube docker-env)`

**Q: Service not accessible**
A: Check ingress and services: `kubectl get ingress,services -n primepre`

**Q: Database connection issues**
A: Verify secrets and configmaps: `kubectl get secrets,configmaps -n primepre`

---

**🎉 Congratulations on Module 03!**

You've successfully deployed an enterprise logistics system to Kubernetes with auto-scaling, health checks, and production-ready configuration. This is advanced DevOps that puts you ahead of many senior engineers.

**Ready for CI/CD?** 👉 [Module 04: GitHub Actions Pipeline](./04-github-actions.md)
