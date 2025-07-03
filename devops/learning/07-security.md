# 🛡️ Module 07: Security & Compliance - Securing PRIMEPRE

## 🎯 Learning Objectives

By the end of this module, you will:
- Implement enterprise-grade security for PRIMEPRE
- Set up secrets management with HashiCorp Vault
- Configure SSL/TLS and network security
- Implement compliance logging and auditing
- Establish security scanning and vulnerability management

## 📚 Part 1: Understanding Security for Logistics (20 minutes)

### Why Security is Critical for Logistics

PRIMEPRE handles sensitive data across international borders:

```
🌍 PRIMEPRE SECURITY LANDSCAPE

┌─────────────────────────────────────────────────────────────────┐
│                    THREATS & PROTECTIONS                        │
├─────────────────────────────────────────────────────────────────┤
│ 🎯 ATTACK VECTORS          │ 🛡️ SECURITY MEASURES              │
│                           │                                    │
│ External Threats:         │ Network Security:                  │
│ ├─ DDoS Attacks          │ ├─ WAF (Web Application Firewall)  │
│ ├─ SQL Injection         │ ├─ Network Policies                │
│ ├─ XSS Attacks           │ ├─ VPN Access                      │
│ └─ API Abuse             │ └─ Zero Trust Architecture         │
│                           │                                    │
│ Internal Threats:         │ Access Control:                    │
│ ├─ Privilege Escalation  │ ├─ RBAC (Role-Based Access)        │
│ ├─ Data Exfiltration     │ ├─ MFA (Multi-Factor Auth)         │
│ ├─ Insider Threats       │ ├─ OAuth 2.0 / OIDC               │
│ └─ Weak Credentials      │ └─ Audit Logging                   │
│                           │                                    │
│ Infrastructure:           │ Infrastructure Security:           │
│ ├─ Container Escapes     │ ├─ Image Scanning                  │
│ ├─ Misconfiguration     │ ├─ Runtime Protection              │
│ ├─ Unpatched Software   │ ├─ Secrets Management              │
│ └─ Weak Encryption       │ └─ Compliance Monitoring           │
└─────────────────────────────────────────────────────────────────┘
```

### Security Compliance Requirements

For international logistics, PRIMEPRE must comply with:

- **GDPR** (European Union) - Data protection
- **CCPA** (California) - Consumer privacy  
- **SOC 2** - Service organization controls
- **ISO 27001** - Information security management
- **PCI DSS** - Payment card industry (if handling payments)

## 💻 Part 2: Hands-On - Complete Security Implementation (60 minutes)

### Step 1: Set Up HashiCorp Vault for Secrets Management

Create `devops/security/vault-values.yaml`:

```yaml
# HashiCorp Vault configuration for PRIMEPRE
global:
  enabled: true
  tlsDisable: false

server:
  # High Availability configuration
  ha:
    enabled: true
    replicas: 3
    raft:
      enabled: true
      setNodeId: true
      config: |
        ui = true
        
        listener "tcp" {
          tls_disable = 0
          address = "[::]:8200"
          cluster_address = "[::]:8201"
          tls_cert_file = "/vault/userconfig/vault-tls/tls.crt"
          tls_key_file = "/vault/userconfig/vault-tls/tls.key"
        }
        
        storage "raft" {
          path = "/vault/data"
          
          retry_join {
            leader_api_addr = "https://vault-0.vault-internal:8200"
            leader_ca_cert_file = "/vault/userconfig/vault-tls/ca.crt"
          }
          
          retry_join {
            leader_api_addr = "https://vault-1.vault-internal:8200"
            leader_ca_cert_file = "/vault/userconfig/vault-tls/ca.crt"
          }
          
          retry_join {
            leader_api_addr = "https://vault-2.vault-internal:8200"
            leader_ca_cert_file = "/vault/userconfig/vault-tls/ca.crt"
          }
        }
        
        service_registration "kubernetes" {}
  
  # Resource configuration
  resources:
    requests:
      memory: 256Mi
      cpu: 250m
    limits:
      memory: 512Mi
      cpu: 500m
  
  # Storage configuration
  dataStorage:
    enabled: true
    size: 10Gi
    storageClass: gp3
  
  # Audit storage
  auditStorage:
    enabled: true
    size: 5Gi
    storageClass: gp3

# Vault UI
ui:
  enabled: true
  serviceType: LoadBalancer

# Injector for automatic secret injection
injector:
  enabled: true
  
  # Resource configuration
  resources:
    requests:
      memory: 64Mi
      cpu: 50m
    limits:
      memory: 128Mi
      cpu: 100m
```

