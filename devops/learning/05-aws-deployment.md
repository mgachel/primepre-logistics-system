# ☁️ Module 05: AWS Deployment - PRIMEPRE in the Cloud

## 🎯 Learning Objectives

By the end of this module, you will:
- Deploy PRIMEPRE to AWS with best practices
- Implement Infrastructure as Code with Terraform
- Set up auto-scaling and load balancing
- Configure managed databases and caching
- Implement monitoring and logging solutions

## 📚 Part 1: Understanding AWS for Logistics (20 minutes)

### Why AWS for Global Logistics?

PRIMEPRE operates between China and Ghana - you need global infrastructure:

```
🌍 GLOBAL PRIMEPRE INFRASTRUCTURE

┌─────────────────────────────────────────────────────────────────┐
│                        AWS GLOBAL NETWORK                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🇨🇳 Asia Pacific (Singapore)     🇬🇭 Africa (Cape Town)      │
│  ┌─────────────────────────┐     ┌─────────────────────────┐   │
│  │ Primary Data Center     │     │ Secondary Data Center   │   │
│  │ ├─ EKS Cluster         │◄────┤ ├─ EKS Cluster         │   │
│  │ ├─ RDS PostgreSQL      │     │ │ ├─ RDS Read Replica   │   │
│  │ ├─ ElastiCache Redis   │     │ │ ├─ ElastiCache        │   │
│  │ ├─ S3 Media Storage    │────►│ │ └─ S3 Cross Replication│   │
│  │ └─ CloudFront CDN      │     │ └─────────────────────────┘   │
│  └─────────────────────────┘     │                             │
│              │                   │  🌐 Global CDN              │
│              │                   │  ├─ Edge Locations          │
│              │                   │  ├─ Fast Content Delivery   │
│              │                   │  └─ DDoS Protection         │
│              │                   └─────────────────────────────┘
│              │                                                 │
│  🇺🇸 US East (Virginia) - Control Center                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Management & Monitoring                                 │   │
│  │ ├─ CloudWatch (Monitoring)                             │   │
│  │ ├─ CloudTrail (Auditing)                              │   │
│  │ ├─ Systems Manager (Configuration)                     │   │
│  │ └─ Route 53 (DNS & Health Checks)                     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### AWS Services for PRIMEPRE

| Service | Purpose | Benefit |
|---------|---------|---------|
| **EKS** | Kubernetes clusters | Auto-scaling, high availability |
| **RDS** | PostgreSQL database | Automated backups, multi-AZ |
| **ElastiCache** | Redis caching | Sub-millisecond response |
| **S3** | File storage | 99.999999999% durability |
| **CloudFront** | CDN | Global content delivery |
| **Route 53** | DNS + Health checks | 100% uptime SLA |
| **ALB** | Load balancing | Intelligent traffic routing |
| **CloudWatch** | Monitoring | Real-time metrics & alerts |

## 💻 Part 2: Hands-On - Infrastructure as Code (60 minutes)

### Step 1: Install Required Tools

```bash
# Install Terraform
# Windows (using Chocolatey):
choco install terraform

# Install AWS CLI v2
# Download from: https://aws.amazon.com/cli/

# Install kubectl
choco install kubernetes-cli

# Install eksctl
choco install eksctl

# Verify installations
terraform --version
aws --version
kubectl version --client
eksctl version
```

### Step 2: AWS Account Setup

```bash
# Configure AWS credentials
aws configure
# AWS Access Key ID: [Your Access Key]
# AWS Secret Access Key: [Your Secret Key]  
# Default region name: us-east-1
# Default output format: json

