# Robust Excel Processing System

## Overview

The robust Excel processing system is designed to handle messy Excel files that may contain:
- Merged cells
- Random blank rows and columns
- Inconsistent formatting
- Headers in different locations
- Multiple sheets
- Various column name variations

## Key Features

### 1. Automatic Header Detection
- Searches the first 20 rows of each sheet to find the header row
- Uses fuzzy matching to identify column names
- Configurable minimum match threshold (default: 50% of target columns must match)

### 2. Multi-Sheet Support
- Automatically processes all sheets in an Excel file
- Returns data from the sheet with the best column matches
- Handles both `.xlsx` and `.xls` files, plus CSV fallback

### 3. Data Cleaning
- Removes completely empty rows and columns
- Normalizes column names (handles spaces, special characters)
- Cleans cell values based on expected data types
- Validates numeric fields (CBM, quantity, weight, etc.)

### 4. Flexible Column Mapping
- Case-insensitive column matching
- Handles various naming conventions (e.g., "CBM", "Volume", "Cubic Meters")
- Supports alternative field names for the same data

## Implementation

### Core Function: `extract_target_columns()`

```python
def extract_target_columns(
    file_path_or_buffer: Union[str, io.BytesIO], 
    target_columns: List[str],
    max_header_search_rows: int = 20,
    min_column_match_threshold: float = 0.5,
    clean_data: bool = True
) -> List[Dict[str, Any]]
```

**Parameters:**
- `file_path_or_buffer`: Excel file path or BytesIO buffer
- `target_columns`: List of column names to extract
- `max_header_search_rows`: How many rows to search for headers (default: 20)
- `min_column_match_threshold`: Minimum % of columns that must match (default: 0.5)
- `clean_data`: Whether to clean and validate extracted data (default: True)

**Returns:**
- List of dictionaries with extracted data, or empty list if no match

### Specialized Functions

#### For Goods Received
```python
def process_goods_received_excel(file_buffer: io.BytesIO, warehouse_type: str) -> Dict[str, Any]
```

**Target Columns:**
- `shipping_mark` (required)
- `supply_tracking` (required)
- `cbm` (required)
- `quantity` (required)
- `description` (optional)
- `date_loading` (optional)
- `weight` (optional)
- `estimated_value` (optional)

#### For Cargo Items
```python
def process_cargo_excel(file_buffer: io.BytesIO) -> Dict[str, Any]
```

**Target Columns:**
- `shipping_mark` (required)
- `item_description` (required)
- `quantity` (required)
- `cbm` (required)
- `weight` (optional)
- `unit_value` (optional)
- `total_value` (optional)
- `status` (optional)

## Column Name Variations Supported

The system recognizes various column name formats:

### Shipping Mark
- "SHIPPING MARK"
- "shipping_mark"
- "CLIENT"
- "MARK"
- "Shipping Mark/Client"

### CBM/Volume
- "CBM"
- "Volume"
- "Cubic Meters"
- "Cubic"

### Quantity
- "QUANTITY"
- "QTY"
- "CTNS"
- "COUNT"
- "Pieces"

### Tracking
- "SUPPLIER&TRACKING NO"
- "supply_tracking"
- "TRACKING"
- "Reference"

## Usage Examples

### In Django Views (Goods Received)

```python
from .excel_processor import process_goods_received_excel

@action(detail=False, methods=['post'])
def upload_excel(self, request):
    serializer = ExcelUploadSerializer(data=request.data)
    
    if serializer.is_valid():
        file = serializer.validated_data['file']
        warehouse_type = serializer.validated_data['warehouse']
        
        # Create BytesIO buffer
        file_buffer = io.BytesIO(file.read())
        
        # Process with robust extraction
        processed_data = process_goods_received_excel(file_buffer, warehouse_type)
        
        if not processed_data['data']:
            return Response({'error': 'No matching columns found'})
        
        # Continue with data validation and creation...
```

### In Django Views (Cargo)

```python
from GoodsRecieved.excel_processor import process_cargo_excel

class BulkCargoItemUploadView(APIView):
    def post(self, request):
        # ... validation ...
        
        file_buffer = io.BytesIO(excel_file.read())
        processed_data = process_cargo_excel(file_buffer)
        
        # Process extracted data...
```

## Data Validation

The processor includes built-in validation for:

### Numeric Fields
- **CBM**: Must be > 0, reasonable upper limits
- **Quantity**: Must be positive integer
- **Weight**: Must be positive, reasonable limits
- **Values**: Currency cleaning, numeric validation

### String Fields
- **Shipping Mark**: Truncated to 20 characters
- **Supply Tracking**: Truncated to 50 characters
- **Description**: Basic text cleaning

### Date Fields
- Automatic date parsing and formatting
- Handles various date formats

## Error Handling

The system provides detailed error reporting:

### File-Level Errors
- Invalid file format
- File too large
- Corrupted files
- No sheets found

### Data-Level Errors
- No matching columns found
- Missing required fields
- Invalid data types
- Value out of range

### Row-Level Errors
- Row number identification
- Specific field validation errors
- Data conversion issues

## Configuration

### Warehouse-Specific Settings

```python
# Configuration constants
CHINA_DEFAULT_LOCATION = 'GUANGZHOU'
GHANA_DEFAULT_LOCATION = 'ACCRA'
MAX_FILE_SIZE_MB = 10
MAX_CBM_LIMIT = 1000
MAX_WEIGHT_LIMIT = 50000  # 50 tons
MAX_QUANTITY_LIMIT = 100000
MAX_VALUE_LIMIT = 1000000  # 1 million USD
```

### Matching Thresholds

- **Goods Received**: 40% minimum column match
- **Cargo Items**: 50% minimum column match
- **Header Search**: First 20 rows maximum

## Testing

Use the included test script to validate functionality:

```bash
python test_excel_processor.py
```

This will test the processor against sample files and report:
- Number of records extracted
- Columns successfully matched
- Sample data preview
- Any errors encountered

## Benefits

1. **User-Friendly**: Accepts Excel files in any reasonable format
2. **Robust**: Handles formatting inconsistencies gracefully
3. **Flexible**: Adapts to different column naming conventions
4. **Reliable**: Comprehensive error handling and validation
5. **Maintainable**: Clear separation of concerns and documentation

## Integration Points

The robust processor integrates with:
- **ExcelUploadSerializer** (GoodsReceived)
- **BulkCargoItemSerializer** (Cargo)
- **GoodsReceivedViewSet.upload_excel** (Views)
- **BulkCargoItemUploadView** (Views)

All existing API endpoints continue to work with the enhanced processing capabilities.
