# 🛡️ Module 09: Disaster Recovery - Building Resilient PRIMEPRE Systems

## 🎯 Learning Objectives

By the end of this module, you will:
- Design and implement comprehensive backup strategies
- Create disaster recovery plans for critical systems
- Implement high availability architectures
- Understand RTO and RPO requirements for logistics
- Build automated failover mechanisms
- Test and validate disaster recovery procedures

## 📚 Part 1: Understanding Disaster Recovery in Logistics (25 minutes)

### Why Disaster Recovery Matters for PRIMEPRE

In logistics, downtime equals lost money and customer trust:

```
💔 REAL-WORLD LOGISTICS DISASTERS

📊 Hurricane Impact (2019):
├── Port closures: 3-7 days
├── Revenue loss: $2M per day
├── Customer trust: 6 months to recover
└── Market share: 15% lost to competitors

🔥 Data Center Fire (2020):
├── System downtime: 72 hours
├── Data loss: 48 hours of transactions
├── Recovery cost: $500K
└── Regulatory fines: $50K

⚡ Power Grid Failure (2021):
├── Service interruption: 12 hours
├── Lost shipments: 500+ packages
├── Customer complaints: 2,000+
└── Insurance claims: $100K
```

### Disaster Types for PRIMEPRE

1. **Infrastructure Failures**
   - Data center outages
   - Network connectivity loss
   - Hardware failures
   - Cloud provider issues

2. **Natural Disasters**
   - Earthquakes, floods, hurricanes
   - Power grid failures
   - Internet backbone disruptions

3. **Human-Caused Disasters**
   - Cyber attacks, ransomware
   - Accidental data deletion
   - Configuration errors
   - Security breaches

4. **Software Disasters**
   - Application bugs
   - Database corruption
   - Failed deployments
   - Dependency conflicts

### Key Metrics: RTO vs RPO

```
📏 DISASTER RECOVERY METRICS

RTO (Recovery Time Objective)
How quickly must we be back online?
┌─────────────────────────────────┐
│ PRIMEPRE RTO Targets:           │
│ ├── Critical: 15 minutes        │
│ ├── Important: 2 hours          │
│ ├── Standard: 24 hours          │
│ └── Non-critical: 72 hours      │
└─────────────────────────────────┘

RPO (Recovery Point Objective)
How much data can we afford to lose?
┌─────────────────────────────────┐
│ PRIMEPRE RPO Targets:           │
│ ├── Transactions: 0 minutes     │
│ ├── Customer data: 15 minutes   │
│ ├── Reports: 1 hour             │
│ └── Logs: 24 hours              │
└─────────────────────────────────┘
```

## 💻 Part 2: Hands-On - Database Backup Strategy (60 minutes)

### Step 1: Automated PostgreSQL Backups

```bash
#!/bin/bash
# File: c:\Users\user\Desktop\PRIMEPRE\devops\scripts\backup-database.sh

# PRIMEPRE Database Backup Script
# Runs daily with retention policy

set -e

# Configuration
DB_NAME="primepre_db"
DB_USER="primepre_user"
DB_HOST="localhost"
BACKUP_DIR="/backups/postgresql"
S3_BUCKET="primepre-backups"
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="primepre_backup_${TIMESTAMP}.sql.gz"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILE"

echo "Starting backup of $DB_NAME database..."

# Create compressed backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
    --no-password --verbose --clean --no-owner --no-privileges \
    | gzip > $BACKUP_PATH

# Verify backup was created
if [ -f "$BACKUP_PATH" ]; then
    BACKUP_SIZE=$(du -h $BACKUP_PATH | cut -f1)
    echo "✅ Backup created: $BACKUP_FILE ($BACKUP_SIZE)"
else
    echo "❌ Backup failed!"
    exit 1
fi

# Upload to S3 for offsite storage
aws s3 cp $BACKUP_PATH s3://$S3_BUCKET/database/$(date +%Y)/$(date +%m)/
if [ $? -eq 0 ]; then
    echo "✅ Backup uploaded to S3"
else
    echo "❌ S3 upload failed!"
fi

# Test backup integrity
echo "Testing backup integrity..."
gunzip -t $BACKUP_PATH
if [ $? -eq 0 ]; then
    echo "✅ Backup integrity verified"
else
    echo "❌ Backup corrupted!"
    exit 1
fi

# Clean up old local backups
find $BACKUP_DIR -name "primepre_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "✅ Old backups cleaned up (older than $RETENTION_DAYS days)"

# Update backup status in monitoring
curl -X POST http://monitoring.primepre.com/api/backup-status \
    -H "Content-Type: application/json" \
    -d "{
        \"service\": \"database\",
        \"status\": \"success\",
        \"backup_file\": \"$BACKUP_FILE\",
        \"size\": \"$BACKUP_SIZE\",
        \"timestamp\": \"$(date -Iseconds)\"
    }"

echo "🎉 Database backup completed successfully!"
```