# Test access
aws sts get-caller-identity
```

### Step 3: Create Terraform Infrastructure

Create `devops/terraform/main.tf`:

```hcl
# PRIMEPRE AWS Infrastructure
terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }
  
  backend "s3" {
    bucket = "primepre-terraform-state"
    key    = "infrastructure/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "PRIMEPRE"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# Local variables
locals {
  cluster_name = "primepre-${var.environment}"
  
  common_tags = {
    Project     = "PRIMEPRE"
    Environment = var.environment
    Owner       = "DevOps Team"
  }
}
```

Create `devops/terraform/variables.tf`:

```hcl
variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "cluster_version" {
  description = "Kubernetes cluster version"
  type        = string
  default     = "1.28"
}

variable "node_instance_types" {
  description = "EC2 instance types for worker nodes"
  type        = list(string)
  default     = ["t3.medium", "t3.large"]
}

variable "node_desired_capacity" {
  description = "Desired number of worker nodes"
  type        = number
  default     = 3
}

variable "node_max_capacity" {
  description = "Maximum number of worker nodes"
  type        = number
  default     = 10
}

variable "node_min_capacity" {
  description = "Minimum number of worker nodes"
  type        = number
  default     = 1
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "cache_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}
```

Create `devops/terraform/vpc.tf`:

```hcl
# VPC Configuration for PRIMEPRE
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  
  name = "${local.cluster_name}-vpc"
  cidr = "10.0.0.0/16"
  
  azs             = slice(data.aws_availability_zones.available.names, 0, 3)
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  
  enable_nat_gateway   = true
  enable_vpn_gateway   = false
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  # Tags for EKS
  public_subnet_tags = {
    "kubernetes.io/cluster/${local.cluster_name}" = "shared"
    "kubernetes.io/role/elb"                      = "1"
  }
  
  private_subnet_tags = {
    "kubernetes.io/cluster/${local.cluster_name}" = "shared"
    "kubernetes.io/role/internal-elb"             = "1"
  }
  
  tags = local.common_tags
}

# Security Groups
resource "aws_security_group" "rds" {
  name_prefix = "${local.cluster_name}-rds"
  vpc_id      = module.vpc.vpc_id
  
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [module.vpc.vpc_cidr_block]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-rds"
  })
}

resource "aws_security_group" "elasticache" {
  name_prefix = "${local.cluster_name}-elasticache"
  vpc_id      = module.vpc.vpc_id
  
  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [module.vpc.vpc_cidr_block]
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-elasticache"
  })
}
```

Create `devops/terraform/eks.tf`:

```hcl
# EKS Cluster for PRIMEPRE
module "eks" {
  source = "terraform-aws-modules/eks/aws"
  
  cluster_name    = local.cluster_name
  cluster_version = var.cluster_version
  
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
  
  # Cluster endpoint configuration
  cluster_endpoint_private_access = true
  cluster_endpoint_public_access  = true
  cluster_endpoint_public_access_cidrs = ["0.0.0.0/0"]
  
  # EKS Managed Node Groups
  eks_managed_node_groups = {
    primepre_nodes = {
      name = "primepre-nodes"
      
      instance_types = var.node_instance_types
      
      min_size     = var.node_min_capacity
      max_size     = var.node_max_capacity
      desired_size = var.node_desired_capacity
      
      # Disk configuration
      disk_size = 50
      disk_type = "gp3"
      
      # Networking
      subnet_ids = module.vpc.private_subnets
      
      # Node group configuration
      ami_type       = "AL2_x86_64"
      capacity_type  = "ON_DEMAND"
      
      # Launch template
      create_launch_template = true
      launch_template_name   = "${local.cluster_name}-launch-template"
      
      # User data
      pre_bootstrap_user_data = <<-EOT
        #!/bin/bash
        # Install additional packages
        yum update -y
        yum install -y amazon-cloudwatch-agent
      EOT
      
      # Taints and labels
      taints = {}
      labels = {
        Environment = var.environment
        NodeGroup   = "primepre-nodes"
      }
      
      tags = local.common_tags
    }
  }
  
  # Cluster add-ons
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
    aws-ebs-csi-driver = {
      most_recent = true
    }
  }
  
  tags = local.common_tags
}

# AWS Load Balancer Controller
resource "aws_iam_role" "aws_load_balancer_controller" {
  name = "${local.cluster_name}-aws-load-balancer-controller"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = module.eks.oidc_provider_arn
        }
        Condition = {
          StringEquals = {
            "${replace(module.eks.cluster_oidc_issuer_url, "https://", "")}:sub": "system:serviceaccount:kube-system:aws-load-balancer-controller"
            "${replace(module.eks.cluster_oidc_issuer_url, "https://", "")}:aud": "sts.amazonaws.com"
          }
        }
      }
    ]
  })
  
  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "aws_load_balancer_controller" {
  policy_arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:policy/AWSLoadBalancerControllerIAMPolicy"
  role       = aws_iam_role.aws_load_balancer_controller.name
}
```

Create `devops/terraform/rds.tf`:

```hcl
# RDS Database for PRIMEPRE
resource "aws_db_subnet_group" "primepre" {
  name       = "${local.cluster_name}-db-subnet-group"
  subnet_ids = module.vpc.private_subnets
  
  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-db-subnet-group"
  })
}

