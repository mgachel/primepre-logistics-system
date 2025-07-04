# 🚀 Module 08: Performance Optimization - Scaling PRIMEPRE

## 🎯 Learning Objectives

By the end of this module, you will:
- Understand performance bottlenecks in logistics systems
- Implement caching strategies for high-traffic applications
- Optimize database queries and indexing
- Configure auto-scaling for dynamic workloads
- Implement CDN for global content delivery
- Use load balancing for high availability

## 📚 Part 1: Understanding Performance in Logistics Systems (20 minutes)

### Performance Challenges in Logistics

PRIMEPRE handles critical logistics operations. Performance issues can mean:
- **Lost Revenue** - Delayed shipments cost money
- **Customer Dissatisfaction** - Slow tracking updates
- **Operational Inefficiency** - Manual workarounds
- **Competitive Disadvantage** - Customers switch to faster platforms

### Performance Metrics That Matter

```
📊 PRIMEPRE PERFORMANCE METRICS

🎯 User Experience Metrics:
├── Page Load Time < 2 seconds
├── API Response Time < 500ms
├── Search Results < 1 second
└── Real-time Updates < 100ms

🔧 System Metrics:
├── CPU Usage < 70%
├── Memory Usage < 80%
├── Database Query Time < 100ms
└── Network Latency < 50ms

📈 Business Metrics:
├── Order Processing Rate > 1000/hour
├── Tracking Update Frequency < 5 minutes
├── System Uptime > 99.9%
└── Error Rate < 0.1%
```

## 💻 Part 2: Hands-On - Implementing Caching (60 minutes)

### Step 1: Redis Cache for PRIMEPRE Backend

Let's implement Redis caching for your Django backend:

```python
# File: c:\Users\user\Desktop\PRIMEPRE\backend\primepre\settings.py

# Add to INSTALLED_APPS
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'GoodsRecieved',
    'users',
    'django_redis',  # Add this
]

# Redis Cache Configuration
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Session storage
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'
```

### Step 2: Cache Optimization for Views

```python
# File: c:\Users\user\Desktop\PRIMEPRE\backend\GoodsRecieved\views.py

from django.core.cache import cache
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework.decorators import api_view
import json

class GoodsReceivedViewSet(viewsets.ModelViewSet):
    queryset = GoodsReceivedChina.objects.all()
    serializer_class = GoodsReceivedChinaSerializer
    
    @method_decorator(cache_page(60 * 15))  # Cache for 15 minutes
    def list(self, request):
        """List all goods with caching"""
        cache_key = f"goods_list_{request.user.id}"
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return Response(cached_data)
        
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        # Cache the result
        cache.set(cache_key, serializer.data, 60 * 15)
        return Response(serializer.data)

    def create(self, request):
        """Create goods and invalidate cache"""
        response = super().create(request)
        
        # Invalidate related caches
        cache.delete_pattern("goods_list_*")
        cache.delete_pattern("dashboard_stats_*")
        
        return response

# Dashboard statistics caching
@api_view(['GET'])
def dashboard_stats(request):
    """Get dashboard statistics with caching"""
    cache_key = f"dashboard_stats_{request.user.id}"
    cached_stats = cache.get(cache_key)
    
    if cached_stats:
        return Response(cached_stats)
    
    # Calculate expensive statistics
    stats = {
        'total_shipments': GoodsReceivedChina.objects.count(),
        'pending_shipments': GoodsReceivedChina.objects.filter(status='pending').count(),
        'completed_shipments': GoodsReceivedChina.objects.filter(status='completed').count(),
        'monthly_volume': calculate_monthly_volume(),
        'top_customers': get_top_customers(),
    }
    
    # Cache for 30 minutes
    cache.set(cache_key, stats, 60 * 30)
    return Response(stats)
```

### Step 3: Frontend Performance Optimization

