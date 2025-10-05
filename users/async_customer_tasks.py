"""
Async background tasks for customer bulk creation.
Handles long-running Excel uploads that exceed Render's 60-100s timeout.
"""

import logging
from django.db import transaction
from django_q.tasks import async_task, result
from .customer_excel_utils import create_customer_from_data
from .models import CustomerUser, CustomerBulkUploadTask, BulkUploadStatus  # Track async task progress

logger = logging.getLogger(__name__)


def bulk_create_customers_task(customers_data, created_by_user_id, task_id):
    """
    Background task to create customers in batches.
    Runs asynchronously to bypass Render's timeout limits.
    
    Args:
        customers_data: List of customer dictionaries
        created_by_user_id: ID of user who initiated the upload
        task_id: Unique task identifier for progress tracking
    
    Returns:
        dict: {
            'success': True/False,
            'created': int,
            'failed': int,
            'errors': list,
            'task_id': str
        }
    """
    logger.info(f"[ASYNC-BULK-CREATE-START] Task: {task_id} | Customers: {len(customers_data)}")
    
    created_count = 0
    failed_count = 0
    errors = []
    tracker = None
    
    try:
        # Get the user who created this batch
        created_by_user = CustomerUser.objects.get(id=created_by_user_id)

        # Load tracker for status updates
        try:
            tracker = CustomerBulkUploadTask.objects.get(task_id=task_id)
            tracker.total_customers = len(customers_data)
            tracker.created_count = 0
            tracker.failed_count = 0
            tracker.errors = []
            tracker.save(update_fields=['total_customers', 'created_count', 'failed_count', 'errors', 'updated_at'])
            tracker.mark_running()
        except CustomerBulkUploadTask.DoesNotExist:
            tracker = None
            logger.warning(f"[ASYNC-BULK-CREATE-WARN] Tracker missing for task {task_id}")
        
        # Process in batches of 25 (same as sync version)
        batch_size = 25
        total_batches = (len(customers_data) + batch_size - 1) // batch_size
        
        for batch_num in range(total_batches):
            start_idx = batch_num * batch_size
            end_idx = min(start_idx + batch_size, len(customers_data))
            batch = customers_data[start_idx:end_idx]
            
            # Log progress every 20 batches (500 customers)
            if batch_num > 0 and batch_num % 20 == 0:
                logger.info(
                    f"[ASYNC-BULK-CREATE-PROGRESS] Task: {task_id} | "
                    f"Batch {batch_num}/{total_batches} | "
                    f"Processed: {start_idx}/{len(customers_data)} | "
                    f"Created: {created_count} | Failed: {failed_count}"
                )
            
            # Process each customer in the batch
            for idx, customer_data in enumerate(batch, start=start_idx + 1):
                try:
                    # Use individual transactions (prevents deadlocks)
                    with transaction.atomic():
                        customer = create_customer_from_data(customer_data, created_by_user)
                        created_count += 1
                        
                except Exception as e:
                    failed_count += 1
                    error_msg = f"Row {idx}: {str(e)}"
                    errors.append(error_msg)
                    logger.error(f"[ASYNC-BULK-CREATE-FAIL] Task: {task_id} | {error_msg}")

                if tracker and (idx % batch_size == 0 or idx == len(customers_data)):
                    tracker.created_count = created_count
                    tracker.failed_count = failed_count
                    tracker.errors = errors[:100]
                    tracker.save(update_fields=['created_count', 'failed_count', 'errors', 'updated_at'])
        
        logger.info(
            f"[ASYNC-BULK-CREATE-COMPLETE] Task: {task_id} | "
            f"Created: {created_count} | Failed: {failed_count}"
        )

        if tracker:
            tracker.mark_complete(created_count, failed_count, errors[:100])
        
        return {
            'success': True,
            'created': created_count,
            'failed': failed_count,
            'errors': errors[:100],  # Limit error list to first 100
            'task_id': task_id
        }
        
    except Exception as e:
        logger.error(f"[ASYNC-BULK-CREATE-ERROR] Task: {task_id} | {str(e)}", exc_info=True)
        if tracker:
            tracker.created_count = created_count
            tracker.failed_count = failed_count
            tracker.save(update_fields=['created_count', 'failed_count', 'updated_at'])
            tracker.mark_failed(errors[:100] + [str(e)])
        return {
            'success': False,
            'created': created_count,
            'failed': failed_count,
            'errors': [str(e)],
            'task_id': task_id
        }
