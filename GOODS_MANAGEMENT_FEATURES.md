# Goods Management System - Frontend Features

## 🚀 Overview

The frontend now includes comprehensive goods management features for both China and Ghana warehouses. This implementation provides full CRUD operations, advanced filtering, bulk operations, Excel integration, and real-time status tracking.

## ✅ Implemented Features

### 🏭 Warehouse Management

#### China Warehouse (`/dashboard/china`)
- **Full goods listing** with pagination and sorting
- **Advanced search and filtering** by status, location, date ranges, supplier
- **Bulk operations** for status updates
- **Excel upload/download** functionality
- **Real-time statistics** dashboard
- **Status tracking**: PENDING → READY_FOR_SHIPPING → SHIPPED

#### Ghana Warehouse (`/dashboard/ghana`)
- **Full goods listing** with pagination and sorting
- **Advanced search and filtering** by status, location, date ranges, supplier
- **Bulk operations** for status updates
- **Excel upload/download** functionality
- **Real-time statistics** dashboard
- **Status tracking**: PENDING → READY_FOR_DELIVERY → DELIVERED

### 📊 Dashboard & Analytics

#### Overview Dashboard (`/dashboard`)
- **Combined statistics** from both warehouses
- **Quick action cards** for navigation
- **Summary widgets** showing pending, ready, shipped items
- **Recent activity** tracking

#### Statistics Components
- **Real-time metrics**: total items, CBM, weight, estimated value
- **Status breakdown**: pending, ready, shipped/delivered, flagged counts
- **Performance indicators**: processing rates, average warehouse time
- **Visual progress tracking** with status timelines

### 🚨 Alert & Monitoring Systems

#### Ready for Shipping (`/dashboard/ready-shipping`)
- **Dual-warehouse view** with tabs for China/Ghana
- **Items ready for dispatch** from both locations
- **Bulk shipping operations**
- **Export capabilities** for shipping manifests

#### Flagged Items Management (`/dashboard/flagged`)
- **Problem item tracking** across both warehouses
- **Bulk resolution tools**
- **Priority management** for urgent items
- **Notes and reason tracking**

#### Overdue Items Alerts (`/dashboard/overdue`)
- **Configurable thresholds** (7-60 days)
- **Severity indicators** based on days overdue
- **Automatic alerts** for items exceeding limits
- **Aging reports** with detailed metrics

### 🔍 Advanced Search & Filtering

#### Search Capabilities
- **Global search** across item IDs, shipping marks, tracking numbers
- **Supplier name filtering**
- **Location-based filtering**
- **Date range filtering**
- **Status-specific filtering**

#### Filter Persistence
- **Session storage** of filter preferences
- **Quick filter presets** for common searches
- **Advanced filter toggles**
- **Clear all filters** functionality

### 📤 Excel Integration

#### Upload Features
- **Template download** for proper formatting
- **Drag & drop upload** interface
- **Validation and error reporting**
- **Bulk creation** from Excel files
- **Progress tracking** during upload

#### Export Features
- **Filtered data export** based on current view
- **Template generation** for new entries
- **Custom format support**
- **Batch export** capabilities

### 🎯 Status Management

#### Status Workflows
- **Visual progress indicators**
- **Allowed transitions** enforcement
- **Bulk status updates**
- **Quick action buttons**

#### China Warehouse Statuses
- `PENDING` → Processing received goods
- `READY_FOR_SHIPPING` → Ready to ship to Ghana
- `SHIPPED` → Shipped to Ghana
- `FLAGGED` → Issues requiring attention
- `CANCELLED` → Cancelled orders

#### Ghana Warehouse Statuses
- `PENDING` → Processing received goods
- `READY_FOR_DELIVERY` → Ready for customer delivery
- `DELIVERED` → Delivered to customer
- `FLAGGED` → Issues requiring attention
- `CANCELLED` → Cancelled orders

### 🎨 User Interface

#### Design Features
- **Responsive design** for desktop, tablet, mobile
- **Modern UI** with Tailwind CSS
- **Dark mode** support
- **Loading states** and progress indicators
- **Error handling** with user-friendly messages

#### Navigation
- **Sidebar navigation** with active state indicators
- **Breadcrumb navigation** for context
- **Quick action buttons** in headers
- **Mobile-responsive** hamburger menu

#### Data Tables
- **Sortable columns** for all data fields
- **Expandable rows** for detailed view
- **Selection checkboxes** for bulk operations
- **Pagination** with customizable page sizes
- **Export buttons** for current view

## 🔧 Technical Implementation

### Service Layer
- **GoodsService**: Centralized API communication
- **Authentication**: Token-based auth with auto-refresh
- **Error handling**: Comprehensive error management
- **Loading states**: Global loading state management

### Components Architecture
- **DashboardLayout**: Common layout with navigation
- **StatusComponents**: Reusable status indicators and progress
- **SearchAndFilter**: Advanced filtering component
- **GoodsTable**: Feature-rich data table
- **ExcelOperations**: Upload/download functionality
- **StatsDashboard**: Real-time statistics display

### State Management
- **React Hooks**: useState, useEffect, useCallback
- **Local state**: Component-level state management
- **Service integration**: Direct API service calls
- **Error boundaries**: Graceful error handling

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ installed
- Django backend running on port 8000
- Database with goods data

### Installation
```bash
cd frontend
npm install
npm start
```

### Development Server
The frontend runs on `http://localhost:5173` and connects to the Django backend at `http://localhost:8000`.

## 📱 Usage Examples

### Adding New Goods
1. Navigate to China or Ghana warehouse page
2. Click "Add New Item" or use Excel upload
3. Fill in required fields (shipping mark, CBM, quantity)
4. Submit to create new goods entry

### Bulk Operations
1. Select items using checkboxes
2. Choose bulk action from dropdown
3. Confirm operation
4. View updated status immediately

### Filtering and Search
1. Use search bar for quick text search
2. Click "Show Advanced" for detailed filters
3. Apply multiple filters simultaneously
4. Export filtered results

### Excel Operations
1. Download template for proper format
2. Fill template with goods data
3. Upload completed file
4. Review results and handle any errors

## 🔮 Future Enhancements

### Planned Features
- **Real-time notifications** for status changes
- **Mobile app** for warehouse staff
- **Barcode scanning** integration
- **Photo attachments** for goods documentation
- **Automated workflows** based on business rules
- **Advanced reporting** with charts and graphs
- **Integration** with shipping carriers
- **Customer portal** for tracking

### Performance Optimizations
- **Virtualized tables** for large datasets
- **Caching strategies** for frequently accessed data
- **Background sync** for offline capability
- **Progressive loading** for better UX

## 🐛 Troubleshooting

### Common Issues
1. **API Connection**: Ensure backend is running on port 8000
2. **Authentication**: Check token expiration and refresh
3. **File Upload**: Verify Excel file format and size limits
4. **Filtering**: Clear browser cache if filters not working

### Error Handling
- All API errors are displayed to users
- Network issues show retry options
- Validation errors highlight problematic fields
- Loading states prevent duplicate submissions

## 📞 Support

For issues or questions about the Goods Management System:
- Check the console for detailed error messages
- Verify backend API endpoints are accessible
- Ensure user has proper permissions for operations
- Review network tab for API call debugging
