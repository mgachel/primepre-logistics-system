# 📦 Excel Upload System Documentation

## Overview

The Excel Upload System provides seamless data import capabilities for both **Goods Received** and **Sea Cargo** modules, with automatic integration to the Customer Shipments page.

## Key Features

✅ **Header-Agnostic Mapping** - Maps by column position, not header text  
✅ **Auto-Customer Creation** - Creates customer stubs for unknown shipping marks  
✅ **Idempotent Imports** - Safe re-uploads without duplicates  
✅ **Cross-Module Integration** - Auto-syncs with Customer Shipments page  
✅ **Comprehensive Error Reporting** - Row-level success/error reporting  
✅ **Template Generation** - Download Excel templates for uploads  

## Supported Upload Types

### 1. Goods Received (China/Ghana)
- **Column Order (Fixed)**:
  - Col 0: Shipping Mark (required)
  - Col 1: Date of Receipt (required)
  - Col 2: Date of Loading (optional)
  - Col 3: Description (optional)
  - Col 4: Quantity (optional, default: 0)
  - Col 5: Specifications (⚠️ **SKIPPED**)
  - Col 6: CBM (optional, default: 0)
  - Col 7: Supplier Tracking Number (optional)

### 2. Sea Cargo
- **Column Order (Fixed)**:
  - Col 0: Container Ref/Number (required)
  - Col 1: Shipping Mark (required)
  - Col 2: Date of Loading (optional)
  - Col 3: Description (optional)
  - Col 4: Quantity (optional, default: 0)
  - Col 5: CBM (optional, default: 0)
  - Col 6: Supplier Tracking Number (optional)

## API Endpoints

### Excel Upload
```
POST /cargo/excel/upload/
```

**Request Parameters:**
- `file`: Excel file (.xlsx, .xls)
- `upload_type`: "goods_received" | "sea_cargo"
- `warehouse_location`: "China" | "Ghana" (required for goods_received)

**Response:**
```json
{
  "message": "File processed successfully",
  "summary": {
    "total_rows": 10,
    "created": 8,
    "updated": 1,
    "skipped": 0,
    "errors": 1
  },
  "results": [
    {
      "row_number": 2,
      "status": "created",
      "message": "Created new record for PMJOHN01"
    },
    {
      "row_number": 3,
      "status": "error", 
      "message": "Invalid date format"
    }
  ]
}
```

### Template Download
```
GET /cargo/excel/template/?type=goods_received&warehouse=China
GET /cargo/excel/template/?type=sea_cargo
```

**Response:** Excel file download with sample data

### Enhanced Upload (Alternative Endpoint)
```
POST /cargo/excel/enhanced-upload/
```
Provides additional upload information and enhanced error handling.

## Data Processing Rules

### 1. Column Mapping
- **Position-Based**: Maps by column index (0-7), ignoring header text
- **Flexible Length**: Handles files with fewer columns using defaults
- **Skip Column**: Column 5 (Specifications) is completely ignored

### 2. Customer Management
```python
# Auto-creates customer stub if shipping mark not found
customer = {
    'shipping_mark': 'PMJOHN01',
    'first_name': 'JOHN01',  # Extracted from shipping mark
    'last_name': 'Imported',
    'user_role': 'CUSTOMER',
    'phone': '+000PMJOHN01',  # Placeholder
    'is_active': True
}
```

### 3. Validation & Normalization
- **Shipping Mark**: Trimmed, must be non-empty
- **Dates**: Supports YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY formats
- **Numbers**: Automatic coercion with error handling
- **Duplicates**: Last-write-wins within same batch

### 4. Idempotency
```python
# Unique key prevents duplicates
unique_key = hash(
    shipping_mark, 
    warehouse_location,
    date_of_receipt, 
    description,
    file_name, 
    row_index
)
```

## Integration with Customer Shipments

### Auto-Sync Process
1. **Upload Process**: Excel data → Database records
2. **Customer Creation**: Unknown shipping marks → Customer stubs  
3. **Shipment Aggregation**: Records automatically appear in Customer Shipments
4. **Real-time Updates**: Immediate reflection in Customer Shipments page

### Customer Shipments Categories
- **Goods Received China**: China warehouse uploads
- **Goods Received Ghana**: Ghana warehouse uploads  
- **Sea Cargo**: Sea cargo uploads
- **Air Cargo**: Manual entry (not Excel-supported yet)

## Error Handling

### File-Level Errors
- Invalid file type (.txt, .pdf, etc.)
- Corrupted Excel files
- Empty files (no data rows)
- Missing warehouse location for Goods Received

### Row-Level Errors
- Missing required fields (shipping mark, date of receipt)
- Invalid date formats
- Non-numeric quantity/CBM values
- Database constraint violations

