# DIAGNOSTIC: Air Cargo vs Goods Received Ghana Air Issue

## Problem Description
The user reports that "items in the cargo air and goods received ghana air are the same things" which shouldn't be the case.

## Expected Behavior
- **Air Cargo** (`/pages/AirCargo.tsx`) should show cargo containers for air shipments
- **Goods Received Ghana Air** (`/pages/GoodsReceivedGhanaAir.tsx`) should show individual goods received in Ghana warehouse

## API Endpoints Being Called

### Air Cargo Page
- **Endpoint**: `/api/cargo/containers/?cargo_type=air`
- **Service**: `cargoService.getContainers({ cargo_type: "air" })`
- **Expected Data**: CargoContainer objects with cargo_type='air'
- **Model**: `cargo.models.CargoContainer`

### Goods Received Ghana Air Page  
- **Endpoint**: `/api/goods/ghana/air_cargo/`
- **Service**: `warehouseService.getGhanaAirGoods()`
- **Expected Data**: GoodsReceivedGhana objects with method_of_shipping='AIR'
- **Model**: `GoodsRecieved.models.GoodsReceivedGhana`

## Root Cause Analysis

### Possible Issues:
1. **Same Data Source**: Both systems might be reading from the same database table
2. **Data Synchronization**: Data might be automatically synced between systems
3. **URL Routing Error**: URLs might be incorrectly routed to the same view
4. **Model Confusion**: The models might be referencing the same underlying data

### Backend Analysis:
- CargoContainer model has `location` and `warehouse_type` fields
- CargoContainer can have location='ghana' and warehouse_type='goods_received'
- This means cargo containers can represent goods received operations!

## Potential Solution:
The CargoContainer model appears to be used for both:
1. **Traditional Cargo Operations** (location='china', warehouse_type='cargo')
2. **Goods Received Operations** (location='ghana', warehouse_type='goods_received')

The GoodsReceivedGhana model might be separate but the frontend might be calling the wrong endpoints or there might be data duplication.

## Next Steps:
1. Check if both systems are supposed to co-exist or if one should replace the other
2. Verify the actual data returned by each endpoint
3. Clarify the intended architecture: single unified system vs separate systems