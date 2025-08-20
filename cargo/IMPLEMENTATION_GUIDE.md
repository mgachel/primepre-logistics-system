# 🚢 Cargo Module Implementation Guide

## Overview
The Cargo Module has been implemented with three main submodules:
1. **Sea Cargo**
2. **Air Cargo** 
3. **Customer Shipments Page** (integrating with Claims module)

## 🔑 Key Features Implemented

### 1. Container Management
- **Create Container**: Users can create containers with all required details (Sea or Air)
- **Container Types**: `sea` and `air` cargo types supported
- **Container Details**: Load date, ETA, route, weight, CBM, rates, status tracking

### 2. Cargo Item Management
- **Add Items to Container**: After creating a container, users can add cargo items
- **Shipping Mark Integration**: Each cargo item belongs to a customer identified by their unique Shipping Mark
- **Client Field Display**: When adding cargo items, the client field shows only the Shipping Mark (not customer name)

### 3. Customer Shipments Page
The Customer Shipments Page automatically aggregates all items linked to a customer's Shipping Mark across 4 categories:

#### Categories:
1. **Goods Received (China)** - Items in China warehouse
2. **Goods Received (Ghana)** - Items in Ghana warehouse  
3. **Sea Cargo** - Items in sea containers
4. **Air Cargo** - Items in air containers

#### Auto-Sync Feature:
- When goods are added to warehouses and linked to a Shipping Mark, they automatically appear in the Customer Shipments Page
- When cargo items are added to containers and linked to a Shipping Mark, they automatically appear in the appropriate category (Sea/Air)

## 🛠 API Endpoints

### Admin/Staff Endpoints

#### Container Management
```
GET    /api/cargo/containers/                     - List all containers
POST   /api/cargo/containers/                     - Create new container
GET    /api/cargo/containers/{id}/                - Get container details
PUT    /api/cargo/containers/{id}/                - Update container
DELETE /api/cargo/containers/{id}/                - Delete container

# Container-specific actions
GET    /api/cargo/containers/{id}/cargo_items/    - Get items in container
POST   /api/cargo/containers/{id}/add_cargo_item/ - Add item to container
GET    /api/cargo/containers/{id}/client_summaries/ - Get client summaries
```

#### Cargo Item Management
```
GET    /api/cargo/cargo-items/           - List all cargo items
POST   /api/cargo/cargo-items/           - Create cargo item
GET    /api/cargo/cargo-items/{id}/      - Get cargo item details
PUT    /api/cargo/cargo-items/{id}/      - Update cargo item
DELETE /api/cargo/cargo-items/{id}/      - Delete cargo item
```

#### Customer Management
```
GET    /api/cargo/customers/             - List customers (for selection)
GET    /api/cargo/shipping-marks/        - Get shipping marks for dropdowns
```

#### Dashboard & Statistics
```
GET    /api/cargo/dashboard/             - Cargo dashboard stats
GET    /api/cargo/statistics/            - Overall cargo statistics
POST   /api/cargo/bulk-upload/           - Bulk upload cargo items from Excel
```

### Customer Endpoints

#### Customer Shipments Page (Main Feature)
```
GET    /api/cargo/customer/shipments/    - Get all customer shipments by category
GET    /api/cargo/customer/shipments/stats/ - Get shipment statistics
GET    /api/cargo/customer/shipments/track/{tracking_id}/ - Track specific item
```

#### Customer Cargo Access
```
GET    /api/cargo/customer/containers/   - Customer's containers only
GET    /api/cargo/customer/cargo-items/  - Customer's cargo items only
GET    /api/cargo/customer/dashboard/    - Customer cargo dashboard
```

## 📊 Data Models

### CargoContainer
```python
container_id = CharField(unique=True, primary_key=True)
cargo_type = CharField(choices=['sea', 'air'])
weight = FloatField()
cbm = FloatField()
load_date = DateField()
eta = DateField()
unloading_date = DateField()
route = CharField()
rates = DecimalField()
stay_days = IntegerField()
delay_days = IntegerField()
status = CharField(choices=['pending', 'in_transit', 'delivered', 'demurrage'])
```

### CargoItem
```python
id = UUIDField(primary_key=True)
container = ForeignKey(CargoContainer)
client = ForeignKey(CustomerUser)  # Linked by shipping_mark
tracking_id = CharField(unique=True)
item_description = TextField()
quantity = IntegerField()
weight = FloatField()
cbm = FloatField()
unit_value = DecimalField()
total_value = DecimalField()
status = CharField(choices=['pending', 'in_transit', 'delivered', 'delayed'])
```

### CustomerUser (Shipping Mark)
```python
shipping_mark = CharField(unique=True)  # Auto-generated: PM{FIRSTNAME}{Counter}
# Example: PMJOHN01, PMJANE02, PMMIKE01
```

## 🔄 Workflow Implementation

### 1. Container Creation
1. User creates a new container (Sea or Air)
2. Container gets unique ID and basic details
3. Status starts as 'pending'

