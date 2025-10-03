# Customer Daily Updates - Quick Start Guide

## What Was Implemented

The Customer Daily Updates page now has a **two-tier navigation system**:

```
📱 Daily Updates
│
├── ✈️ Air Cargo
│   ├── 📦 Containers (Shipments)   → Shows air cargo containers
│   └── 📍 Goods Received            → Shows goods received in China (Air)
│
└── 🚢 Sea Cargo
    ├── 📦 Containers (Shipments)   → Shows sea cargo containers
    └── 📍 Goods Received            → Shows goods received in China (Sea)
```

## Key Features

### 🔒 Read-Only Access
- Customers can **view** and **search** only
- No edit, delete, or create functions
- Safe for customers to browse

### ⏰ 30-Day Time Limit
- Shows only items from **last 30 days**
- Automatically filters old data
- Keeps data relevant and fresh

### 🔍 Search & Filter
- **Search** by container ID, route, tracking, shipping mark, description
- **Filter** by status (Pending, In Transit, Delivered, etc.)
- **Pagination** for large datasets

## For Customers

### How to Access
1. Log in to the system
2. Click **"Daily Updates"** in the sidebar
3. Choose **Air** or **Sea** tab
4. Choose **Containers** or **Goods Received** subtab

### What You See

#### Air Containers Tab
- Container ID
- Status (with color badges)
- Route
- Weight (in kg)
- Load Date
- ETA (Estimated Time of Arrival)
- Number of Items
- Number of Clients

#### Air Goods Received Tab
- Shipping Mark
- Tracking Number
- Status
- Quantity
- Weight
- Date Received
- Days in Warehouse
- Description

#### Sea Containers Tab
- Same as Air Containers
- Shows **CBM** instead of Weight

#### Sea Goods Received Tab
- Same as Air Goods Received
- Shows **CBM** instead of Weight

## For Developers

### Backend Endpoints

```python
# Air
GET /api/daily-updates/customer/air/containers/
GET /api/daily-updates/customer/air/goods-received/

# Sea
GET /api/daily-updates/customer/sea/containers/
GET /api/daily-updates/customer/sea/goods-received/
```

### Query Parameters
```
?search=CONT123          # Search term
&status=in_transit       # Filter by status
&page=2                  # Page number
&page_size=50            # Items per page
```

### Example API Call
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:8000/api/daily-updates/customer/air/containers/?search=CONT123&status=in_transit"
```

### Example Response
```json
{
  "success": true,
  "data": [
    {
      "container_id": "CONT123",
      "cargo_type": "air",
      "status": "in_transit",
      "weight": 1500.50,
      "route": "China to Ghana",
      "load_date": "2025-09-15",
      "eta": "2025-09-20",
      "total_cargo_items": 45,
      "total_clients": 12
    }
  ],
  "message": "Air containers retrieved successfully",
  "count": 1,
  "next": null,
  "previous": null
}
```

## Testing Checklist

### ✅ Backend Testing
- [ ] Log in as customer
- [ ] Access air containers endpoint
- [ ] Verify only last 30 days data
- [ ] Test search functionality
- [ ] Test status filter
- [ ] Test pagination
- [ ] Repeat for all 4 endpoints

### ✅ Frontend Testing
- [ ] Navigate to Daily Updates page
- [ ] See Air/Sea tabs
- [ ] Click Air tab → See Containers/Goods Received subtabs
- [ ] Test search in Air Containers
- [ ] Test status filter
- [ ] Test pagination
- [ ] Repeat for all 4 subtabs
- [ ] Verify no edit/delete buttons
- [ ] Check responsive design on mobile

### ✅ Security Testing
- [ ] Try accessing as non-customer → Should get 403
- [ ] Try accessing without auth → Should get 401
- [ ] Verify only last 30 days data shown
- [ ] Confirm read-only (no POST/PUT/DELETE)

## Common Issues & Solutions

### Issue: No data showing
**Solution:** 
- Check if data exists in last 30 days
- Verify container cargo_type is 'air' or 'sea'
- Check goods method_of_shipping is 'AIR' or 'SEA'

### Issue: 403 Forbidden
**Solution:**
- Ensure logged in as customer
- Check user_role === 'CUSTOMER'
- Verify authentication token is valid

### Issue: Search not working
**Solution:**
- Check search term is not empty
- Verify fields being searched (container_id, route, etc.)
- Check database has indexed these fields

### Issue: Pagination broken
**Solution:**
- Verify API returns 'count' field
- Check page and page_size params
- Ensure pagination component receives correct data

## Admin vs Customer Comparison

| Feature | Admin Dashboard | Customer Daily Updates |
|---------|----------------|----------------------|
| **Access** | Admin/Staff | Customers only |
| **Time Range** | All data | **Last 30 days only** |
| **Permissions** | Full CRUD | **Read-only** |
| **Edit/Delete** | ✅ Yes | ❌ No |
| **Create New** | ✅ Yes | ❌ No |
| **Search** | ✅ Yes | ✅ Yes |
| **Filter** | ✅ Yes | ✅ Yes |
| **Pagination** | ✅ Yes | ✅ Yes |

## Quick Commands

```bash
# Start backend
cd primepre-logistics-system
python manage.py runserver

# Start frontend
cd frontend
npm run dev

# Check Python syntax
python -m py_compile daily_updates/views.py
python -m py_compile daily_updates/urls.py

# Run migrations (not needed for this feature)
python manage.py migrate

# Create test data (if needed)
python manage.py shell
# Then create containers/goods with recent dates
```

## Next Steps

1. **Test locally** using the checklist above
2. **Deploy to staging** for QA testing
3. **Get customer feedback** on usability
4. **Deploy to production** when approved

## Support

For questions or issues:
1. Check `CUSTOMER_DAILY_UPDATES_IMPLEMENTATION.md` for technical details
2. Review backend logs for API errors
3. Check browser console for frontend errors
4. Verify database has data in last 30 days

---

**Status:** ✅ Implementation Complete  
**Ready for:** Testing & Deployment  
**Breaking Changes:** None (new endpoints only)
