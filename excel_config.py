"""
Centralized Excel Upload Configuration
Provides consistent limits and batch sizes across all Excel upload endpoints.
"""

# File upload limits
MAX_FILE_SIZE_MB = 50  # Increased from 10MB to handle large files
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

# Row processing limits for different upload types
MAX_ROWS = {
    'customer_upload': 10000,      # Customer bulk uploads (4K-7K typical)
    'container_items': 5000,       # Container items per upload
    'goods_received': 10000,       # Goods received entries
    'sea_cargo': 5000,             # Sea cargo entries
    'general': 10000,              # Default for any Excel upload
}

# Batch sizes for processing (memory management)
BATCH_SIZES = {
    'customer_upload': 25,         # Small batches for customer creation
    'container_items': 50,         # Medium batches for cargo items
    'goods_received': 100,         # Larger batches for simple records
    'sea_cargo': 50,               # Medium batches for cargo
    'general': 50,                 # Default batch size
}

# Worker timeout settings
PROCESSING_TIMEOUT_SECONDS = 300  # 5 minutes max for any upload

# Memory management
MAX_MEMORY_PER_WORKER_MB = 150  # Safe limit for Render free tier (512MB total)

# Validation settings
VALIDATE_ALL_ROWS_BEFORE_PROCESSING = False  # Process incrementally to save memory
ALLOW_PARTIAL_SUCCESS = True  # Continue processing even if some rows fail

# Error handling
MAX_ERRORS_BEFORE_ABORT = 1000  # Stop processing if too many errors
LOG_EVERY_N_ROWS = 100  # Log progress every N rows

# File format settings
ALLOWED_EXTENSIONS = ['.xlsx', '.xls']
DEFAULT_SHEET_INDEX = 0
MAX_HEADER_SEARCH_ROWS = 20  # Search first 20 rows for headers

# Database settings
USE_BULK_CREATE = True  # Use bulk_create when possible
BULK_CREATE_BATCH_SIZE = 100  # Rows per bulk_create call
USE_INDIVIDUAL_TRANSACTIONS = True  # Each item in own transaction (prevents deadlocks)

def get_max_rows(upload_type: str = 'general') -> int:
    """Get maximum rows allowed for upload type."""
    return MAX_ROWS.get(upload_type, MAX_ROWS['general'])

def get_batch_size(upload_type: str = 'general') -> int:
    """Get optimal batch size for upload type."""
    return BATCH_SIZES.get(upload_type, BATCH_SIZES['general'])

def validate_file_size(file_size: int) -> tuple[bool, str]:
    """
    Validate file size.
    Returns: (is_valid, error_message)
    """
    if file_size > MAX_FILE_SIZE_BYTES:
        size_mb = file_size / (1024 * 1024)
        return False, f'File size ({size_mb:.1f}MB) exceeds maximum allowed size ({MAX_FILE_SIZE_MB}MB)'
    return True, ''

def validate_row_count(row_count: int, upload_type: str = 'general') -> tuple[bool, str]:
    """
    Validate row count for upload type.
    Returns: (is_valid, error_message)
    """
    max_rows = get_max_rows(upload_type)
    if row_count > max_rows:
        return False, f'Too many rows ({row_count}). Maximum {max_rows} rows allowed for {upload_type}'
    return True, ''

def get_processing_config(upload_type: str = 'general') -> dict:
    """
    Get complete processing configuration for upload type.
    """
    return {
        'max_rows': get_max_rows(upload_type),
        'batch_size': get_batch_size(upload_type),
        'timeout': PROCESSING_TIMEOUT_SECONDS,
        'use_individual_transactions': USE_INDIVIDUAL_TRANSACTIONS,
        'allow_partial_success': ALLOW_PARTIAL_SUCCESS,
        'max_errors_before_abort': MAX_ERRORS_BEFORE_ABORT,
        'log_every_n_rows': LOG_EVERY_N_ROWS,
    }
