# Goods Management API Documentation

This API provides comprehensive endpoints for managing goods received in China and Ghana warehouses.

## Base URL
```
http://localhost:8000/api/goods/
```

## Authentication
All endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Endpoints Overview

### China Warehouse Endpoints
- `GET /api/goods/china/` - List all China goods
- `POST /api/goods/china/` - Create new China goods entry
- `GET /api/goods/china/{id}/` - Retrieve specific China goods
- `PUT /api/goods/china/{id}/` - Update specific China goods
- `PATCH /api/goods/china/{id}/` - Partial update China goods
- `DELETE /api/goods/china/{id}/` - Delete China goods
- `POST /api/goods/china/{id}/update_status/` - Update status of specific item
- `POST /api/goods/china/bulk_status_update/` - Bulk status update
- `POST /api/goods/china/upload_excel/` - **Upload Excel file for bulk create**
- `GET /api/goods/china/download_template/` - **Download Excel template**
- `GET /api/goods/china/statistics/` - Get China warehouse statistics
- `GET /api/goods/china/flagged_items/` - Get flagged items
- `GET /api/goods/china/ready_for_shipping/` - Get ready for shipping items
- `GET /api/goods/china/overdue_items/` - Get overdue items

### Ghana Warehouse Endpoints
Same structure as China endpoints, but with `/api/goods/ghana/` base path.

## Excel Upload Feature

### Download Template
Before uploading, download the Excel template to ensure correct format:

```http
GET /api/goods/china/download_template/
Authorization: Bearer <token>
```

This will download an Excel file with the correct column headers and sample data.

### Expected Excel Columns

#### For China Warehouse:
| Column Name | Required | Description | Example |
|-------------|----------|-------------|---------|
| SHIPPIN MARK/CLIENT | ✅ Yes | Customer's shipping mark | PMJOHN01 |
| SUPPLIER&TRACKING NO | ✅ Yes | Supplier's tracking number | TRK123456789 |
| CBM | ✅ Yes | Cubic meters | 2.5 |
| CTNS | ✅ Yes | Quantity/Number of cartons | 5 |
| DESCRIPTION | ❌ No | Description of goods | Electronics components |
| DATE OF RECEIPT | ❌ No | Date goods received | 2024-12-26 |
| DATE OF LOADING | ❌ No | Loading date (can be empty) | 2024-12-28 |
| SPECIFICATIONS | ❌ No | Not used in system | N/A |

#### For Ghana Warehouse:
Same column structure as China warehouse.

### Upload Excel File

```http
POST /api/goods/china/upload_excel/
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form Data:
- file: [Excel file]
- warehouse: "china"
```

#### Example Response:
```json
{
  "message": "Successfully processed 8 out of 10 items",
  "results": {
    "total_processed": 10,
    "successful_creates": 8,
    "failed_creates": 2,
    "errors": [
      "Shipping mark 'PMJOHN01' already exists",
      "Invalid CBM value in row 5"
    ],
    "created_items": [
      "CHN1735209600ABC12345",
      "CHN1735209601DEF67890",
      "..."
    ]
  }
}
```

### Excel Upload Validation Rules

#### File Validation:
- **Supported formats**: .xlsx, .xls, .csv
- **Maximum file size**: 10MB
- **Required columns**: SHIPPIN MARK/CLIENT, SUPPLIER&TRACKING NO, CBM, CTNS

#### Data Validation:
- **Shipping Mark**: Required, max 20 characters, must be unique
- **Supply Tracking**: Required, max 50 characters, must be unique  
- **CBM**: Required, must be > 0 and < 1000
- **Quantity (CTNS)**: Required, must be positive integer
- **Description**: Optional, any text
- **Dates**: Optional, various date formats accepted

#### Error Handling:
- Duplicate shipping marks or tracking numbers are rejected
- Invalid data types are flagged with row numbers
- Process continues for valid rows even if some fail
- Detailed error report provided in response

## Excel Upload Examples

### 1. Basic Upload
```http
POST /api/goods/china/upload_excel/
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form Data:
file: sea_cargo_china.xlsx
warehouse: china
```

### 2. Ghana Warehouse Upload
```http
POST /api/goods/ghana/upload_excel/
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form Data:
file: sea_cargo_ghana.xlsx
warehouse: ghana
```