resource "aws_db_parameter_group" "primepre" {
  family = "postgres15"
  name   = "${local.cluster_name}-db-params"
  
  parameter {
    name  = "log_statement"
    value = "all"
  }
  
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # Log queries taking longer than 1 second
  }
  
  tags = local.common_tags
}

resource "aws_db_instance" "primepre" {
  identifier = "${local.cluster_name}-database"
  
  # Engine configuration
  engine                = "postgres"
  engine_version        = "15.4"
  instance_class        = var.db_instance_class
  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true
  
  # Database configuration
  db_name  = "primepre"
  username = "primepre_admin"
  password = random_password.db_password.result
  
  # Network configuration
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.primepre.name
  publicly_accessible    = false
  
  # Backup configuration
  backup_retention_period   = 7
  backup_window            = "03:00-04:00"
  maintenance_window       = "Mon:04:00-Mon:05:00"
  auto_minor_version_upgrade = true
  
  # Performance configuration
  parameter_group_name = aws_db_parameter_group.primepre.name
  monitoring_interval  = 60
  monitoring_role_arn  = aws_iam_role.rds_monitoring.arn
  
  # Deletion protection
  deletion_protection = var.environment == "production"
  skip_final_snapshot = var.environment != "production"
  
  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-database"
  })
}

# Generate random password for database
resource "random_password" "db_password" {
  length  = 32
  special = true
}

# Store password in AWS Secrets Manager
resource "aws_secretsmanager_secret" "db_password" {
  name = "${local.cluster_name}/database/password"
  
  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = jsonencode({
    username = aws_db_instance.primepre.username
    password = random_password.db_password.result
    host     = aws_db_instance.primepre.endpoint
    port     = aws_db_instance.primepre.port
    dbname   = aws_db_instance.primepre.db_name
  })
}

# IAM role for RDS monitoring
resource "aws_iam_role" "rds_monitoring" {
  name = "${local.cluster_name}-rds-monitoring"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
  
  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}
```

Create `devops/terraform/elasticache.tf`:

```hcl
# ElastiCache Redis for PRIMEPRE
resource "aws_elasticache_subnet_group" "primepre" {
  name       = "${local.cluster_name}-cache-subnet"
  subnet_ids = module.vpc.private_subnets
  
  tags = local.common_tags
}

resource "aws_elasticache_parameter_group" "primepre" {
  family = "redis7.x"
  name   = "${local.cluster_name}-cache-params"
  
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }
  
  tags = local.common_tags
}

resource "aws_elasticache_replication_group" "primepre" {
  replication_group_id       = "${local.cluster_name}-redis"
  description                = "Redis cluster for PRIMEPRE ${var.environment}"
  
  # Node configuration
  node_type                  = var.cache_node_type
  port                       = 6379
  parameter_group_name       = aws_elasticache_parameter_group.primepre.name
  
  # Cluster configuration
  num_cache_clusters         = 2
  
  # Network configuration
  subnet_group_name          = aws_elasticache_subnet_group.primepre.name
  security_group_ids         = [aws_security_group.elasticache.id]
  
  # Security configuration
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth.result
  
  # Backup configuration
  snapshot_retention_limit   = 5
  snapshot_window           = "03:00-05:00"
  maintenance_window        = "mon:05:00-mon:07:00"
  
  # Automatic failover
  automatic_failover_enabled = true
  multi_az_enabled          = true
  
  tags = local.common_tags
}

# Generate auth token for Redis
resource "random_password" "redis_auth" {
  length  = 32
  special = false
}