```javascript
// File: c:\Users\user\Desktop\PRIMEPRE\frontend\src\services\api.js

import axios from 'axios';

// Create axios instance with caching
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  headers: {
    'Cache-Control': 'max-age=300', // 5 minutes
  },
});

// Request interceptor for caching
api.interceptors.request.use((config) => {
  // Add timestamp for cache busting on critical operations
  if (config.method === 'post' || config.method === 'put' || config.method === 'delete') {
    config.params = { ...config.params, _t: Date.now() };
  }
  return config;
});

// Response interceptor for performance monitoring
api.interceptors.response.use(
  (response) => {
    // Log slow requests
    const duration = Date.now() - response.config.metadata.startTime;
    if (duration > 2000) {
      console.warn(`Slow API request: ${response.config.url} took ${duration}ms`);
    }
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export default api;
```

## 🔧 Part 3: Database Optimization (45 minutes)

### Step 1: Database Indexing Strategy

```python
# File: c:\Users\user\Desktop\PRIMEPRE\backend\GoodsRecieved\models.py

from django.db import models
from django.contrib.auth.models import User

class GoodsReceivedChina(models.Model):
    # ... existing fields ...
    
    class Meta:
        # Add database indexes for better query performance
        indexes = [
            models.Index(fields=['created_at'], name='goods_created_idx'),
            models.Index(fields=['status'], name='goods_status_idx'),
            models.Index(fields=['customer'], name='goods_customer_idx'),
            models.Index(fields=['location'], name='goods_location_idx'),
            models.Index(fields=['created_at', 'status'], name='goods_created_status_idx'),
        ]
        ordering = ['-created_at']

# Create migration for indexes
# Run: python manage.py makemigrations
# Run: python manage.py migrate
```

### Step 2: Query Optimization

```python
# File: c:\Users\user\Desktop\PRIMEPRE\backend\GoodsRecieved\views.py

from django.db.models import Prefetch, Count, Q
from django.db.models.query import QuerySet

class OptimizedGoodsReceivedViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        """Optimized queryset with select_related and prefetch_related"""
        queryset = GoodsReceivedChina.objects.select_related(
            'customer',
            'created_by'
        ).prefetch_related(
            'attachments',
            'tracking_updates'
        ).annotate(
            attachment_count=Count('attachments')
        )
        
        # Apply filters efficiently
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Date range filter
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date and end_date:
            queryset = queryset.filter(
                created_at__date__range=[start_date, end_date]
            )
        
        return queryset
    
    def list(self, request):
        """Paginated list with efficient querying"""
        queryset = self.get_queryset()
        
        # Use pagination to avoid loading too much data
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
```

## ☁️ Part 4: Auto-Scaling Configuration (45 minutes)

### Step 1: Kubernetes Horizontal Pod Autoscaler

```yaml
# File: c:\Users\user\Desktop\PRIMEPRE\devops\k8s\hpa.yaml

apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: primepre-backend-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: primepre-backend
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
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

### Step 2: AWS Auto Scaling Group

```yaml
# File: c:\Users\user\Desktop\PRIMEPRE\devops\terraform\autoscaling.tf

resource "aws_autoscaling_group" "primepre_asg" {
  name                = "primepre-asg"
  vpc_zone_identifier = module.vpc.private_subnets
  target_group_arns   = [aws_lb_target_group.primepre_backend.arn]
  health_check_type   = "ELB"
  
  min_size         = 2
  max_size         = 10
  desired_capacity = 3
  
  launch_template {
    id      = aws_launch_template.primepre.id
    version = "$Latest"
  }
  
  # Scaling policies
  enabled_metrics = [
    "GroupMinSize",
    "GroupMaxSize",
    "GroupDesiredCapacity",
    "GroupInServiceInstances",
    "GroupTotalInstances"
  ]
  
  tag {
    key                 = "Name"
    value               = "primepre-asg"
    propagate_at_launch = true
  }
}

# Scale up policy
resource "aws_autoscaling_policy" "scale_up" {
  name                   = "primepre-scale-up"
  scaling_adjustment     = 2
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = aws_autoscaling_group.primepre_asg.name
}

# Scale down policy
resource "aws_autoscaling_policy" "scale_down" {
  name                   = "primepre-scale-down"
  scaling_adjustment     = -1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = aws_autoscaling_group.primepre_asg.name
}