### 3. Error Response Example
```json
{
  "error": "Failed to process Excel file",
  "excel_errors": [
    "Missing required columns: CBM",
    "Row 3: Shipping mark is required",
    "Row 5: Invalid CBM value",
    "Row 7: Quantity must be greater than 0"
  ]
}
```

## Best Practices for Excel Upload

### 1. Data Preparation
- Use the downloaded template as starting point
- Ensure all required columns are present
- Remove empty rows at the end
- Check for duplicate shipping marks and tracking numbers

### 2. File Format
- Prefer .xlsx format for best compatibility
- Keep file size under 10MB
- Use consistent date formats (YYYY-MM-DD recommended)

### 3. Error Prevention
- Validate CBM values are reasonable numbers
- Ensure quantity values are positive integers
- Check shipping marks are unique across your data
- Verify tracking numbers are unique

### 4. Batch Processing
- For large datasets, consider splitting into smaller batches
- Process files during off-peak hours for better performance
- Review error reports and fix issues before re-uploading

## Automated Processing Flow

1. **Download Template** → Get correct format
2. **Prepare Data** → Fill in your goods information
3. **Upload File** → POST to upload endpoint
4. **Review Results** → Check success/failure counts
5. **Handle Errors** → Fix issues and re-upload failed items
6. **Verify Data** → Use list endpoints to confirm uploads

## Integration with Existing Features

The Excel upload integrates seamlessly with existing features:

- **Status Management**: Uploaded items start with "PENDING" status
- **Workflow**: Use existing status update endpoints after upload
- **Statistics**: Uploaded items appear in warehouse statistics
- **Search & Filter**: All uploaded items are searchable
- **Admin Interface**: Items appear in Django admin for management

## Technical Notes

### Transaction Safety
- All uploads are wrapped in database transactions
- If any critical error occurs, entire upload is rolled back
- Partial failures are handled gracefully

### Performance Considerations
- Large files are processed efficiently using pandas
- Database operations are optimized for bulk creation
- Memory usage is minimized through streaming processing

### Security Features
- File type validation prevents malicious uploads
- File size limits prevent resource exhaustion
- Authentication required for all upload operations
- Input validation prevents code injection attacks

# Goods Management API Documentation

This API provides comprehensive endpoints for managing goods received in China and Ghana warehouses.

## Base URL
```
http://localhost:8000/api/goods/
```

## Authentication
All endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Endpoints Overview

### China Warehouse Endpoints
- `GET /api/goods/china/` - List all China goods
- `POST /api/goods/china/` - Create new China goods entry
- `GET /api/goods/china/{id}/` - Retrieve specific China goods
- `PUT /api/goods/china/{id}/` - Update specific China goods
- `PATCH /api/goods/china/{id}/` - Partial update China goods
- `DELETE /api/goods/china/{id}/` - Delete China goods
- `POST /api/goods/china/{id}/update_status/` - Update status of specific item
- `POST /api/goods/china/bulk_status_update/` - Bulk status update
- `POST /api/goods/china/upload_excel/` - **Upload Excel file for bulk create**
- `GET /api/goods/china/download_template/` - **Download Excel template**
- `GET /api/goods/china/statistics/` - Get China warehouse statistics
- `GET /api/goods/china/flagged_items/` - Get flagged items
- `GET /api/goods/china/ready_for_shipping/` - Get ready for shipping items
- `GET /api/goods/china/overdue_items/` - Get overdue items

### Ghana Warehouse Endpoints
Same structure as China endpoints, but with `/api/goods/ghana/` base path.

## Excel Upload Feature

### Download Template
Before uploading, download the Excel template to ensure correct format:

```http
GET /api/goods/china/download_template/
Authorization: Bearer <token>
```

This will download an Excel file with the correct column headers and sample data.

### Expected Excel Columns

#### For China Warehouse:
| Column Name | Required | Description | Example |
|-------------|----------|-------------|---------|
| SHIPPIN MARK/CLIENT | ✅ Yes | Customer's shipping mark | PMJOHN01 |
| SUPPLIER&TRACKING NO | ✅ Yes | Supplier's tracking number | TRK123456789 |
| CBM | ✅ Yes | Cubic meters | 2.5 |
| CTNS | ✅ Yes | Quantity/Number of cartons | 5 |
| DESCRIPTION | ❌ No | Description of goods | Electronics components |
| DATE OF RECEIPT | ❌ No | Date goods received | 2024-12-26 |
| DATE OF LOADING | ❌ No | Loading date (can be empty) | 2024-12-28 |
| SPECIFICATIONS | ❌ No | Not used in system | N/A |