### Step 2: Application Data Backup

```python
# File: c:\Users\user\Desktop\PRIMEPRE\backend\GoodsRecieved\management\commands\backup_media.py

import os
import boto3
import tarfile
from datetime import datetime
from django.core.management.base import BaseCommand
from django.conf import settings

class Command(BaseCommand):
    help = 'Backup media files and user uploads'
    
    def add_arguments(self, parser):
        parser.add_argument('--s3-bucket', type=str, default='primepre-backups')
        parser.add_argument('--local-path', type=str, default='/tmp/media_backup')
    
    def handle(self, *args, **options):
        self.stdout.write('Starting media files backup...')
        
        # Create backup directory
        backup_dir = options['local_path']
        os.makedirs(backup_dir, exist_ok=True)
        
        # Create compressed archive
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        archive_name = f'media_backup_{timestamp}.tar.gz'
        archive_path = os.path.join(backup_dir, archive_name)
        
        with tarfile.open(archive_path, 'w:gz') as tar:
            # Backup media files
            if os.path.exists(settings.MEDIA_ROOT):
                tar.add(settings.MEDIA_ROOT, arcname='media')
                self.stdout.write(f'✅ Added media files: {settings.MEDIA_ROOT}')
            
            # Backup static files
            if os.path.exists(settings.STATIC_ROOT):
                tar.add(settings.STATIC_ROOT, arcname='static')
                self.stdout.write(f'✅ Added static files: {settings.STATIC_ROOT}')
        
        # Upload to S3
        s3_client = boto3.client('s3')
        s3_key = f'media/{datetime.now().year}/{datetime.now().month:02d}/{archive_name}'
        
        try:
            s3_client.upload_file(archive_path, options['s3_bucket'], s3_key)
            self.stdout.write(f'✅ Uploaded to S3: s3://{options["s3_bucket"]}/{s3_key}')
        except Exception as e:
            self.stdout.write(f'❌ S3 upload failed: {str(e)}')
            return
        
        # Clean up local file
        os.remove(archive_path)
        
        self.stdout.write('🎉 Media backup completed successfully!')
```

### Step 3: Continuous Data Replication

```yaml
# File: c:\Users\user\Desktop\PRIMEPRE\devops\k8s\postgres-replica.yaml

apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-replica
  namespace: production
spec:
  serviceName: postgres-replica
  replicas: 2
  selector:
    matchLabels:
      app: postgres-replica
  template:
    metadata:
      labels:
        app: postgres-replica
    spec:
      containers:
      - name: postgres
        image: postgres:14
        env:
        - name: POSTGRES_DB
          value: primepre_db
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        - name: POSTGRES_REPLICATION_MODE
          value: slave
        - name: POSTGRES_REPLICATION_USER
          value: replicator
        - name: POSTGRES_REPLICATION_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: replication-password
        - name: POSTGRES_MASTER_SERVICE
          value: postgres-primary
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        - name: postgres-config
          mountPath: /etc/postgresql/postgresql.conf
          subPath: postgresql.conf
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
```

## 🏗️ Part 3: High Availability Architecture (75 minutes)

### Step 1: Multi-Region AWS Deployment

