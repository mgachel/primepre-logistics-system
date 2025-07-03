# 📊 Module 06: Monitoring & Observability - PRIMEPRE Intelligence

## 🎯 Learning Objectives

By the end of this module, you will:
- Implement comprehensive monitoring for PRIMEPRE
- Set up Prometheus and Grafana for metrics
- Configure centralized logging with ELK stack
- Create custom dashboards for logistics KPIs
- Set up intelligent alerting and incident response

## 📚 Part 1: Understanding Observability (20 minutes)

### The Three Pillars of Observability

For a global logistics system like PRIMEPRE, you need complete visibility:

```
🔍 PRIMEPRE OBSERVABILITY STACK

                    OBSERVABILITY = METRICS + LOGS + TRACES

┌─────────────────────────────────────────────────────────────────────┐
│                           📊 METRICS                                │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐       │
│ │ Infrastructure  │ │ Application     │ │ Business        │       │
│ │ • CPU/Memory    │ │ • Response Time │ │ • Orders/min    │       │
│ │ • Disk I/O      │ │ • Error Rate    │ │ • Revenue       │       │
│ │ • Network       │ │ • Throughput    │ │ • SLA Metrics   │       │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘       │
├─────────────────────────────────────────────────────────────────────┤
│                           📋 LOGS                                   │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐       │
│ │ System Logs     │ │ Application     │ │ Audit Logs     │       │
│ │ • OS Events     │ │ • Debug Info    │ │ • User Actions  │       │
│ │ • Security      │ │ • Errors        │ │ • Data Changes  │       │
│ │ • Performance   │ │ • Transactions  │ │ • Compliance    │       │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘       │
├─────────────────────────────────────────────────────────────────────┤
│                           🔗 TRACES                                 │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐       │
│ │ Request Flow    │ │ Database Calls  │ │ External APIs   │       │
│ │ • User Journey  │ │ • Query Time    │ │ • 3rd Party     │       │
│ │ • Service Hops  │ │ • Connection    │ │ • Latency       │       │
│ │ • Bottlenecks   │ │ • Slow Queries  │ │ • Failures      │       │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
```

### Why Monitoring Matters for Logistics

```
🚛 REAL-WORLD SCENARIOS & MONITORING RESPONSES

Scenario 1: High Volume Day (Chinese New Year)
📈 Monitoring Detects: CPU usage > 80%, Response time > 2s
🤖 Auto Response: Scale up EKS nodes, Enable caching
📱 Alert: "High traffic detected, auto-scaling initiated"

Scenario 2: Database Slowdown
📊 Monitoring Detects: Query time > 5s, Queue building up
🔍 Investigation: Check slow query logs, Connection pool
⚡ Response: Optimize queries, Scale read replicas

Scenario 3: Ghana Warehouse Offline
🚨 Monitoring Detects: Service health check failing
📞 Alert: Immediate alert to ops team
🔄 Response: Route traffic to backup service
```

## 💻 Part 2: Hands-On - Complete Monitoring Setup (60 minutes)

### Step 1: Install Prometheus and Grafana

Create `devops/monitoring/prometheus-values.yaml`:

```yaml
# Prometheus configuration for PRIMEPRE
prometheus:
  prometheusSpec:
    retention: 30d
    retentionSize: "50GB"
    
    # Storage configuration
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: gp3
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 100Gi
    
    # Resource configuration
    resources:
      requests:
        memory: "2Gi"
        cpu: "1000m"
      limits:
        memory: "4Gi"
        cpu: "2000m"
    
    # Service monitoring
    serviceMonitorSelectorNilUsesHelmValues: false
    serviceMonitorSelector: {}
    
    # Additional scrape configs for PRIMEPRE
    additionalScrapeConfigs:
    - job_name: 'primepre-backend'
      kubernetes_sd_configs:
      - role: endpoints
        namespaces:
          names:
          - primepre
      relabel_configs:
      - source_labels: [__meta_kubernetes_service_name]
        action: keep
        regex: backend-service
      - source_labels: [__meta_kubernetes_endpoint_port_name]
        action: keep
        regex: http
    
    - job_name: 'primepre-nginx'
      kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
          - primepre
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: nginx

# Grafana configuration
grafana:
  enabled: true
  
  # Admin credentials
  adminPassword: "SecurePassword123!"
  
  # Persistence
  persistence:
    enabled: true
    size: 10Gi
    storageClassName: gp3
  
  # Resource configuration
  resources:
    requests:
      memory: "512Mi"
      cpu: "250m"
    limits:
      memory: "1Gi"
      cpu: "500m"
  
  # Grafana configuration
  grafana.ini:
    server:
      domain: monitoring.primepre.com
      root_url: https://monitoring.primepre.com
    
    smtp:
      enabled: true
      host: "smtp.gmail.com:587"
      user: "alerts@primepre.com"
      password: "your-app-password"
      from_address: "alerts@primepre.com"
    
    auth:
      disable_login_form: false
      oauth_auto_login: false
    
    security:
      admin_user: admin
      admin_password: SecurePassword123!
  
  # Import dashboards
  dashboardProviders:
    dashboardproviders.yaml:
      apiVersion: 1
      providers:
      - name: 'default'
        orgId: 1
        folder: 'PRIMEPRE'
        type: file
        disableDeletion: false
        editable: true
        options:
          path: /var/lib/grafana/dashboards/default
  
  dashboards:
    default:
      primepre-overview:
        gnetId: 15661
        revision: 1
        datasource: Prometheus
      
      kubernetes-cluster:
        gnetId: 15757
        revision: 1
        datasource: Prometheus
      
      postgresql:
        gnetId: 9628
        revision: 7
        datasource: Prometheus

# AlertManager configuration
alertmanager:
  alertmanagerSpec:
    storage:
      volumeClaimTemplate:
        spec:
          storageClassName: gp3
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 10Gi
    
    # Alert routing
    config:
      global:
        smtp_smarthost: 'smtp.gmail.com:587'
        smtp_from: 'alerts@primepre.com'
        smtp_auth_username: 'alerts@primepre.com'
        smtp_auth_password: 'your-app-password'
      
      route:
        group_by: ['alertname', 'cluster', 'service']
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
        - url: 'http://primepre-alerts-webhook:8080/webhook'
      
      - name: 'critical-alerts'
        email_configs:
        - to: 'ops-team@primepre.com'
          subject: '🚨 CRITICAL: {{ .GroupLabels.alertname }}'
          body: |
            {{ range .Alerts }}
            Alert: {{ .Annotations.summary }}
            Description: {{ .Annotations.description }}
            Labels: {{ range .Labels.SortedPairs }}{{ .Name }}={{ .Value }} {{ end }}
            {{ end }}
        slack_configs:
        - api_url: 'YOUR_SLACK_WEBHOOK_URL'
          channel: '#critical-alerts'
          title: '🚨 Critical Alert: {{ .GroupLabels.alertname }}'
          text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
      
      - name: 'warning-alerts'
        email_configs:
        - to: 'dev-team@primepre.com'
          subject: '⚠️ WARNING: {{ .GroupLabels.alertname }}'
          body: |
            {{ range .Alerts }}
            Alert: {{ .Annotations.summary }}
            Description: {{ .Annotations.description }}
            {{ end }}

# Node Exporter for system metrics
nodeExporter:
  enabled: true

# kube-state-metrics for Kubernetes metrics
kubeStateMetrics:
  enabled: true
```

### Step 2: Deploy Monitoring Stack

```bash
# Add Prometheus Helm repository
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Create monitoring namespace
kubectl create namespace monitoring

# Install Prometheus stack
helm install prometheus-stack prometheus-community/kube-prometheus-stack \
  -n monitoring \
  -f devops/monitoring/prometheus-values.yaml

# Wait for all pods to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=grafana -n monitoring --timeout=300s
```

### Step 3: Create Custom PRIMEPRE Metrics

Update `backend/GoodsRecieved/metrics.py`:

```python
"""
Custom metrics for PRIMEPRE monitoring
"""
from prometheus_client import Counter, Histogram, Gauge, CollectorRegistry
from django.conf import settings
import time

# Create custom registry for PRIMEPRE metrics
REGISTRY = CollectorRegistry()

# Business Metrics
goods_received_total = Counter(
    'primepre_goods_received_total',
    'Total number of goods received',
    ['warehouse', 'status'],
    registry=REGISTRY
)

goods_processing_time = Histogram(
    'primepre_goods_processing_seconds',
    'Time taken to process goods',
    ['warehouse', 'operation'],
    buckets=[0.1, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0, 300.0],
    registry=REGISTRY
)

warehouse_utilization = Gauge(
    'primepre_warehouse_utilization_percent',
    'Warehouse utilization percentage',
    ['warehouse'],
    registry=REGISTRY
)

api_request_duration = Histogram(
    'primepre_api_request_duration_seconds',
    'API request duration',
    ['method', 'endpoint', 'status'],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
    registry=REGISTRY
)

database_query_duration = Histogram(
    'primepre_database_query_duration_seconds',
    'Database query duration',
    ['query_type'],
    buckets=[0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0],
    registry=REGISTRY
)

# Error tracking
api_errors_total = Counter(
    'primepre_api_errors_total',
    'Total API errors',
    ['endpoint', 'error_type'],
    registry=REGISTRY
)

# Active connections
active_users = Gauge(
    'primepre_active_users',
    'Number of active users',
    registry=REGISTRY
)

# Workflow metrics
workflow_executions_total = Counter(
    'primepre_workflow_executions_total',
    'Total workflow executions',
    ['workflow_name', 'status'],
    registry=REGISTRY
)

# Functions to update metrics
def record_goods_received(warehouse, status):
    """Record when goods are received"""
    goods_received_total.labels(warehouse=warehouse, status=status).inc()

def record_processing_time(warehouse, operation, duration):
    """Record processing time for operations"""
    goods_processing_time.labels(warehouse=warehouse, operation=operation).observe(duration)

def update_warehouse_utilization(warehouse, utilization_percent):
    """Update warehouse utilization"""
    warehouse_utilization.labels(warehouse=warehouse).set(utilization_percent)

def record_api_request(method, endpoint, status, duration):
    """Record API request metrics"""
    api_request_duration.labels(method=method, endpoint=endpoint, status=status).observe(duration)

def record_database_query(query_type, duration):
    """Record database query duration"""
    database_query_duration.labels(query_type=query_type).observe(duration)

def record_api_error(endpoint, error_type):
    """Record API errors"""
    api_errors_total.labels(endpoint=endpoint, error_type=error_type).inc()

def update_active_users(count):
    """Update active user count"""
    active_users.set(count)

def record_workflow_execution(workflow_name, status):
    """Record workflow execution"""
    workflow_executions_total.labels(workflow_name=workflow_name, status=status).inc()

# Middleware for automatic metrics collection
class PrometheusMetricsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start_time = time.time()
        
        response = self.get_response(request)
        
        # Record request duration
        duration = time.time() - start_time
        endpoint = request.resolver_match.url_name if request.resolver_match else 'unknown'
        
        record_api_request(
            method=request.method,
            endpoint=endpoint,
            status=str(response.status_code),
            duration=duration
        )
        
        # Record errors
        if response.status_code >= 400:
            error_type = 'client_error' if response.status_code < 500 else 'server_error'
            record_api_error(endpoint, error_type)
        
        return response
```

Create `backend/GoodsRecieved/management/commands/update_metrics.py`:

```python
"""
Management command to update PRIMEPRE metrics
"""
from django.core.management.base import BaseCommand
from django.db.models import Count, Avg
from GoodsRecieved.models import GoodsReceivedChina, GoodsReceivedGhana
from GoodsRecieved.metrics import update_warehouse_utilization, update_active_users
from users.models import CustomerUser
from django.utils import timezone
from datetime import timedelta

class Command(BaseCommand):
    help = 'Update PRIMEPRE business metrics'

    def handle(self, *args, **options):
        self.stdout.write('Updating PRIMEPRE metrics...')
        
        # Update warehouse utilization
        self.update_warehouse_metrics()
        
        # Update user metrics
        self.update_user_metrics()
        
        self.stdout.write(self.style.SUCCESS('Metrics updated successfully'))

    def update_warehouse_metrics(self):
        """Update warehouse utilization metrics"""
        # China warehouse
        china_total = GoodsReceivedChina.objects.count()
        china_pending = GoodsReceivedChina.objects.filter(status='PENDING').count()
        china_utilization = (china_pending / max(china_total, 1)) * 100
        update_warehouse_utilization('china', china_utilization)
        
        # Ghana warehouse  
        ghana_total = GoodsReceivedGhana.objects.count()
        ghana_pending = GoodsReceivedGhana.objects.filter(status='PENDING').count()
        ghana_utilization = (ghana_pending / max(ghana_total, 1)) * 100
        update_warehouse_utilization('ghana', ghana_utilization)

    def update_user_metrics(self):
        """Update user activity metrics"""
        # Active users in last 24 hours
        yesterday = timezone.now() - timedelta(days=1)
        active_count = CustomerUser.objects.filter(
            last_login__gte=yesterday
        ).count()
        update_active_users(active_count)
```

### Step 4: Create Custom Grafana Dashboard

Create `devops/monitoring/grafana-dashboard.json`:

```json
{
  "dashboard": {
    "id": null,
    "title": "PRIMEPRE Logistics Overview",
    "description": "Complete overview of PRIMEPRE logistics operations",
    "tags": ["primepre", "logistics"],
    "timezone": "UTC",
    "panels": [
      {
        "id": 1,
        "title": "Total Goods Processed",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(increase(primepre_goods_received_total[24h]))",
            "legendFormat": "Total"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "palette-classic"
            },
            "unit": "short"
          }
        },
        "gridPos": {
          "h": 4,
          "w": 6,
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 2,
        "title": "Warehouse Utilization",
        "type": "gauge",
        "targets": [
          {
            "expr": "primepre_warehouse_utilization_percent",
            "legendFormat": "{{warehouse}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "max": 100,
            "min": 0,
            "unit": "percent",
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 70},
                {"color": "red", "value": 90}
              ]
            }
          }
        },
        "gridPos": {
          "h": 4,
          "w": 6,
          "x": 6,
          "y": 0
        }
      },
      {
        "id": 3,
        "title": "API Response Times",
        "type": "timeseries",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(primepre_api_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(primepre_api_request_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s"
          }
        },
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 0,
          "y": 4
        }
      },
      {
        "id": 4,
        "title": "Error Rate",
        "type": "timeseries",
        "targets": [
          {
            "expr": "rate(primepre_api_errors_total[5m])",
            "legendFormat": "{{endpoint}} - {{error_type}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "reqps"
          }
        },
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 12,
          "y": 4
        }
      },
      {
        "id": 5,
        "title": "Goods Status Distribution",
        "type": "piechart",
        "targets": [
          {
            "expr": "sum by (status) (primepre_goods_received_total)",
            "legendFormat": "{{status}}"
          }
        ],
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 0,
          "y": 12
        }
      },
      {
        "id": 6,
        "title": "Database Query Performance",
        "type": "timeseries",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(primepre_database_query_duration_seconds_bucket[5m]))",
            "legendFormat": "{{query_type}} - 95th percentile"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s"
          }
        },
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 12,
          "y": 12
        }
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
```

### Step 5: Set Up Logging with ELK Stack

Create `devops/logging/elasticsearch-values.yaml`:

```yaml
# Elasticsearch configuration
clusterName: "primepre-logs"
nodeGroup: "master"

replicas: 3
minimumMasterNodes: 2

resources:
  requests:
    cpu: "1000m"
    memory: "2Gi"
  limits:
    cpu: "2000m"
    memory: "4Gi"

volumeClaimTemplate:
  accessModes: [ "ReadWriteOnce" ]
  storageClassName: "gp3"
  resources:
    requests:
      storage: 100Gi

esConfig:
  elasticsearch.yml: |
    cluster.name: primepre-logs
    network.host: 0.0.0.0
    discovery.seed_hosts: "primepre-logs-master-headless"
    cluster.initial_master_nodes: "primepre-logs-master-0,primepre-logs-master-1,primepre-logs-master-2"
    xpack.security.enabled: false
    xpack.license.self_generated.type: basic
```