Deploy Vault:

```bash
# Add HashiCorp Helm repository
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update

# Create security namespace
kubectl create namespace vault

# Generate TLS certificates for Vault
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout vault.key \
  -out vault.crt \
  -subj "/CN=vault.vault.svc.cluster.local"

# Create TLS secret
kubectl create secret tls vault-tls \
  --cert=vault.crt \
  --key=vault.key \
  -n vault

# Install Vault
helm install vault hashicorp/vault \
  -n vault \
  -f devops/security/vault-values.yaml

# Initialize Vault (only run once)
kubectl exec -n vault vault-0 -- vault operator init -key-shares=5 -key-threshold=3
```

### Step 2: Configure Vault for PRIMEPRE

Create `scripts/setup-vault.sh`:

```bash
#!/bin/bash
# Setup Vault for PRIMEPRE secrets management

# Export Vault configuration
export VAULT_ADDR="https://vault.vault.svc.cluster.local:8200"
export VAULT_TOKEN="your-root-token-here"

# Unseal Vault (use 3 of the 5 keys from initialization)
kubectl exec -n vault vault-0 -- vault operator unseal <key1>
kubectl exec -n vault vault-0 -- vault operator unseal <key2>
kubectl exec -n vault vault-0 -- vault operator unseal <key3>

# Enable audit logging
kubectl exec -n vault vault-0 -- vault audit enable file file_path=/vault/audit/audit.log

# Enable secrets engines
kubectl exec -n vault vault-0 -- vault secrets enable -path=primepre kv-v2
kubectl exec -n vault vault-0 -- vault secrets enable -path=database database

# Configure database secrets engine
kubectl exec -n vault vault-0 -- vault write database/config/primepre-db \
  plugin_name=postgresql-database-plugin \
  connection_url="postgresql://{{username}}:{{password}}@primepre-production-database:5432/primepre?sslmode=require" \
  allowed_roles="primepre-app"

# Create database role
kubectl exec -n vault vault-0 -- vault write database/roles/primepre-app \
  db_name=primepre-db \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"

# Store application secrets
kubectl exec -n vault vault-0 -- vault kv put primepre/config \
  django_secret_key="$(openssl rand -base64 32)" \
  jwt_secret="$(openssl rand -base64 32)" \
  encryption_key="$(openssl rand -base64 32)"

# Store third-party API keys
kubectl exec -n vault vault-0 -- vault kv put primepre/apis \
  smtp_password="your-smtp-password" \
  slack_webhook="your-slack-webhook-url" \
  aws_access_key="your-aws-access-key" \
  aws_secret_key="your-aws-secret-key"

# Create policies
cat > primepre-policy.hcl << EOF
# Policy for PRIMEPRE application
path "primepre/data/config" {
  capabilities = ["read"]
}

path "primepre/data/apis" {
  capabilities = ["read"]
}

path "database/creds/primepre-app" {
  capabilities = ["read"]
}
EOF

kubectl exec -n vault vault-0 -- vault policy write primepre-app - < primepre-policy.hcl

# Configure Kubernetes authentication
kubectl exec -n vault vault-0 -- vault auth enable kubernetes

kubectl exec -n vault vault-0 -- vault write auth/kubernetes/config \
  token_reviewer_jwt="$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)" \
  kubernetes_host="https://$KUBERNETES_PORT_443_TCP_ADDR:443" \
  kubernetes_ca_cert="$(cat /var/run/secrets/kubernetes.io/serviceaccount/ca.crt)"

# Create role for PRIMEPRE
kubectl exec -n vault vault-0 -- vault write auth/kubernetes/role/primepre \
  bound_service_account_names=primepre-backend \
  bound_service_account_namespaces=primepre \
  policies=primepre-app \
  ttl=24h
```

### Step 3: Integrate Vault with PRIMEPRE Backend

Update `backend/Dockerfile` to include Vault agent:

```dockerfile
FROM python:3.11-slim

# Install system dependencies including Vault
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        curl \
        gnupg \
    && curl -fsSL https://apt.releases.hashicorp.com/gpg | apt-key add - \
    && echo "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main" > /etc/apt/sources.list.d/hashicorp.list \
    && apt-get update \
    && apt-get install -y vault \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV VAULT_ADDR=https://vault.vault.svc.cluster.local:8200

WORKDIR /app

# Copy and install Python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy Vault configuration
COPY vault-agent.hcl /app/
COPY start.sh /app/

# Copy application code
COPY . /app/

# Create directories
RUN mkdir -p /app/static /app/media /vault/secrets

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser \
    && chown -R appuser:appuser /app \
    && chmod +x /app/start.sh
USER appuser

EXPOSE 8000

CMD ["/app/start.sh"]
```

Create `backend/vault-agent.hcl`:

```hcl
# Vault Agent configuration for PRIMEPRE
vault {
  address = "https://vault.vault.svc.cluster.local:8200"
  ca_cert = "/var/run/secrets/kubernetes.io/serviceaccount/ca.crt"
}

auth "kubernetes" {
  method "kubernetes" {
    mount_path = "auth/kubernetes"
    config = {
      role = "primepre"
      token_path = "/var/run/secrets/kubernetes.io/serviceaccount/token"
    }
  }
}

template {
  source      = "/app/templates/env.tpl"
  destination = "/vault/secrets/.env"
  perms       = 0600
  command     = "supervisorctl restart django"
}

template {
  source      = "/app/templates/database.tpl"
  destination = "/vault/secrets/database.json"
  perms       = 0600
}
```

Create `backend/templates/env.tpl`:

```bash
{{- with secret "primepre/data/config" -}}
DJANGO_SECRET_KEY="{{ .Data.data.django_secret_key }}"
JWT_SECRET="{{ .Data.data.jwt_secret }}"
ENCRYPTION_KEY="{{ .Data.data.encryption_key }}"
{{- end }}

{{- with secret "primepre/data/apis" -}}
SMTP_PASSWORD="{{ .Data.data.smtp_password }}"
SLACK_WEBHOOK="{{ .Data.data.slack_webhook }}"
{{- end }}

{{- with secret "database/creds/primepre-app" -}}
DATABASE_URL="postgresql://{{ .Data.username }}:{{ .Data.password }}@primepre-production-database:5432/primepre"
{{- end }}
```

Create `backend/start.sh`:

```bash
#!/bin/bash
set -e

# Start Vault Agent in background
vault agent -config=/app/vault-agent.hcl &

# Wait for secrets to be available
while [ ! -f /vault/secrets/.env ]; do
  echo "Waiting for secrets..."
  sleep 2
done

# Source secrets
set -a
source /vault/secrets/.env
set +a

# Run Django migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput

# Start Django application
exec python manage.py runserver 0.0.0.0:8000
```

### Step 4: Implement Network Security

Create `devops/security/network-policies.yaml`:

```yaml
# Network policies for PRIMEPRE security
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
  namespace: primepre
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress

---
# Allow frontend to backend communication
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-to-backend
  namespace: primepre
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    - podSelector:
        matchLabels:
          app: nginx
    ports:
    - protocol: TCP
      port: 8000

---
# Allow backend to database
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-to-database
  namespace: primepre
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Egress
  egress:
  - to: []
    ports:
    - protocol: TCP
      port: 5432
  - to: []
    ports:
    - protocol: TCP
      port: 6379
  - to: []
    ports:
    - protocol: TCP
      port: 443  # HTTPS
  - to: []
    ports:
    - protocol: TCP
      port: 53   # DNS
    - protocol: UDP
      port: 53

---
# Allow ingress to frontend
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ingress-to-frontend
  namespace: primepre
spec:
  podSelector:
    matchLabels:
      app: frontend
  policyTypes:
  - Ingress
  ingress:
  - from: []
    ports:
    - protocol: TCP
      port: 80
```

### Step 5: Set Up Security Scanning

Create `.github/workflows/security-scan.yml`:

```yaml
name: 🔒 Security Scanning

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  # Static Application Security Testing (SAST)
  sast-scan:
    name: 🔍 SAST Scan
    runs-on: ubuntu-latest
    
    steps:
    - name: 📥 Checkout Code
      uses: actions/checkout@v4
    
    - name: 🔍 Run Semgrep
      uses: returntocorp/semgrep-action@v1
      with:
        config: >-
          p/security-audit
          p/secrets
          p/owasp-top-ten
          p/django
          p/react
    
    - name: 🔍 Run CodeQL Analysis
      uses: github/codeql-action/init@v2
      with:
        languages: python, javascript
    
    - name: 🏗️ Autobuild
      uses: github/codeql-action/autobuild@v2
    
    - name: 📊 Perform CodeQL Analysis
      uses: github/codeql-action/analyze@v2

  # Software Composition Analysis (SCA)
  sca-scan:
    name: 🔍 SCA Scan
    runs-on: ubuntu-latest
    
    steps:
    - name: 📥 Checkout Code
      uses: actions/checkout@v4
    
    - name: 🐍 Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: 📦 Install Dependencies
      run: |
        cd backend
        pip install -r requirements.txt
        pip install safety bandit
    
    - name: 🔍 Run Safety Check
      run: |
        cd backend
        safety check --json --output safety-report.json || true
    
    - name: 🔍 Run Bandit Security Linter
      run: |
        cd backend
        bandit -r . -f json -o bandit-report.json || true
    
    - name: 📦 Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
    
    - name: 📦 Install Frontend Dependencies
      run: |
        cd frontend
        npm ci
    
    - name: 🔍 Run npm audit
      run: |
        cd frontend
        npm audit --audit-level moderate --json > npm-audit.json || true
    
    - name: 📊 Upload Security Reports
      uses: actions/upload-artifact@v3
      with:
        name: security-reports
        path: |
          backend/safety-report.json
          backend/bandit-report.json
          frontend/npm-audit.json

  # Container Security Scanning
  container-scan:
    name: 🐳 Container Security Scan
    runs-on: ubuntu-latest
    needs: [sast-scan]
    
    steps:
    - name: 📥 Checkout Code
      uses: actions/checkout@v4
    
    - name: 🏗️ Build Backend Image
      run: |
        cd backend
        docker build -t primepre-backend:scan .
    
    - name: 🏗️ Build Frontend Image
      run: |
        cd frontend
        docker build -t primepre-frontend:scan .
    
    - name: 🔍 Run Trivy Backend Scan
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: 'primepre-backend:scan'
        format: 'sarif'
        output: 'trivy-backend.sarif'
    
    - name: 🔍 Run Trivy Frontend Scan
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: 'primepre-frontend:scan'
        format: 'sarif'
        output: 'trivy-frontend.sarif'
    
    - name: 📊 Upload Trivy Results
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: '.'

  # Infrastructure Security Scanning
  iac-scan:
    name: 🏗️ Infrastructure Security Scan
    runs-on: ubuntu-latest
    
    steps:
    - name: 📥 Checkout Code
      uses: actions/checkout@v4
    
    - name: 🔍 Run Checkov
      uses: bridgecrewio/checkov-action@master
      with:
        directory: .
        framework: terraform,kubernetes,dockerfile
        output_format: sarif
        output_file_path: checkov.sarif
    
    - name: 📊 Upload Checkov Results
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: checkov.sarif

  # Security Summary
  security-summary:
    name: 📋 Security Summary
    runs-on: ubuntu-latest
    needs: [sast-scan, sca-scan, container-scan, iac-scan]
    if: always()
    
    steps:
    - name: 📥 Download Security Reports
      uses: actions/download-artifact@v3
      with:
        name: security-reports
    
    - name: 📊 Generate Security Summary
      run: |
        echo "# 🔒 PRIMEPRE Security Scan Summary" > security-summary.md
        echo "" >> security-summary.md
        echo "## 📊 Scan Results" >> security-summary.md
        echo "" >> security-summary.md
        
        # Process safety report
        if [ -f safety-report.json ]; then
          SAFETY_ISSUES=$(jq '.vulnerabilities | length' safety-report.json)
          echo "- **Python Dependencies**: $SAFETY_ISSUES vulnerabilities found" >> security-summary.md
        fi
        
        # Process bandit report
        if [ -f bandit-report.json ]; then
          BANDIT_ISSUES=$(jq '.results | length' bandit-report.json)
          echo "- **Python Security**: $BANDIT_ISSUES issues found" >> security-summary.md
        fi
        
        # Process npm audit
        if [ -f npm-audit.json ]; then
          NPM_ISSUES=$(jq '.metadata.vulnerabilities.total' npm-audit.json)
          echo "- **NPM Dependencies**: $NPM_ISSUES vulnerabilities found" >> security-summary.md
        fi
        
        echo "" >> security-summary.md
        echo "## 🎯 Recommendations" >> security-summary.md
        echo "1. Review and fix high/critical vulnerabilities" >> security-summary.md
        echo "2. Update dependencies to latest secure versions" >> security-summary.md
        echo "3. Implement security headers and CSRF protection" >> security-summary.md
        echo "4. Regular security scanning in CI/CD pipeline" >> security-summary.md
        
        cat security-summary.md
    
    - name: 📝 Comment PR
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v6
      with:
        script: |
          const fs = require('fs');
          const summary = fs.readFileSync('security-summary.md', 'utf8');
          
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: summary
          });
```