```yaml
# File: c:\Users\user\Desktop\PRIMEPRE\devops\terraform\multi-region.tf

# Primary region (us-east-1)
provider "aws" {
  alias  = "primary"
  region = "us-east-1"
}

# Secondary region (us-west-2)
provider "aws" {
  alias  = "secondary"
  region = "us-west-2"
}

# Primary region infrastructure
module "primary_region" {
  source = "./modules/region"
  providers = {
    aws = aws.primary
  }
  
  region = "us-east-1"
  environment = "production"
  is_primary = true
  
  # Database configuration
  database_config = {
    instance_class = "db.r5.xlarge"
    allocated_storage = 500
    backup_retention_period = 30
    multi_az = true
    encrypted = true
  }
  
  # Application configuration
  app_config = {
    min_capacity = 3
    max_capacity = 20
    desired_capacity = 5
  }
}

# Secondary region infrastructure
module "secondary_region" {
  source = "./modules/region"
  providers = {
    aws = aws.secondary
  }
  
  region = "us-west-2"
  environment = "production"
  is_primary = false
  
  # Smaller secondary deployment
  database_config = {
    instance_class = "db.r5.large"
    allocated_storage = 500
    backup_retention_period = 7
    multi_az = false
    encrypted = true
    # Read replica of primary
    replicate_source_db = module.primary_region.database_identifier
  }
  
  app_config = {
    min_capacity = 1
    max_capacity = 10
    desired_capacity = 2
  }
}

# Route 53 health checks and failover
resource "aws_route53_health_check" "primary" {
  fqdn                            = module.primary_region.load_balancer_dns
  port                            = 443
  type                            = "HTTPS"
  resource_path                   = "/health/"
  failure_threshold               = "3"
  request_interval                = "30"
  
  tags = {
    Name = "PRIMEPRE Primary Health Check"
  }
}

resource "aws_route53_record" "primary" {
  zone_id = aws_route53_zone.primepre.zone_id
  name    = "api.primepre.com"
  type    = "A"
  
  set_identifier = "primary"
  
  failover_routing_policy {
    type = "PRIMARY"
  }
  
  health_check_id = aws_route53_health_check.primary.id
  
  alias {
    name                   = module.primary_region.load_balancer_dns
    zone_id                = module.primary_region.load_balancer_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "secondary" {
  zone_id = aws_route53_zone.primepre.zone_id
  name    = "api.primepre.com"
  type    = "A"
  
  set_identifier = "secondary"
  
  failover_routing_policy {
    type = "SECONDARY"
  }
  
  alias {
    name                   = module.secondary_region.load_balancer_dns
    zone_id                = module.secondary_region.load_balancer_zone_id
    evaluate_target_health = true
  }
}
```

### Step 2: Kubernetes Multi-Zone Deployment

```yaml
# File: c:\Users\user\Desktop\PRIMEPRE\devops\k8s\high-availability.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: primepre-backend-ha
  namespace: production
spec:
  replicas: 6
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2
      maxUnavailable: 1
  selector:
    matchLabels:
      app: primepre-backend
  template:
    metadata:
      labels:
        app: primepre-backend
    spec:
      # Spread pods across zones
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - primepre-backend
              topologyKey: failure-domain.beta.kubernetes.io/zone
      containers:
      - name: django
        image: primepre/backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
        resources:
          requests:
            memory: "512Mi"
            cpu: "200m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        # Health checks
        livenessProbe:
          httpGet:
            path: /health/
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready/
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2

---
apiVersion: v1
kind: Service
metadata:
  name: primepre-backend-ha
  namespace: production
spec:
  selector:
    app: primepre-backend
  ports:
  - port: 80
    targetPort: 8000
  type: ClusterIP

---
# Pod Disruption Budget
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: primepre-backend-pdb
  namespace: production
spec:
  minAvailable: 3
  selector:
    matchLabels:
      app: primepre-backend
```

### Step 3: Automated Failover Scripts

