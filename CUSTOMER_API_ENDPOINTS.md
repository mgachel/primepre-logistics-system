# 📋 PRIMEPRE Customer API Endpoints - Complete Guide

## 🎯 Overview

This document outlines all the customer-specific endpoints that have been added to the PRIMEPRE Logistics System, allowing customers to access only their own data securely.

---

## 🔐 Authentication Required

All customer endpoints require JWT authentication:
```bash
Authorization: Bearer <customer_jwt_token>
```

---

## 👤 Customer Profile Management

### **User Account & Profile**
```bash
# Authentication
POST /api/auth/register/           # Register new customer account
POST /api/auth/login/              # Customer login
POST /api/auth/token/refresh/      # Refresh JWT token
POST /api/auth/token/verify/       # Verify JWT token

# Password Management
POST /api/auth/password-reset/request/   # Request password reset
POST /api/auth/password-reset/verify/    # Verify reset code
POST /api/auth/password-reset/confirm/   # Confirm new password
POST /api/auth/password-change/          # Change password (authenticated)

# Profile Management
GET  /api/auth/profile/            # Get customer profile
PUT  /api/auth/profile/            # Update customer profile
```

---

## 📦 Customer Goods Tracking

### **China Warehouse - Customer's Goods Only**
```bash
# Basic Operations
GET /api/customer/goods/china/                    # List customer's China goods only
GET /api/customer/goods/china/{id}/               # Get specific China goods (customer owns)

# Customer Statistics
GET /api/customer/goods/china/my_statistics/      # Personal China warehouse stats
GET /api/customer/goods/china/my_flagged_items/   # Customer's flagged items
GET /api/customer/goods/china/ready_for_shipping/ # Customer's ready items
GET /api/customer/goods/china/overdue_items/      # Customer's overdue items

# Tracking
GET /api/customer/goods/china/tracking/?tracking_id={id} # Track by supply tracking ID
```

### **Ghana Warehouse - Customer's Goods Only**
```bash
# Basic Operations
GET /api/customer/goods/ghana/                    # List customer's Ghana goods only
GET /api/customer/goods/ghana/{id}/               # Get specific Ghana goods (customer owns)

# Customer Statistics
GET /api/customer/goods/ghana/my_statistics/      # Personal Ghana warehouse stats
GET /api/customer/goods/ghana/my_flagged_items/   # Customer's flagged items
GET /api/customer/goods/ghana/ready_for_shipping/ # Customer's ready items
GET /api/customer/goods/ghana/overdue_items/      # Customer's overdue items

# Tracking
GET /api/customer/goods/ghana/tracking/?tracking_id={id} # Track by supply tracking ID
```

---

## 🚢 Customer Cargo & Container Tracking

### **Customer Container Management**
```bash
# Container Tracking (customer's containers only)
GET /api/cargo/customer/containers/              # List customer's containers
GET /api/cargo/customer/containers/{id}/         # Get specific container details

# Cargo Items (customer's items only)
GET /api/cargo/customer/cargo-items/             # List customer's cargo items
GET /api/cargo/customer/cargo-items/{id}/        # Get specific cargo item details
```

### **Customer Cargo Dashboard**
```bash
GET /api/cargo/customer/dashboard/               # Customer's cargo dashboard
```

---

## 📊 Customer Dashboards

### **Unified Customer Dashboard**
```bash
GET /api/customer/dashboard/                     # Complete customer overview
```

**Response includes:**
```json
{
  "customer_info": {
    "shipping_mark": "PMJOHN01",
    "name": "John Doe",
    "company": "Doe Trading Ltd"
  },
  "overview": {
    "total_items": 25,
    "total_cbm": 45.6,
    "total_weight": 1250.5,
    "total_flagged": 2,
    "total_ready": 8,
    "total_overdue": 1
  },
  "china_warehouse": {
    "total_items": 15,
    "total_cbm": 28.4,
    "by_status": [...]
  },
  "ghana_warehouse": {
    "total_items": 10,
    "total_cbm": 17.2,
    "by_status": [...]
  },
  "recent_items": {
    "china": [...],
    "ghana": [...]
  }
}
```

---

## 🔍 Query Parameters (Customer Endpoints)