## 🧪 Part 3: Practice Exercises (30 minutes)

### Exercise 1: Test Secret Rotation

```bash
# Rotate database credentials
kubectl exec -n vault vault-0 -- vault read database/creds/primepre-app

# Check if application automatically picks up new credentials
kubectl logs -f deployment/backend -n primepre

# Verify database connection still works
kubectl exec -n primepre deployment/backend -- python manage.py dbshell -c "SELECT 1;"
```

### Exercise 2: Test Network Policies

```bash
# Apply network policies
kubectl apply -f devops/security/network-policies.yaml

# Test allowed connections
kubectl exec -n primepre deployment/frontend -- curl backend-service:8000/api/health/

# Test blocked connections (should fail)
kubectl run test-pod --image=busybox -i --tty --rm -n primepre -- sh
# Try to connect to database directly (should be blocked)
wget -q --spider postgres-service:5432
```

### Exercise 3: Security Audit

```bash
# Run security audit on running containers
kubectl exec -n primepre deployment/backend -- ps aux
kubectl exec -n primepre deployment/backend -- ls -la /etc/passwd

# Check for running processes and open ports
kubectl exec -n primepre deployment/backend -- netstat -tlnp

# Verify secrets are not exposed
kubectl exec -n primepre deployment/backend -- env | grep -i secret
```

## 📝 Part 4: Reflection and Documentation (10 minutes)

### What You've Accomplished Today:

1. **Secrets Management**
   - HashiCorp Vault deployment
   - Dynamic secret rotation
   - Secure secret injection

2. **Network Security**
   - Network policies implementation
   - Zero-trust networking
   - Traffic isolation

3. **Security Scanning**
   - SAST/SCA/Container scanning
   - Vulnerability management
   - Compliance reporting

### Key Security Principles:
- **Defense in Depth** - Multiple security layers
- **Least Privilege** - Minimum required access
- **Zero Trust** - Never trust, always verify
- **Security by Design** - Built-in security

## 🚀 Tomorrow's Preview

In Module 08, we'll learn:
- Performance optimization strategies
- CDN implementation and caching
- Database optimization techniques
- Application performance monitoring

## 🎯 Challenge Exercise (Optional)

Enhance your security:
1. **WAF Implementation** - Deploy AWS WAF or Cloudflare
2. **RBAC Enhancement** - Implement fine-grained access control
3. **Compliance Automation** - Automated compliance checking
4. **Incident Response** - Automated security incident handling

## 🆘 Troubleshooting

### Common Issues:

**Q: Vault pods not starting**
A: Check TLS certificates, verify storage configuration

**Q: Secret injection not working**
A: Verify service account permissions, check Vault policies

**Q: Network policies blocking legitimate traffic**
A: Review policy rules, check label selectors

**Q: Security scans taking too long**
A: Optimize scan configurations, use caching

---

**🎉 Congratulations on Module 07!**

You've implemented enterprise-grade security that meets compliance requirements for international logistics operations. Your PRIMEPRE system is now protected with the same security standards used by banks and government agencies.

**Ready for performance optimization?** 👉 [Module 08: Performance Optimization](./08-performance.md)