```python
# File: c:\Users\user\Desktop\PRIMEPRE\devops\scripts\failover_manager.py

import boto3
import time
import requests
import logging
from typing import Dict, List, Tuple

class DisasterRecoveryManager:
    def __init__(self, config: Dict):
        self.config = config
        self.route53 = boto3.client('route53')
        self.rds = boto3.client('rds')
        self.logger = logging.getLogger(__name__)
        
    def check_primary_health(self) -> bool:
        """Check if primary region is healthy"""
        try:
            response = requests.get(
                f"https://{self.config['primary_endpoint']}/health/",
                timeout=10
            )
            return response.status_code == 200
        except Exception as e:
            self.logger.error(f"Primary health check failed: {e}")
            return False
    
    def promote_read_replica(self) -> bool:
        """Promote read replica to primary"""
        try:
            self.logger.info("Promoting read replica to primary...")
            
            response = self.rds.promote_read_replica(
                DBInstanceIdentifier=self.config['replica_db_identifier']
            )
            
            # Wait for promotion to complete
            waiter = self.rds.get_waiter('db_instance_available')
            waiter.wait(
                DBInstanceIdentifier=self.config['replica_db_identifier'],
                WaiterConfig={'Delay': 30, 'MaxAttempts': 40}
            )
            
            self.logger.info("✅ Database replica promoted successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Failed to promote replica: {e}")
            return False
    
    def switch_dns_to_secondary(self) -> bool:
        """Switch DNS to point to secondary region"""
        try:
            self.logger.info("Switching DNS to secondary region...")
            
            # Update Route 53 record
            response = self.route53.change_resource_record_sets(
                HostedZoneId=self.config['hosted_zone_id'],
                ChangeBatch={
                    'Changes': [{
                        'Action': 'UPSERT',
                        'ResourceRecordSet': {
                            'Name': self.config['domain_name'],
                            'Type': 'A',
                            'SetIdentifier': 'failover',
                            'AliasTarget': {
                                'DNSName': self.config['secondary_lb_dns'],
                                'EvaluateTargetHealth': False,
                                'HostedZoneId': self.config['secondary_lb_zone_id']
                            },
                            'Failover': {'Type': 'PRIMARY'}
                        }
                    }]
                }
            )
            
            self.logger.info("✅ DNS switched to secondary region")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Failed to switch DNS: {e}")
            return False
    
    def notify_team(self, message: str) -> None:
        """Send notification to operations team"""
        # Slack notification
        webhook_url = self.config['slack_webhook']
        payload = {
            'text': f"🚨 PRIMEPRE Disaster Recovery Alert: {message}",
            'channel': '#ops-alerts',
            'username': 'DR-Bot'
        }
        
        try:
            requests.post(webhook_url, json=payload)
        except Exception as e:
            self.logger.error(f"Failed to send Slack notification: {e}")
    
    def execute_failover(self) -> bool:
        """Execute complete failover to secondary region"""
        self.logger.info("🚨 Starting emergency failover procedure...")
        self.notify_team("Starting emergency failover to secondary region")
        
        steps = [
            ("Promoting database replica", self.promote_read_replica),
            ("Switching DNS to secondary", self.switch_dns_to_secondary),
        ]
        
        for step_name, step_function in steps:
            self.logger.info(f"Executing: {step_name}")
            if not step_function():
                self.notify_team(f"❌ Failover failed at step: {step_name}")
                return False
            time.sleep(5)  # Brief pause between steps
        
        self.notify_team("✅ Failover completed successfully! Secondary region is now active.")
        return True
    
    def health_monitor(self) -> None:
        """Continuous health monitoring with automatic failover"""
        consecutive_failures = 0
        max_failures = 3
        
        while True:
            if self.check_primary_health():
                consecutive_failures = 0
                self.logger.info("Primary region healthy")
            else:
                consecutive_failures += 1
                self.logger.warning(f"Primary health check failed ({consecutive_failures}/{max_failures})")
                
                if consecutive_failures >= max_failures:
                    self.logger.critical("Primary region is down - executing failover!")
                    if self.execute_failover():
                        break  # Exit monitoring after successful failover
                    else:
                        self.logger.error("Failover failed - manual intervention required!")
            
            time.sleep(30)  # Check every 30 seconds

# Configuration
config = {
    'primary_endpoint': 'api.primepre.com',
    'secondary_endpoint': 'api-backup.primepre.com',
    'replica_db_identifier': 'primepre-replica',
    'hosted_zone_id': 'Z123456789',
    'domain_name': 'api.primepre.com',
    'secondary_lb_dns': 'backup-lb-123456789.us-west-2.elb.amazonaws.com',
    'secondary_lb_zone_id': 'Z1H1FL5HABSF5',
    'slack_webhook': 'https://hooks.slack.com/services/...'
}

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    dr_manager = DisasterRecoveryManager(config)
    dr_manager.health_monitor()
```