#### For Ghana Warehouse:
Same column structure as China warehouse.

### Upload Excel File

```http
POST /api/goods/china/upload_excel/
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form Data:
- file: [Excel file]
- warehouse: "china"
```

#### Example Response:
```json
{
  "message": "Successfully processed 8 out of 10 items",
  "results": {
    "total_processed": 10,
    "successful_creates": 8,
    "failed_creates": 2,
    "errors": [
      "Shipping mark 'PMJOHN01' already exists",
      "Invalid CBM value in row 5"
    ],
    "created_items": [
      "CHN1735209600ABC12345",
      "CHN1735209601DEF67890",
      "..."
    ]
  }
}
```

### Excel Upload Validation Rules

#### File Validation:
- **Supported formats**: .xlsx, .xls, .csv
- **Maximum file size**: 10MB
- **Required columns**: SHIPPIN MARK/CLIENT, SUPPLIER&TRACKING NO, CBM, CTNS

#### Data Validation:
- **Shipping Mark**: Required, max 20 characters, must be unique
- **Supply Tracking**: Required, max 50 characters, must be unique  
- **CBM**: Required, must be > 0 and < 1000
- **Quantity (CTNS)**: Required, must be positive integer
- **Description**: Optional, any text
- **Dates**: Optional, various date formats accepted

#### Error Handling:
- Duplicate shipping marks or tracking numbers are rejected
- Invalid data types are flagged with row numbers
- Process continues for valid rows even if some fail
- Detailed error report provided in response

## Excel Upload Examples

### 1. Basic Upload
```http
POST /api/goods/china/upload_excel/
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form Data:
file: sea_cargo_china.xlsx
warehouse: china
```

### 2. Ghana Warehouse Upload
```http
POST /api/goods/ghana/upload_excel/
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form Data:
file: sea_cargo_ghana.xlsx
warehouse: ghana
```

### 3. Error Response Example
```json
{
  "error": "Failed to process Excel file",
  "excel_errors": [
    "Missing required columns: CBM",
    "Row 3: Shipping mark is required",
    "Row 5: Invalid CBM value",
    "Row 7: Quantity must be greater than 0"
  ]
}
```

## Best Practices for Excel Upload

### 1. Data Preparation
- Use the downloaded template as starting point
- Ensure all required columns are present
- Remove empty rows at the end
- Check for duplicate shipping marks and tracking numbers

### 2. File Format
- Prefer .xlsx format for best compatibility
- Keep file size under 10MB
- Use consistent date formats (YYYY-MM-DD recommended)

### 3. Error Prevention
- Validate CBM values are reasonable numbers
- Ensure quantity values are positive integers
- Check shipping marks are unique across your data
- Verify tracking numbers are unique

### 4. Batch Processing
- For large datasets, consider splitting into smaller batches
- Process files during off-peak hours for better performance
- Review error reports and fix issues before re-uploading

## Automated Processing Flow

1. **Download Template** → Get correct format
2. **Prepare Data** → Fill in your goods information
3. **Upload File** → POST to upload endpoint
4. **Review Results** → Check success/failure counts
5. **Handle Errors** → Fix issues and re-upload failed items
6. **Verify Data** → Use list endpoints to confirm uploads

## Integration with Existing Features

The Excel upload integrates seamlessly with existing features:

- **Status Management**: Uploaded items start with "PENDING" status
- **Workflow**: Use existing status update endpoints after upload
- **Statistics**: Uploaded items appear in warehouse statistics
- **Search & Filter**: All uploaded items are searchable
- **Admin Interface**: Items appear in Django admin for management

## Technical Notes

### Transaction Safety
- All uploads are wrapped in database transactions
- If any critical error occurs, entire upload is rolled back
- Partial failures are handled gracefully

### Performance Considerations
- Large files are processed efficiently using pandas
- Database operations are optimized for bulk creation
- Memory usage is minimized through streaming processing

### Security Features
- File type validation prevents malicious uploads
- File size limits prevent resource exhaustion
- Authentication required for all upload operations
- Input validation prevents code injection attacks