# CloudWatch alarms
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "primepre-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "120"
  statistic           = "Average"
  threshold           = "70"
  alarm_description   = "This metric monitors ec2 cpu utilization"
  alarm_actions       = [aws_autoscaling_policy.scale_up.arn]

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.primepre_asg.name
  }
}
```

## 🌍 Part 5: CDN Implementation (30 minutes)

### Step 1: AWS CloudFront for Global Delivery

```yaml
# File: c:\Users\user\Desktop\PRIMEPRE\devops\terraform\cdn.tf

resource "aws_cloudfront_distribution" "primepre_cdn" {
  origin {
    domain_name = aws_s3_bucket.primepre_frontend.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.primepre_frontend.bucket}"
    
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai.cloudfront_access_identity_path
    }
  }
  
  # Secondary origin for API
  origin {
    domain_name = aws_lb.primepre_backend.dns_name
    origin_id   = "ALB-${aws_lb.primepre_backend.name}"
    
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }
  
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  
  # Cache behavior for API
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ALB-${aws_lb.primepre_backend.name}"
    
    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type"]
      cookies {
        forward = "none"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
  }
  
  # Default cache behavior for frontend
  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.primepre_frontend.bucket}"
    
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }
  
  # Geo restrictions
  restrictions {
    geo_restriction {
      restriction_type = "whitelist"
      locations        = ["US", "CA", "GB", "DE", "GH", "CN"]
    }
  }
  
  # SSL certificate
  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate.primepre_cert.arn
    ssl_support_method  = "sni-only"
  }
  
  tags = {
    Name = "PRIMEPRE CDN"
  }
}
```

## 📊 Part 6: Load Testing and Monitoring (45 minutes)

### Step 1: Performance Testing with Artillery

```yaml
# File: c:\Users\user\Desktop\PRIMEPRE\devops\performance\load-test.yml

config:
  target: 'https://api.primepre.com'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"
    - duration: 120
      arrivalRate: 100
      name: "Peak load"
  defaults:
    headers:
      Authorization: 'Bearer {{ $processEnvironment.API_TOKEN }}'
      Content-Type: 'application/json'

scenarios:
  - name: "Logistics Operations"
    weight: 70
    flow:
      - get:
          url: "/api/goods-received/"
          capture:
            - json: "$.results[0].id"
              as: "goodsId"
      - get:
          url: "/api/goods-received/{{ goodsId }}/"
      - post:
          url: "/api/tracking-updates/"
          json:
            goods_id: "{{ goodsId }}"
            status: "in_transit"
            location: "Port of Shanghai"
            notes: "Load testing update"
  
  - name: "Dashboard Analytics"
    weight: 20
    flow:
      - get:
          url: "/api/dashboard/stats/"
      - get:
          url: "/api/dashboard/charts/"
  
  - name: "User Authentication"
    weight: 10
    flow:
      - post:
          url: "/api/auth/login/"
          json:
            username: "{{ $randomString() }}"
            password: "testpass123"
```

### Step 2: Continuous Performance Monitoring

```python
# File: c:\Users\user\Desktop\PRIMEPRE\backend\GoodsRecieved\middleware.py

import time
import logging
from django.utils.deprecation import MiddlewareMixin
from prometheus_client import Counter, Histogram, Gauge

# Prometheus metrics
REQUEST_COUNT = Counter('primepre_requests_total', 'Total requests', ['method', 'endpoint', 'status'])
REQUEST_DURATION = Histogram('primepre_request_duration_seconds', 'Request duration', ['method', 'endpoint'])
ACTIVE_CONNECTIONS = Gauge('primepre_active_connections', 'Active connections')

class PerformanceMonitoringMiddleware(MiddlewareMixin):
    def process_request(self, request):
        request.start_time = time.time()
        ACTIVE_CONNECTIONS.inc()
        
    def process_response(self, request, response):
        if hasattr(request, 'start_time'):
            duration = time.time() - request.start_time
            
            # Record metrics
            REQUEST_COUNT.labels(
                method=request.method,
                endpoint=request.path,
                status=response.status_code
            ).inc()
            
            REQUEST_DURATION.labels(
                method=request.method,
                endpoint=request.path
            ).observe(duration)
            
            # Log slow requests
            if duration > 2.0:
                logging.warning(f"Slow request: {request.method} {request.path} took {duration:.2f}s")
        
        ACTIVE_CONNECTIONS.dec()
        return response