### **Filtering Options**
```bash
# Status filtering
?status=PENDING              # Filter by status
?status=READY_FOR_SHIPPING   # Ready for shipping
?status=FLAGGED              # Flagged items

# Date filtering
?date_from=2024-01-01        # Items received from date
?date_to=2024-01-31          # Items received until date

# Search
?search=electronics          # Search in descriptions, tracking numbers
?supplier_name=ABC+Trading   # Filter by supplier

# Ordering
?ordering=-date_received     # Order by date (newest first)
?ordering=status             # Order by status
?ordering=cbm                # Order by CBM

# Overdue threshold
?days=45                     # For overdue_items endpoint (default: 30 days)
```

### **Example Customer API Calls**

#### **1. Customer Login & Get Dashboard**
```bash
# Login
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"phone": "+233241234567", "password": "password123"}'

# Response: {"access": "jwt_token_here", "refresh": "refresh_token"}

# Get Dashboard
curl -X GET http://localhost:8000/api/customer/dashboard/ \
  -H "Authorization: Bearer jwt_token_here"
```

#### **2. Track Customer's Goods**
```bash
# Get all China goods
curl -X GET http://localhost:8000/api/customer/goods/china/ \
  -H "Authorization: Bearer jwt_token_here"

# Get flagged items
curl -X GET http://localhost:8000/api/customer/goods/china/my_flagged_items/ \
  -H "Authorization: Bearer jwt_token_here"

# Track specific item
curl -X GET "http://localhost:8000/api/customer/goods/china/tracking/?tracking_id=TRK123456" \
  -H "Authorization: Bearer jwt_token_here"
```

#### **3. Filter Customer's Goods**
```bash
# Get recent ready items
curl -X GET "http://localhost:8000/api/customer/goods/ghana/ready_for_shipping/?date_from=2024-01-01" \
  -H "Authorization: Bearer jwt_token_here"

# Search in customer's goods
curl -X GET "http://localhost:8000/api/customer/goods/china/?search=electronics&ordering=-date_received" \
  -H "Authorization: Bearer jwt_token_here"
```

---

## 🛡️ Security Features

### **Data Isolation**
- ✅ Customers can **ONLY** see goods with their `shipping_mark`
- ✅ Attempts to access other customers' data return `403 Forbidden`
- ✅ All endpoints automatically filter by authenticated user's `shipping_mark`

### **Read-Only Access**
- ✅ Customers use `ReadOnlyModelViewSet` - no create/update/delete
- ✅ Staff/Admin endpoints remain separate with full CRUD access
- ✅ Clear separation between customer and admin functionality

### **Permission Validation**
- ✅ Every request validates JWT token
- ✅ Individual item access checks ownership
- ✅ Tracking endpoints verify item belongs to customer

---

## 📱 Mobile App Support

All customer endpoints support:
- ✅ **JSON responses** for mobile app consumption
- ✅ **Pagination** for large datasets
- ✅ **Filtering & Search** for optimized mobile UX
- ✅ **Lightweight responses** for better mobile performance

---

## 🔄 Integration with Use Cases

### **UC1: Customer Shipment Tracking (James)**
```bash
# James checks his 3 containers
GET /api/customer/dashboard/                    # Overview of all shipments
GET /api/customer/goods/china/?status=SHIPPED  # Check shipped items
GET /api/cargo/customer/containers/             # Container tracking
```

### **UC2: Customer Delivery Updates (Grace)**
```bash
# Grace checks Ghana warehouse arrivals
GET /api/customer/goods/ghana/ready_for_shipping/  # Ready for pickup
GET /api/customer/goods/ghana/my_statistics/        # Personal stats
```

### **UC3: Customer Issue Resolution (Kweku)**
```bash
# Kweku reports damaged goods
GET /api/customer/goods/ghana/my_flagged_items/     # Check flagged status
GET /api/customer/goods/ghana/{id}/                 # Get specific item details
```

---

## 📈 Benefits for Customers

### **🎯 Personalized Experience**
- **Own Data Only**: See only their goods, not other customers'
- **Unified Dashboard**: China + Ghana warehouses in one view
- **Real-time Updates**: Current status of all shipments

### **📱 Self-Service Capabilities**
- **24/7 Access**: Check goods status anytime
- **Detailed Tracking**: From China receipt to Ghana delivery
- **Historical Data**: Access to past shipments and statistics

### **🔍 Advanced Features**
- **Smart Search**: Find goods by description, tracking number
- **Status Filtering**: Focus on flagged, ready, or overdue items
- **Date Ranges**: Analyze shipments by time periods

---

*📅 Last Updated: July 31, 2025*  
*🔄 Customer Endpoints: Fully Implemented*  
*📧 Questions? Contact: api-support@primepre.com*
