# 502 Bad Gateway Fix for Container Items Create Endpoint

## Problem Summary
The `/api/cargo/containers/items/create/` endpoint was returning **502 Bad Gateway** errors with CORS issues when trying to create cargo items from Excel uploads on Render deployment.

## Root Causes Identified

### 1. **Nested Transaction Deadlock**
**Issue**: The code had nested `transaction.atomic()` blocks which can cause database deadlocks:
```python
with transaction.atomic():  # Outer transaction
    # ... code ...
    with transaction.atomic():  # Inner transaction - PROBLEM!
        # ... create items ...
```

**Fix**: Removed outer transaction and use individual transactions for each item:
```python
# Process matched items without wrapping transaction
if matched_items:
    matcher.create_cargo_items(matched_items)

# Each resolved mapping gets its own transaction
for mapping in resolved_mappings:
    with transaction.atomic():
        # ... create single item ...
```

### 2. **Missing Error Handling**
**Issue**: If `matcher.create_cargo_items()` threw an exception, it would crash the entire request.

**Fix**: Added try-except blocks around batch operations:
```python
try:
    matcher = ShippingMarkMatcher(container_id)
    create_results = matcher.create_cargo_items(matched_items)
    created_items.extend(create_results.get('created_items', []))
    errors.extend(create_results.get('errors', []))
except Exception as exc:
    logger.error("Error processing matched items: %s", exc, exc_info=True)
    errors.append({'error': f'Failed to process matched items: {str(exc)}'})
```

### 3. **No Request Size Validation**
**Issue**: Large payloads could cause memory issues and timeouts on Render's free tier.

**Fix**: Added validation:
```python
total_items = len(matched_items) + len(resolved_mappings)
if total_items > 1000:
    return Response({
        'success': False,
        'error': f'Too many items ({total_items}). Maximum 1000 items per request.'
    }, status=status.HTTP_400_BAD_REQUEST)
```

### 4. **Missing Top-Level Exception Handler**
**Issue**: Any unexpected error would crash with no response, causing CORS errors.

**Fix**: Added top-level try-except:
```python
def post(self, request):
    try:
        # ... all logic ...
        return Response({...}, status=status.HTTP_201_CREATED)
    except Exception as exc:
        logger.error("Unexpected error: %s", exc, exc_info=True)
        return Response({
            'success': False,
            'error': 'Internal server error occurred',
            'details': str(exc)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
```

### 5. **Insufficient Logging**
**Issue**: No way to diagnose what went wrong on production.

**Fix**: Added comprehensive logging:
```python
logger.info("ContainerItemsCreateView received request from user %s", request.user.id)
logger.error("Error creating cargo item for container %s row %s: %s", 
             container_id, source_row, exc, exc_info=True)
```

## Changes Made

### File: `cargo/container_excel_views.py`

1. **Added request logging** at the start of `post()` method
2. **Added request size validation** (max 1000 items)
3. **Removed nested transactions** - outer transaction removed
4. **Added error handling for matched items processing**
5. **Individual transactions per resolved mapping** (prevents deadlocks)
6. **Added top-level exception handler** (prevents unhandled crashes)
7. **Improved error logging** throughout

## Why This Causes 502 Errors

When Python/Django crashes or times out:
1. The web server (gunicorn/uvicorn) detects the failure
2. Nginx/Render's proxy returns **502 Bad Gateway**
3. No response headers (including CORS) are sent
4. Browser shows CORS error because the response never reached it

The CORS error is a **symptom**, not the cause. The real issue was the backend crashing.

## Testing Locally

To test the fixes locally:

```bash
# Terminal 1: Start backend
cd primepre-logistics-system
python manage.py runserver

# Terminal 2: Start frontend
cd frontend
npm run dev

# Test with a container Excel upload and verify:
# 1. Request completes successfully
# 2. Check django.log for any errors
# 3. Items are created in database
```

## Deployment to Render

After deploying these changes:

1. **Monitor Render logs** for any errors:
   - Go to Render Dashboard → Your Service → Logs
   - Look for errors during Excel upload

2. **Check response times**:
   - Large uploads may still timeout on free tier
   - Consider upgrading to paid tier for better performance

3. **Database connection pool**:
   - Ensure `DATABASE_URL` has proper connection pooling
   - Free tier has limited connections

## Prevention for Future

1. **Never nest transactions** unless absolutely necessary
2. **Always wrap API endpoints** in top-level try-except
3. **Validate request sizes** early
4. **Add comprehensive logging** for production debugging
5. **Test with large datasets** before deploying
6. **Monitor memory usage** on free tier deployments

## Additional Recommendations

### 1. Add Rate Limiting
Consider adding rate limiting to prevent abuse:
```python
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

class ContainerItemsCreateView(APIView):
    throttle_classes = [UserRateThrottle]
```

### 2. Add Celery for Large Batches
For very large uploads, consider using Celery:
```python
@shared_task
def process_container_items_async(container_id, matched_items, resolved_mappings):
    # ... processing logic ...
    pass
```

### 3. Implement Batch Processing
Break large uploads into smaller chunks:
```python
BATCH_SIZE = 100
for i in range(0, len(items), BATCH_SIZE):
    batch = items[i:i+BATCH_SIZE]
    process_batch(batch)
```

### 4. Add Health Check Endpoint
Monitor backend health:
```python
@api_view(['GET'])
def health_check(request):
    return Response({
        'status': 'healthy',
        'database': 'connected',
        'timestamp': timezone.now()
    })
```

## Monitoring on Render

Watch these metrics after deployment:
- **Response times** - Should be < 30 seconds
- **Memory usage** - Should stay < 512MB on free tier  
- **Database connections** - Check for connection leaks
- **Error rate** - Should be near 0%

## Support

If issues persist after these fixes:
1. Check Render logs for specific error messages
2. Verify database connection limits
3. Consider upgrading to paid tier for better resources
4. Check if specific Excel files cause issues (data validation)