Deploy ELK Stack:

```bash
# Add Elastic Helm repository
helm repo add elastic https://helm.elastic.co
helm repo update

# Create logging namespace
kubectl create namespace logging

# Install Elasticsearch
helm install elasticsearch elastic/elasticsearch \
  -n logging \
  -f devops/logging/elasticsearch-values.yaml

# Install Kibana
helm install kibana elastic/kibana \
  --set service.type=LoadBalancer \
  -n logging

# Install Filebeat for log collection
helm install filebeat elastic/filebeat \
  --set daemonset.enabled=true \
  -n logging
```

## 🧪 Part 3: Practice Exercises (30 minutes)

### Exercise 1: Create Custom Alerts

```yaml
# Create custom alerting rules
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: primepre-alerts
  namespace: monitoring
spec:
  groups:
  - name: primepre.rules
    rules:
    - alert: HighAPILatency
      expr: histogram_quantile(0.95, rate(primepre_api_request_duration_seconds_bucket[5m])) > 2
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High API latency detected"
        description: "95th percentile latency is {{ $value }}s"
    
    - alert: HighErrorRate
      expr: rate(primepre_api_errors_total[5m]) > 0.1
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "High error rate detected"
        description: "Error rate is {{ $value }} errors/second"
    
    - alert: WarehouseCapacityHigh
      expr: primepre_warehouse_utilization_percent > 90
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Warehouse capacity high"
        description: "{{ $labels.warehouse }} warehouse is {{ $value }}% full"
```

### Exercise 2: Test Monitoring

```bash
# Generate load to trigger alerts
kubectl run load-test --image=busybox -i --tty --rm -- sh

# Inside the pod, generate requests
while true; do 
  wget -q --spider http://backend-service.primepre:8000/api/goods/china/statistics/
  sleep 0.1
done

# Check alerts in Grafana
# Visit: http://monitoring.primepre.com
```

### Exercise 3: Analyze Logs

```bash
# Check application logs
kubectl logs -f deployment/backend -n primepre

# Search logs in Kibana
# Visit Kibana dashboard and create search queries
```

## 📝 Part 4: Reflection and Documentation (10 minutes)

### What You've Accomplished Today:

1. **Complete Observability Stack**
   - Prometheus for metrics collection
   - Grafana for visualization
   - AlertManager for notifications

2. **Custom PRIMEPRE Metrics**
   - Business-specific KPIs
   - Performance monitoring
   - Error tracking

3. **Centralized Logging**
   - ELK stack deployment
   - Log aggregation and search
   - Real-time log analysis

### Key Monitoring Concepts:
- **SLI (Service Level Indicators)** - What you measure
- **SLO (Service Level Objectives)** - What you target
- **SLA (Service Level Agreements)** - What you promise
- **Error Budget** - How much failure you can tolerate

## 🚀 Tomorrow's Preview

In Module 07, we'll learn:
- Security best practices for production
- Secrets management with Vault
- Network security and SSL/TLS
- Compliance and audit logging

## 🎯 Challenge Exercise (Optional)

Enhance your monitoring:
1. **Custom Business Dashboards** - Revenue, shipping times, customer satisfaction
2. **Anomaly Detection** - ML-based alerting for unusual patterns
3. **Mobile Dashboards** - Mobile-friendly monitoring views
4. **Integration** - Connect with Slack, PagerDuty, Jira

## 🆘 Troubleshooting

### Common Issues:

**Q: Prometheus not scraping metrics**
A: Check service discovery configuration and network policies

**Q: Grafana dashboards not loading**
A: Verify data source configuration and query syntax

**Q: High cardinality metrics**
A: Review metric labels, avoid high-cardinality dimensions

**Q: Elasticsearch out of disk space**
A: Set up index lifecycle management, adjust retention policies

---

**🎉 Congratulations on Module 06!**

You now have enterprise-grade observability for PRIMEPRE that rivals monitoring setups at Google, Netflix, and other tech giants. You can detect issues before they impact customers and optimize performance continuously.

**Ready for security?** 👉 [Module 07: Security & Compliance](./07-security.md)