```

## 🎯 Hands-On Project: Complete Performance Optimization

### Project: Optimize PRIMEPRE for Black Friday Traffic

**Scenario**: PRIMEPRE expects 10x normal traffic during Black Friday sales. You need to optimize the system to handle the load.

**Tasks**:

1. **Implement Caching Layer**
   ```bash
   # Install Redis
   docker run -d --name redis -p 6379:6379 redis:alpine
   
   # Add caching to your Django views
   pip install django-redis
   ```

2. **Database Optimization**
   ```bash
   # Create database indexes
   python manage.py makemigrations
   python manage.py migrate
   
   # Analyze slow queries
   python manage.py dbshell
   ```

3. **Setup Auto-Scaling**
   ```bash
   # Deploy HPA configuration
   kubectl apply -f devops/k8s/hpa.yaml
   
   # Monitor scaling
   kubectl get hpa
   ```

4. **Load Testing**
   ```bash
   # Install Artillery
   npm install -g artillery
   
   # Run load tests
   artillery run devops/performance/load-test.yml
   ```

5. **CDN Configuration**
   ```bash
   # Deploy CloudFront
   cd devops/terraform
   terraform apply
   ```

### Success Metrics
- Page load time < 2 seconds under load
- API response time < 500ms
- Successfully handle 1000+ concurrent users
- 99.9% uptime during peak traffic

## 🔍 Troubleshooting Performance Issues

### Common Problems and Solutions

1. **High CPU Usage**
   ```bash
   # Check CPU usage
   kubectl top pods
   
   # Scale up immediately
   kubectl scale deployment primepre-backend --replicas=5
   ```

2. **Memory Leaks**
   ```bash
   # Monitor memory usage
   kubectl get pods -o wide
   
   # Check memory limits
   kubectl describe pod primepre-backend-xxx
   ```

3. **Database Connection Pool Exhaustion**
   ```python
   # Adjust database settings
   DATABASES = {
       'default': {
           'ENGINE': 'django.db.backends.postgresql',
           'OPTIONS': {
               'MAX_CONNS': 20,
               'CONN_MAX_AGE': 600,
           }
       }
   }
   ```

4. **Cache Invalidation Issues**
   ```python
   # Smart cache invalidation
   def invalidate_related_caches(instance):
       patterns = [
           f"goods_{instance.id}_*",
           f"customer_{instance.customer_id}_*",
           "dashboard_stats_*"
       ]
       for pattern in patterns:
           cache.delete_pattern(pattern)
   ```

## 📚 Additional Resources

### Books
- "High Performance Django" by Peter Baumgartner
- "Designing Data-Intensive Applications" by Martin Kleppmann

### Tools
- **Load Testing**: Artillery, JMeter, k6
- **Monitoring**: New Relic, Datadog, AppDynamics
- **Profiling**: Django Debug Toolbar, py-spy

### Best Practices
1. Always measure before optimizing
2. Use caching strategically
3. Optimize database queries first
4. Monitor real user metrics
5. Test under realistic conditions

## ✅ Module 08 Completion Checklist

- [ ] Implemented Redis caching for Django views
- [ ] Added database indexes and query optimization
- [ ] Configured auto-scaling with HPA
- [ ] Set up CDN for global content delivery
- [ ] Performed load testing with Artillery
- [ ] Implemented performance monitoring
- [ ] Successfully handled 10x traffic increase
- [ ] Documented performance optimization strategies

**Next Module**: [09-disaster-recovery.md](09-disaster-recovery.md) - Build resilient systems that can recover from any failure.

---

## 📖 Learning Reflection

**What was the most challenging part of this module?**
[Write your response here]

**What performance optimization technique will you use first in your projects?**
[Write your response here]

**How will you monitor performance in production?**
[Write your response here]