### 2. Adding Cargo Items
1. User opens the container
2. Clicks "Add Item" 
3. In the popup:
   - **Client field shows only Shipping Marks** (e.g., PMJOHN01, PMJANE02)
   - User selects shipping mark from dropdown
   - Enters item details (description, quantity, CBM, weight, value)
4. System automatically:
   - Links item to customer via shipping mark
   - Generates tracking ID
   - Updates container summaries

### 3. Customer Shipments Auto-Sync
The Customer Shipments Page automatically shows:

#### Goods Received (China)
- All items in China warehouse with customer's shipping mark
- Status: PENDING → READY_FOR_SHIPPING → SHIPPED

#### Goods Received (Ghana)  
- All items in Ghana warehouse with customer's shipping mark
- Status: PENDING → READY_FOR_DELIVERY → DELIVERED

#### Sea Cargo
- All cargo items in sea containers with customer's shipping mark
- Status: pending → in_transit → delivered

#### Air Cargo
- All cargo items in air containers with customer's shipping mark
- Status: pending → in_transit → delivered

## 🔧 Frontend Integration

### Container Management UI
```javascript
// Create Container
POST /api/cargo/containers/
{
  "container_id": "SEA001",
  "cargo_type": "sea",
  "load_date": "2024-12-30",
  "eta": "2025-01-15",
  "route": "China to Ghana"
}

// Add Cargo Item to Container
POST /api/cargo/containers/SEA001/add_cargo_item/
{
  "client_shipping_mark": "PMJOHN01",
  "item_description": "Electronics components",
  "quantity": 10,
  "cbm": 2.5,
  "weight": 150.0,
  "unit_value": 50.00,
  "total_value": 500.00
}
```

### Customer Shipments Page UI
```javascript
// Get Customer's All Shipments
GET /api/cargo/customer/shipments/
// Returns:
{
  "customer_info": {
    "shipping_mark": "PMJOHN01",
    "customer_name": "John Doe"
  },
  "goods_received_china": {
    "count": 5,
    "total_cbm": 12.5,
    "items": [...]
  },
  "goods_received_ghana": {
    "count": 2,
    "total_cbm": 4.2,
    "items": [...]
  },
  "sea_cargo": {
    "count": 8,
    "total_cbm": 15.3,
    "items": [...]
  },
  "air_cargo": {
    "count": 3,
    "total_cbm": 2.1,
    "items": [...]
  }
}
```

### Shipping Mark Dropdown
```javascript
// Get Shipping Marks for Dropdown
GET /api/cargo/shipping-marks/
// Returns:
[
  {"id": 1, "shipping_mark": "PMJOHN01"},
  {"id": 2, "shipping_mark": "PMJANE02"},
  {"id": 3, "shipping_mark": "PMMIKE01"}
]

// In UI, show only shipping marks:
<select name="client">
  <option value="1">PMJOHN01</option>
  <option value="2">PMJANE02</option>
  <option value="3">PMMIKE01</option>
</select>
```

## 🎯 Key Implementation Points

### 1. Shipping Mark as Primary Identifier
- ✅ System generates unique shipping marks automatically
- ✅ Format: PM{FIRSTNAME}{Counter} (e.g., PMJOHN01, PMJANE02)
- ✅ All items linked via shipping mark, not customer name
- ✅ Client dropdowns show only shipping marks

### 2. Container → Cargo Item Flow
- ✅ Create Container first
- ✅ Open container to view details
- ✅ Add cargo items within container
- ✅ Each item linked to shipping mark
- ✅ Auto-generate tracking IDs

### 3. Customer Shipments Auto-Sync
- ✅ Items automatically appear when linked to shipping mark
- ✅ Four categories: China, Ghana, Sea, Air
- ✅ Real-time aggregation by shipping mark
- ✅ Status tracking across all categories

### 4. Claims Integration
- ✅ Claims module can reference cargo items by tracking ID
- ✅ Claims linked to shipping marks for customer association
- ✅ Cross-module item tracking capabilities

## 🚀 Usage Examples

### Creating a Sea Container with Items
1. Create container: `POST /api/cargo/containers/`
2. Open container details: `GET /api/cargo/containers/SEA001/`
3. Add cargo item: `POST /api/cargo/containers/SEA001/add_cargo_item/`
4. Item appears in customer's Sea Cargo category automatically

### Customer Checking Their Shipments
1. Customer logs in with their account
2. Goes to Customer Shipments page
3. Sees all their items across 4 categories:
   - China warehouse goods
   - Ghana warehouse goods  
   - Sea cargo containers
   - Air cargo containers
4. Can track specific items by tracking ID

### Warehouse → Cargo Flow
1. Goods arrive in China warehouse → linked to PMJOHN01
2. Goods ready for shipping → moved to sea container
3. Cargo item created in sea container → linked to PMJOHN01
4. Customer sees item move from "China" to "Sea Cargo" category

This implementation fully satisfies the specification requirements with proper shipping mark integration, container management, and cross-module synchronization.
