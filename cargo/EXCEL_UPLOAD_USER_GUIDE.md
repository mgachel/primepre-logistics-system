# 📦 Excel Upload - User Guide & Testing

## 🎯 Quick Start Guide

### 1. Use the NEW Excel Upload Endpoint
**✅ CORRECT ENDPOINT:**
```
POST /cargo/excel/upload/
```

**❌ AVOID OLD ENDPOINT:**
```
POST /cargo/bulk-upload/  (This expects specific column names)
```

### 2. Supported Upload Types

#### A. Goods Received (China/Ghana)
```python
# POST /cargo/excel/upload/
{
    "file": your_excel_file.xlsx,
    "upload_type": "goods_received",
    "warehouse_location": "China"  # or "Ghana"
}
```

#### B. Sea Cargo
```python
# POST /cargo/excel/upload/
{
    "file": your_excel_file.xlsx,
    "upload_type": "sea_cargo"
    # No warehouse_location needed
}
```

### 3. Excel File Format (Position-Based)

**🔑 KEY FEATURE: Header text is IGNORED - only column position matters!**

#### Goods Received Template:
| Col 0 | Col 1 | Col 2 | Col 3 | Col 4 | Col 5 | Col 6 | Col 7 |
|-------|-------|-------|-------|-------|-------|-------|-------|
| **Shipping Mark** | **Date of Receipt** | Date of Loading | Description | Quantity | ⚠️ SKIP | CBM | Supplier Tracking |
| PMJOHN01 | 2024-12-30 | 2025-01-05 | Electronics | 10 | N/A | 2.5 | TRK123456789 |
| PMJANE02 | 2024-12-31 | | Furniture | 5 | N/A | 1.8 | TRK987654321 |

#### Sea Cargo Template:
| Col 0 | Col 1 | Col 2 | Col 3 | Col 4 | Col 5 | Col 6 |
|-------|-------|-------|-------|-------|-------|-------|
| **Container Ref** | **Shipping Mark** | Date of Loading | Description | Quantity | CBM | Supplier Tracking |
| SEA001 | PMJOHN01 | 2025-01-05 | Mixed electronics | 15 | 5.2 | TRK555666777 |
| SEA002 | PMJANE02 | 2025-01-06 | Furniture set | 8 | 3.8 | TRK888999000 |

### 4. Download Templates
```
GET /cargo/excel/template/?type=goods_received&warehouse=China
GET /cargo/excel/template/?type=goods_received&warehouse=Ghana
GET /cargo/excel/template/?type=sea_cargo
```

### 5. Success Response Format
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
    }
  ]
}
```

### 6. Error Response Format
```json
{
  "error": "Validation error details",
  "summary": {
    "total_rows": 5,
    "created": 2,
    "updated": 0,
    "errors": 3
  },
  "results": [
    {
      "row_number": 3,
      "status": "error",
      "message": "Shipping mark is required"
    }
  ]
}
```

## 🔧 Troubleshooting

### Common Issues:

#### 1. "Missing required columns" Error
- **Cause**: Using old bulk upload endpoint
- **Solution**: Use `/cargo/excel/upload/` instead of `/cargo/bulk-upload/`

#### 2. "Shipping mark is required" Error
- **Cause**: Empty value in column 0 (first column)
- **Solution**: Ensure all rows have shipping marks in first column

#### 3. "Date of receipt is required" Error
- **Cause**: Empty or invalid date in column 1 (second column)
- **Solution**: Use format YYYY-MM-DD, DD/MM/YYYY, or MM/DD/YYYY

#### 4. "No customer found" Error
- **Don't worry!** The system auto-creates customer stubs for unknown shipping marks

## 🚀 Usage Examples

### Python Requests:
```python
import requests

# Upload Goods Received
files = {'file': open('goods_china.xlsx', 'rb')}
data = {
    'upload_type': 'goods_received',
    'warehouse_location': 'China'
}
response = requests.post(
    'http://localhost:8000/cargo/excel/upload/',
    files=files, 
    data=data,
    headers={'Authorization': 'Bearer YOUR_TOKEN'}
)

# Upload Sea Cargo
files = {'file': open('sea_cargo.xlsx', 'rb')}
data = {'upload_type': 'sea_cargo'}
response = requests.post(
    'http://localhost:8000/cargo/excel/upload/',
    files=files,
    data=data,
    headers={'Authorization': 'Bearer YOUR_TOKEN'}
)
```

### cURL:
```bash
# Upload Goods Received
curl -X POST \
  http://localhost:8000/cargo/excel/upload/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@goods_china.xlsx" \
  -F "upload_type=goods_received" \
  -F "warehouse_location=China"

# Download Template
curl -X GET \
  "http://localhost:8000/cargo/excel/template/?type=goods_received&warehouse=China" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o template.xlsx
```

## ✅ Features Summary

- **✅ Header-Agnostic**: Works regardless of header text
- **✅ Position-Based**: Maps by column position (0-7)
- **✅ Auto-Customer Creation**: Creates stubs for unknown shipping marks
- **✅ Idempotent**: Safe to re-upload same file
- **✅ Customer Shipments Integration**: Auto-syncs across all categories
- **✅ Error Reporting**: Detailed row-level feedback
- **✅ Template Downloads**: Get sample files
- **✅ Cross-Module**: Works with existing Goods Received system

## 🎯 Customer Shipments Auto-Sync

After successful upload, data automatically appears in:
- **Goods Received China** → China warehouse uploads
- **Goods Received Ghana** → Ghana warehouse uploads  
- **Sea Cargo** → Sea cargo uploads
- **Air Cargo** → Manual entry (not Excel-supported yet)

## 📞 Support

If you encounter issues:
1. Verify you're using the correct endpoint: `/cargo/excel/upload/`
2. Download and use the provided templates
3. Check that required fields (shipping mark, dates) are filled
4. Ensure file is .xlsx or .xls format
5. Verify authentication token is valid

The Excel Upload system is **production-ready** and fully integrated! 🎉