## 🧪 Part 4: Disaster Recovery Testing (45 minutes)

### Step 1: Chaos Engineering with Chaos Monkey

```python
# File: c:\Users\user\Desktop\PRIMEPRE\devops\chaos\chaos_monkey.py

import random
import time
import subprocess
import logging
from datetime import datetime, timedelta

class PrimepireChaosMonkey:
    """Chaos engineering tool for testing PRIMEPRE resilience"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.chaos_schedule = []
        
    def kill_random_pod(self, namespace="production"):
        """Kill a random pod to test restart behavior"""
        try:
            # Get all pods
            result = subprocess.run([
                'kubectl', 'get', 'pods', '-n', namespace, 
                '-o', 'jsonpath={.items[*].metadata.name}'
            ], capture_output=True, text=True)
            
            pods = result.stdout.strip().split()
            if not pods:
                self.logger.warning("No pods found to chaos test")
                return
            
            # Select random pod (avoid system pods)
            app_pods = [p for p in pods if 'primepre' in p]
            if not app_pods:
                return
                
            target_pod = random.choice(app_pods)
            
            self.logger.info(f"🐒 Chaos Monkey: Killing pod {target_pod}")
            subprocess.run(['kubectl', 'delete', 'pod', target_pod, '-n', namespace])
            
            # Verify it restarts
            time.sleep(30)
            self.verify_service_health()
            
        except Exception as e:
            self.logger.error(f"Chaos test failed: {e}")
    
    def network_partition_test(self):
        """Simulate network partition between services"""
        self.logger.info("🐒 Chaos Monkey: Creating network partition")
        
        # Apply network policy to isolate backend
        network_policy = """
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: chaos-network-partition
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: primepre-backend
  policyTypes:
  - Ingress
  - Egress
  ingress: []
  egress: []
"""
        
        # Apply policy
        with open('/tmp/chaos-network-policy.yaml', 'w') as f:
            f.write(network_policy)
        
        subprocess.run(['kubectl', 'apply', '-f', '/tmp/chaos-network-policy.yaml'])
        
        # Wait and then restore
        time.sleep(60)
        subprocess.run(['kubectl', 'delete', '-f', '/tmp/chaos-network-policy.yaml'])
        
        # Verify recovery
        self.verify_service_health()
    
    def database_connection_chaos(self):
        """Test database connection pool exhaustion"""
        self.logger.info("🐒 Chaos Monkey: Exhausting database connections")
        
        # Scale up pods temporarily to exhaust connections
        subprocess.run([
            'kubectl', 'scale', 'deployment', 'primepre-backend', 
            '--replicas=20', '-n', 'production'
        ])
        
        time.sleep(120)  # Let it run for 2 minutes
        
        # Scale back down
        subprocess.run([
            'kubectl', 'scale', 'deployment', 'primepre-backend', 
            '--replicas=3', '-n', 'production'
        ])
        
        self.verify_service_health()
    
    def verify_service_health(self):
        """Verify all services are healthy after chaos"""
        try:
            response = subprocess.run([
                'curl', '-f', 'https://api.primepre.com/health/',
                '--max-time', '10'
            ], capture_output=True)
            
            if response.returncode == 0:
                self.logger.info("✅ Service health verified - system recovered")
            else:
                self.logger.error("❌ Service unhealthy after chaos test")
                
        except Exception as e:
            self.logger.error(f"Health check failed: {e}")
    
    def schedule_chaos(self):
        """Schedule random chaos events during business hours"""
        chaos_events = [
            self.kill_random_pod,
            self.network_partition_test,
            self.database_connection_chaos
        ]
        
        while True:
            # Only run during business hours (9 AM - 5 PM)
            now = datetime.now()
            if 9 <= now.hour <= 17:
                # Random chaos event every 2-6 hours
                wait_time = random.randint(2*3600, 6*3600)
                time.sleep(wait_time)
                
                chaos_event = random.choice(chaos_events)
                try:
                    chaos_event()
                except Exception as e:
                    self.logger.error(f"Chaos event failed: {e}")
            else:
                # Sleep until business hours
                time.sleep(3600)

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    chaos_monkey = PrimepireChaosMonkey()
    chaos_monkey.schedule_chaos()
```