# Store Redis auth token in Secrets Manager
resource "aws_secretsmanager_secret" "redis_auth" {
  name = "${local.cluster_name}/redis/auth"
  
  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "redis_auth" {
  secret_id     = aws_secretsmanager_secret.redis_auth.id
  secret_string = jsonencode({
    auth_token = random_password.redis_auth.result
    host       = aws_elasticache_replication_group.primepre.primary_endpoint_address
    port       = aws_elasticache_replication_group.primepre.port
  })
}
```

### Step 4: Deploy Infrastructure

```bash
# Navigate to terraform directory
cd c:\Users\user\Desktop\PRIMEPRE\devops\terraform

# Initialize Terraform
terraform init

# Plan infrastructure changes
terraform plan -var="environment=production"

# Apply infrastructure
terraform apply -var="environment=production"
```

### Step 5: Configure kubectl for EKS

```bash
# Update kubeconfig for EKS cluster
aws eks update-kubeconfig --region us-east-1 --name primepre-production

# Verify connection
kubectl get nodes

# Install AWS Load Balancer Controller
helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=primepre-production \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller
```

## 🧪 Part 3: Practice Exercises (30 minutes)

### Exercise 1: Deploy PRIMEPRE to AWS EKS

```bash
# Update Kubernetes manifests for AWS
cd c:\Users\user\Desktop\PRIMEPRE\devops\k8s

# Update ConfigMap with AWS-specific values
kubectl apply -f namespace.yaml
kubectl apply -f config.yaml
kubectl apply -f backend.yaml
kubectl apply -f frontend.yaml

# Create AWS Load Balancer Ingress
cat > ingress-aws.yaml << EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: primepre-ingress
  namespace: primepre
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/ssl-policy: ELBSecurityPolicy-TLS-1-2-2017-01
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT-ID
spec:
  rules:
  - host: primepre.com
    http:
      paths:
      - path: /api
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
EOF

kubectl apply -f ingress-aws.yaml
```

### Exercise 2: Test Auto-Scaling

```bash
# Generate load to test auto-scaling
kubectl run -i --tty load-generator --rm --image=busybox --restart=Never -- /bin/sh

# Inside the pod:
while true; do wget -q -O- http://backend-service:8000/api/health/; done

# In another terminal, watch pods scale
kubectl get hpa -w
kubectl get pods -w
```

### Exercise 3: Monitor AWS Resources

```bash
# View AWS resources
aws eks describe-cluster --name primepre-production
aws rds describe-db-instances --db-instance-identifier primepre-production-database
aws elasticache describe-replication-groups --replication-group-id primepre-production-redis

# Check CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/EKS \
  --metric-name cluster_failed_request_count \
  --dimensions Name=ClusterName,Value=primepre-production \
  --start-time 2025-07-03T00:00:00Z \
  --end-time 2025-07-03T23:59:59Z \
  --period 3600 \
  --statistics Sum
```

## 📝 Part 4: Reflection and Documentation (10 minutes)

### What You've Accomplished Today:

1. **Production AWS Infrastructure**
   - EKS cluster with auto-scaling
   - RDS PostgreSQL with backups
   - ElastiCache Redis cluster

2. **Infrastructure as Code**
   - Terraform for reproducible infrastructure
   - Version-controlled infrastructure
   - Environment-specific configurations

3. **Enterprise Features**
   - High availability across AZs
   - Encryption at rest and in transit
   - Automated backups and monitoring

### Key Terraform Commands:
```bash
terraform init                    # Initialize
terraform plan                   # Preview changes
terraform apply                  # Apply changes
terraform destroy                # Remove infrastructure
terraform state list             # List resources
terraform output                 # Show outputs
```

## 🚀 Tomorrow's Preview

In Module 06, we'll learn:
- Advanced monitoring with Prometheus and Grafana
- Centralized logging with ELK stack
- Custom metrics and alerting
- Performance optimization

## 🎯 Challenge Exercise (Optional)

Enhance your AWS deployment:
1. **Multi-Region Setup** - Deploy to multiple AWS regions
2. **Blue-Green Deployment** - Set up blue-green deployment strategy
3. **Cost Optimization** - Implement spot instances and reserved capacity
4. **Backup Strategy** - Automated cross-region backups

## 🆘 Troubleshooting

### Common Issues:

**Q: Terraform apply fails with permissions**
A: Check IAM permissions, ensure you have admin access or required policies

**Q: EKS nodes not joining cluster**
A: Verify security groups, check node group configuration

**Q: RDS connection issues**
A: Check security groups, verify subnets, confirm password

**Q: High AWS costs**
A: Review instance sizes, enable cost monitoring, consider spot instances

---

**🎉 Congratulations on Module 05!**

You've successfully deployed PRIMEPRE to AWS with enterprise-grade infrastructure. Your logistics system now runs on the same cloud infrastructure used by companies like Netflix, Airbnb, and NASA.

**Ready for monitoring?** 👉 [Module 06: Monitoring & Observability](./06-monitoring.md)