### Error Response Format
```json
{
  "error": "Global error message",
  "summary": {
    "total_rows": 5,
    "created": 2,
    "updated": 0,
    "skipped": 0,
    "errors": 3
  },
  "results": [
    {
      "row_number": 2,
      "status": "error",
      "message": "Shipping mark is required"
    }
  ]
}
```

## Usage Examples

### 1. Upload Goods Received (China)
```python
import requests

url = "http://localhost:8000/cargo/excel/upload/"
files = {'file': open('goods_china.xlsx', 'rb')}
data = {
    'upload_type': 'goods_received',
    'warehouse_location': 'China'
}

response = requests.post(url, files=files, data=data, headers=auth_headers)
print(response.json())
```

### 2. Upload Sea Cargo
```python
url = "http://localhost:8000/cargo/excel/upload/"
files = {'file': open('sea_cargo.xlsx', 'rb')}
data = {'upload_type': 'sea_cargo'}

response = requests.post(url, files=files, data=data, headers=auth_headers)
print(response.json())
```

### 3. Download Template
```python
url = "http://localhost:8000/cargo/excel/template/?type=goods_received&warehouse=China"
response = requests.get(url, headers=auth_headers)

with open('template.xlsx', 'wb') as f:
    f.write(response.content)
```

## Sample Excel Files

### Goods Received Template
| Shipping Mark | Date of Receipt | Date of Loading | Description | Quantity | Specifications | CBM | Supplier Tracking Number |
|---------------|-----------------|-----------------|-------------|----------|----------------|-----|--------------------------|
| PMJOHN01      | 2024-12-30      | 2025-01-05      | Electronics | 10       | N/A            | 2.5 | TRK123456789            |
| PMJANE02      | 2024-12-31      |                 | Furniture   | 5        | N/A            | 1.8 | TRK987654321            |

### Sea Cargo Template
| Container Ref/Number | Shipping Mark | Date of Loading | Description      | Quantity | CBM | Supplier Tracking Number |
|---------------------|---------------|-----------------|------------------|----------|-----|--------------------------|
| SEA001              | PMJOHN01      | 2025-01-05      | Mixed electronics | 15       | 5.2 | TRK555666777            |
| SEA002              | PMJANE02      | 2025-01-06      | Furniture set     | 8        | 3.8 | TRK888999000            |

## Security & Validation

### File Security
- **File Type Validation**: Only .xlsx/.xls allowed
- **Size Limits**: 10MB maximum file size
- **Server-Side Processing**: No client-side execution
- **Input Sanitization**: All strings sanitized against XSS

### Data Integrity
- **Transaction Safety**: Database transactions ensure consistency
- **Constraint Validation**: Foreign key and unique constraints enforced
- **Audit Trail**: Upload metadata tracked (user, timestamp, filename)

### Access Control
- **Authentication Required**: Valid JWT token needed
- **Permission Checks**: User must have upload permissions
- **Role-Based Access**: Admin/Staff can upload, customers view-only

## Performance Considerations

### Optimization Features
- **Batch Processing**: Single database transaction per file
- **Memory Efficient**: Streaming file processing
- **Error Aggregation**: Collects all errors before response
- **Index Usage**: Optimized queries for customer lookup

### Recommended Limits
- **File Size**: Keep under 10MB (configurable)
- **Row Count**: Optimal for files under 1000 rows
- **Concurrent Uploads**: Limit concurrent uploads per user

## Troubleshooting

### Common Issues

#### "No data rows found"
- **Cause**: Empty Excel file or only header row
- **Solution**: Ensure file has data below header row

#### "Shipping mark is required"
- **Cause**: Empty or missing shipping mark in column 0
- **Solution**: Fill in shipping mark for all data rows

#### "Invalid date format"
- **Cause**: Date not in supported format
- **Solution**: Use YYYY-MM-DD, DD/MM/YYYY, or MM/DD/YYYY

#### "Container reference is required"
- **Cause**: Missing container ID for sea cargo upload
- **Solution**: Provide valid container reference in column 0

### Debug Steps
1. **Download Template**: Use provided templates as reference
2. **Check Column Order**: Verify data is in correct column positions
3. **Validate Data**: Check for empty required fields
4. **Test Small File**: Upload single row first to test format
5. **Review Errors**: Check detailed error messages in response

## Future Enhancements

### Planned Features
- **Air Cargo Support**: Excel upload for air cargo
- **Batch Status Updates**: Update container/item status via Excel
- **Advanced Validation**: Custom validation rules per client
- **Template Customization**: Client-specific Excel templates
- **Async Processing**: Background processing for large files

### Integration Roadmap
- **Email Notifications**: Upload completion emails
- **Dashboard Integration**: Upload metrics in admin dashboard
- **API Webhooks**: Real-time notifications to external systems
- **Mobile Support**: Mobile app upload capabilities