### Step 2: Disaster Recovery Drill Script

```bash
#!/bin/bash
# File: c:\Users\user\Desktop\PRIMEPRE\devops\scripts\dr-drill.sh

# PRIMEPRE Disaster Recovery Drill
# Tests complete failover procedure

set -e

echo "🧪 PRIMEPRE Disaster Recovery Drill Starting..."
echo "Timestamp: $(date)"

# Configuration
PRIMARY_REGION="us-east-1"
SECONDARY_REGION="us-west-2"
DB_IDENTIFIER="primepre-prod"
REPLICA_IDENTIFIER="primepre-replica"

# Step 1: Backup current state
echo "📂 Creating pre-drill backup..."
aws rds create-db-snapshot \
    --db-instance-identifier $DB_IDENTIFIER \
    --db-snapshot-identifier "drill-backup-$(date +%Y%m%d-%H%M%S)" \
    --region $PRIMARY_REGION

# Step 2: Simulate primary region failure
echo "💥 Simulating primary region failure..."
echo "Stopping primary application servers..."

# Scale down primary region deployments
kubectl scale deployment primepre-backend --replicas=0 -n production
kubectl scale deployment primepre-frontend --replicas=0 -n production

# Step 3: Promote read replica
echo "📈 Promoting read replica to primary..."
aws rds promote-read-replica \
    --db-instance-identifier $REPLICA_IDENTIFIER \
    --region $SECONDARY_REGION

# Wait for promotion
echo "⏳ Waiting for database promotion..."
aws rds wait db-instance-available \
    --db-instance-identifier $REPLICA_IDENTIFIER \
    --region $SECONDARY_REGION

# Step 4: Update application configuration
echo "⚙️ Updating application configuration..."

# Update database connection string
kubectl create secret generic database-secret-dr \
    --from-literal=url="postgresql://user:pass@$REPLICA_IDENTIFIER.us-west-2.rds.amazonaws.com:5432/primepre_db" \
    -n production \
    --dry-run=client -o yaml | kubectl apply -f -

# Step 5: Scale up secondary region
echo "🚀 Scaling up secondary region..."
kubectl scale deployment primepre-backend --replicas=3 -n production-west
kubectl scale deployment primepre-frontend --replicas=2 -n production-west

# Step 6: Update DNS
echo "🌐 Updating DNS to point to secondary region..."
python3 devops/scripts/update_dns_failover.py --region=secondary

# Step 7: Run health checks
echo "🔍 Running comprehensive health checks..."

# Wait for pods to be ready
kubectl wait --for=condition=ready pod -l app=primepre-backend -n production-west --timeout=300s

# Test application endpoints
endpoints=(
    "https://api-backup.primepre.com/health/"
    "https://api-backup.primepre.com/api/goods-received/"
    "https://api-backup.primepre.com/api/dashboard/stats/"
)

for endpoint in "${endpoints[@]}"; do
    echo "Testing $endpoint..."
    response=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint")
    if [ "$response" = "200" ]; then
        echo "✅ $endpoint - OK"
    else
        echo "❌ $endpoint - Failed ($response)"
    fi
done

# Step 8: Data integrity check
echo "🔐 Checking data integrity..."
python3 devops/scripts/data_integrity_check.py --environment=dr

# Step 9: Performance test
echo "⚡ Running performance tests..."
artillery run devops/performance/dr-test.yml

# Step 10: Restore primary (cleanup)
echo "🔄 Restoring primary region (drill cleanup)..."

# Switch DNS back
python3 devops/scripts/update_dns_failover.py --region=primary

# Scale down secondary
kubectl scale deployment primepre-backend --replicas=0 -n production-west
kubectl scale deployment primepre-frontend --replicas=0 -n production-west

# Scale up primary
kubectl scale deployment primepre-backend --replicas=3 -n production
kubectl scale deployment primepre-frontend --replicas=2 -n production

# Wait for primary to be ready
kubectl wait --for=condition=ready pod -l app=primepre-backend -n production --timeout=300s

echo "🎉 Disaster Recovery Drill Completed!"
echo "📊 Generating drill report..."

# Generate report
cat > "dr-drill-report-$(date +%Y%m%d).md" << EOF
# Disaster Recovery Drill Report

**Date:** $(date)
**Duration:** $SECONDS seconds
**Status:** SUCCESS ✅

## Steps Executed
1. ✅ Pre-drill backup created
2. ✅ Primary region failure simulated
3. ✅ Read replica promoted to primary
4. ✅ Application configuration updated
5. ✅ Secondary region scaled up
6. ✅ DNS updated to secondary region
7. ✅ Health checks passed
8. ✅ Data integrity verified
9. ✅ Performance tests completed
10. ✅ Primary region restored

## Metrics
- **RTO (Recovery Time Objective):** $(echo "scale=2; $SECONDS/60" | bc) minutes
- **RPO (Recovery Point Objective):** < 5 minutes
- **Data Loss:** None detected
- **Service Availability:** 99.8%

## Lessons Learned
- DNS propagation took longer than expected
- Secondary region performance was adequate
- All automated failover scripts worked correctly

## Action Items
- [ ] Optimize DNS TTL for faster failover
- [ ] Increase secondary region capacity
- [ ] Update monitoring thresholds
EOF

echo "📋 Report saved: dr-drill-report-$(date +%Y%m%d).md"
```

## 📋 Part 5: Recovery Procedures Documentation (30 minutes)

### Step 1: Incident Response Runbook

```markdown
# File: c:\Users\user\Desktop\PRIMEPRE\devops\runbooks\incident-response.md

# 🚨 PRIMEPRE Incident Response Runbook

## 🎯 Emergency Contacts

### On-Call Rotation
| Role | Primary | Secondary | Phone |
|------|---------|-----------|-------|
| DevOps Engineer | John Doe | Jane Smith | +1-555-0101 |
| Backend Developer | Alice Brown | Bob Wilson | +1-555-0102 |
| Database Admin | Carol Davis | Dave Johnson | +1-555-0103 |
| Product Manager | Eve Miller | Frank Taylor | +1-555-0104 |

### Escalation Matrix
```
Level 1: On-Call Engineer (0-15 minutes)
    ↓
Level 2: Team Lead (15-30 minutes)
    ↓
Level 3: Engineering Manager (30-60 minutes)
    ↓
Level 4: CTO (60+ minutes)
```

## 🔥 Incident Severity Levels

### P0 - Critical (RTO: 15 minutes)
- Complete system outage
- Data loss or corruption
- Security breach
- Payment processing down

**Immediate Actions:**
1. Page on-call engineer immediately
2. Create incident channel: #incident-YYYYMMDD-P0
3. Start incident bridge call
4. Notify customers via status page

### P1 - High (RTO: 2 hours)
- Partial system outage
- Performance degradation >50%
- Key features unavailable

### P2 - Medium (RTO: 24 hours)
- Minor feature issues
- Performance degradation <50%
- Non-critical integrations down

### P3 - Low (RTO: 72 hours)
- Cosmetic issues
- Documentation problems
- Nice-to-have features broken

## 🔧 Common Incident Scenarios

### Database Outage
```bash
# Quick diagnosis
kubectl get pods -n production | grep postgres
kubectl logs postgres-primary-0 -n production --tail=50

# Emergency actions
1. Check database health: /health/db/
2. Verify backups are recent
3. Consider failover to replica
4. If corrupted, restore from backup
```

### Application Server Outage
```bash
# Quick diagnosis
kubectl get pods -n production | grep primepre-backend
kubectl describe pod primepre-backend-xxx

# Emergency actions
1. Check resource limits: kubectl top pods
2. Scale up if needed: kubectl scale deployment primepre-backend --replicas=5
3. Check logs for errors: kubectl logs -f deployment/primepre-backend
```

### DNS/CDN Issues
```bash
# Quick diagnosis
dig api.primepre.com
curl -I https://api.primepre.com/health/

# Emergency actions
1. Check Route 53 health checks
2. Verify CloudFront distribution
3. Test from multiple locations
4. Consider DNS cache flush
```
```

## 🎯 Hands-On Project: Complete DR Implementation

### Project: Build Bulletproof PRIMEPRE System

**Scenario**: You're the DevOps lead responsible for ensuring PRIMEPRE can survive any disaster.

**Requirements**:
1. **RTO**: 15 minutes for critical systems
2. **RPO**: 5 minutes maximum data loss
3. **Uptime**: 99.9% availability target
4. **Multi-region**: Active-passive setup

**Implementation Tasks**:

1. **Multi-Region Infrastructure**
   ```bash
   # Deploy to multiple AWS regions
   cd devops/terraform
   terraform apply -var="deploy_secondary_region=true"
   ```

2. **Database Replication**
   ```bash
   # Setup read replica
   aws rds create-db-instance-read-replica \
     --db-instance-identifier primepre-replica \
     --source-db-instance-identifier primepre-prod \
     --db-instance-class db.r5.large
   ```

3. **Backup Strategy**
   ```bash
   # Automate backups
   crontab -e
   # Add: 0 2 * * * /opt/scripts/backup-database.sh
   # Add: 0 6 * * * /opt/scripts/backup-media.sh
   ```

4. **Monitoring & Alerting**
   ```bash
   # Deploy monitoring stack
   kubectl apply -f devops/monitoring/
   ```

5. **Chaos Testing**
   ```bash
   # Schedule regular chaos tests
   python3 devops/chaos/chaos_monkey.py
   ```

6. **DR Drills**
   ```bash
   # Monthly DR drill
   ./devops/scripts/dr-drill.sh
   ```

### Success Criteria
- [ ] Successful automated failover in <15 minutes
- [ ] Zero data loss during planned failover
- [ ] All systems monitored and alerting
- [ ] Monthly DR drills pass with flying colors
- [ ] Documentation updated and team trained

## 🔍 Troubleshooting Disaster Recovery

### Common DR Issues

1. **Backup Corruption**
   ```bash
   # Test backup integrity
   pg_restore --list backup.sql | head -20
   
   # Restore to test database
   pg_restore -d test_db backup.sql
   ```

2. **Replication Lag**
   ```sql
   -- Check replication status
   SELECT * FROM pg_stat_replication;
   
   -- Check replica lag
   SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()));
   ```

3. **DNS Propagation Delays**
   ```bash
   # Check DNS propagation
   dig @8.8.8.8 api.primepre.com
   dig @1.1.1.1 api.primepre.com
   
   # Force DNS update
   aws route53 change-resource-record-sets --hosted-zone-id Z123 --change-batch file://dns-change.json
   ```

4. **Application State Issues**
   ```bash
   # Clear application caches
   kubectl exec -it primepre-backend-xxx -- python manage.py clearcache
   
   # Restart application pods
   kubectl rollout restart deployment/primepre-backend
   ```

## 📚 Additional Resources

### Books
- "Site Reliability Engineering" by Google
- "The DevOps Handbook" by Gene Kim
- "Chaos Engineering" by Casey Rosenthal

### Tools
- **Backup**: Velero, pgBackRest, Restic
- **Replication**: PostgreSQL streaming replication, AWS RDS
- **Chaos Testing**: Chaos Monkey, Litmus, Gremlin
- **Monitoring**: Prometheus, Grafana, PagerDuty

### Best Practices
1. Test your backups regularly
2. Automate everything possible
3. Document all procedures
4. Train your team thoroughly
5. Run regular DR drills

## ✅ Module 09 Completion Checklist

- [ ] Implemented automated database backups
- [ ] Set up multi-region infrastructure
- [ ] Created read replicas for high availability
- [ ] Wrote disaster recovery scripts
- [ ] Implemented health monitoring and alerts
- [ ] Conducted chaos engineering tests
- [ ] Documented incident response procedures
- [ ] Successfully completed DR drill

**Next Module**: [10-certification-project.md](10-certification-project.md) - Build your final certification project.

---

## 📖 Learning Reflection

**What was the most critical aspect of disaster recovery for PRIMEPRE?**
[Write your response here]

**Which backup strategy would you implement first in a real-world scenario?**
[Write your response here]

**How often should DR drills be conducted for a logistics system?**
[Write your response here]
