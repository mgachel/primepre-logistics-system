# Shared Cargo Pages Implementation

## Overview
Instead of creating separate customer-specific cargo pages, we've modified the existing `SeaCargo.tsx` and `AirCargo.tsx` pages to support both admin and customer views with role-based UI adaptations.

## Changes Made

### Backend (`cargo/views.py`)
✅ **Fixed `CustomerCargoContainerViewSet.get_queryset()`**
- Added filtering to show only containers that have the customer's items
- Changed from `CargoContainer.objects.all()` to filtering by items with customer's shipping mark:
  ```python
  qs = CargoContainer.objects.filter(
      Q(items__client=user) | Q(items__client__shipping_mark=user.shipping_mark)
  ).distinct()
  ```

### Frontend Updates

#### 1. App.tsx Routes
✅ **Removed Customer-Specific Imports**
- Removed: `CustomerSeaCargo`, `CustomerAirCargo`, `CustomerCargoContainerDetailsPage`
- Kept: Shared `SeaCargo`, `AirCargo`, `ContainerDetailsPage`

✅ **Updated Routes**
- `/customer/cargo/sea` → Now uses `<SeaCargo />` (shared component)
- `/customer/cargo/air` → Now uses `<AirCargo />` (shared component)
- Container detail routes → Use shared `<ContainerDetailsPage />`

#### 2. SeaCargo.tsx (✅ COMPLETE)
✅ **Added Role Detection**
```typescript
import { useAuthStore } from "@/stores/authStore";
const { user } = useAuthStore();
const isCustomer = user?.user_role === "CUSTOMER";
```

✅ **Conditional API Calls**
- Admin: Uses `cargoService.getContainers()` and `cargoService.getDashboard()`
- Customer: Uses `cargoService.getCustomerSeaCargoContainers()` and `cargoService.getCustomerSeaCargoDashboard()`

✅ **Hidden Columns for Customers**
- **Customers ONLY see**: Container ID, Loading Date, ETA
- **Hidden from customers**: Rate, Clients, Total CBM, Status, and all other columns

✅ **Conditional UI Elements**
- **Page Title**: "My Sea Cargo" for customers, "Sea Cargo" for admins
- **Description**: "View containers where your goods are located" for customers
- **Action Buttons**: Hidden "Add Cargo" and "Excel Upload" for customers
- **Empty State**: Custom message for customers ("No containers found with your goods")
- **Row Actions**: 
  - Customer: Only "View Details" (navigates to `/customer/cargo/sea/container/{id}`)
  - Admin: Full actions (View, Edit, Update Status, Delete)
- **Bulk Actions**: Hidden for customers (no `renderBulkBar`)

#### 3. AirCargo.tsx (✅ COMPLETE)
✅ **Added Role Detection**
```typescript
import { useAuthStore } from "@/stores/authStore";
const { user } = useAuthStore();
const isCustomer = user?.user_role === "CUSTOMER";
```

✅ **Conditional API Calls**
- Admin: Uses `cargoService.getContainers()` and `cargoService.getDashboard()`
- Customer: Uses `cargoService.getCustomerAirCargoContainers()` and `cargoService.getCustomerAirCargoDashboard()`

✅ **Hidden Columns for Customers**
- **Customers ONLY see**: Airway Bill No., Flight Date, ETA
- **Hidden from customers**: Total Weight, Status, Clients, and all other columns

✅ **Conditional UI Elements**
- **Page Title**: "My Air Cargo" for customers, "Air Cargo" for admins
- **Description**: "View containers where your goods are located" for customers
- **Action Buttons**: Hidden "Add Air Container" and "Excel Upload" for customers
- **Row Actions**: 
  - Customer: Only "View Details" (navigates to `/customer/cargo/air/container/{id}`)
  - Admin: Full actions (View, Edit, Update Status, Delete)
- **Bulk Actions**: Not explicitly set, defaults to none for customers

#### 4. ContainerDetailsPage.tsx (✅ COMPLETE)
Now supports customer view:
- ✅ Detects customer role using `useAuthStore`
- ✅ Calls customer endpoints: `getCustomerContainerDetails()`, `getCustomerContainerItems()`
- ✅ Hides admin action buttons (Add Item, Edit Container, Excel Upload, Refresh)
- ✅ Hides edit/delete row actions for customers
- ✅ Updates description text for customers ("of your items")
- ✅ Backend filters items to show only customer's items (via shipping mark)

### Files to Delete (After Testing)
Once confirmed working, these customer-specific files can be deleted:
- `frontend/src/pages/CustomerSeaCargo.tsx`
- `frontend/src/pages/CustomerAirCargo.tsx`
- `frontend/src/pages/CustomerCargoContainerDetailsPage.tsx`

## Testing Checklist

### As Admin User
- [ ] Navigate to `/cargo/sea` - should show all containers
- [ ] Verify "Add Cargo" and "Excel Upload" buttons visible
- [ ] Verify all columns visible (including Rate and Clients)
- [ ] Verify row actions: View, Edit, Update Status, Delete
- [ ] Verify bulk selection and bulk actions bar
- [ ] Click container → navigates to `/containers/{id}`

### As Customer User
- [ ] Navigate to `/customer/cargo/sea` - should show only containers with customer's goods
- [ ] Verify page title is "My Sea Cargo"
- [ ] Verify "Add Cargo" and "Excel Upload" buttons HIDDEN
- [ ] Verify Rate and Clients columns HIDDEN
- [ ] Verify only "View Details" in row actions
- [ ] Verify NO bulk selection checkboxes
- [ ] Click container → navigates to `/customer/cargo/sea/container/{id}`
- [ ] Verify empty state shows "No containers found with your goods"

### Backend API Verification
- [ ] Test `/api/cargo/customer/containers/?cargo_type=sea` returns only customer's containers
- [ ] Test `/api/cargo/customer/containers/?cargo_type=air` returns only customer's containers
- [ ] Test `/api/cargo/customer/dashboard/?cargo_type=sea` returns customer stats
- [ ] Verify filtering by shipping_mark works correctly

## Benefits of Shared Approach

1. **Code Reusability**: Single codebase for both roles instead of duplicate pages
2. **Maintainability**: One place to update UI/logic for cargo pages
3. **Consistency**: Same layout/design for admin and customer views
4. **Type Safety**: Shared types and interfaces
5. **Less Bundle Size**: No duplicate component code

## Implementation Complete! ✅

All cargo pages now support both admin and customer roles:
- ✅ `SeaCargo.tsx` - Full role-based UI
- ✅ `AirCargo.tsx` - Full role-based UI  
- ✅ `ContainerDetailsPage.tsx` - Full role-based UI
- ✅ Backend filtering fixed (uses `cargo_items` not `items`)
- ✅ Customer navigation fixed (uses `container_id` not `id`)

## Remaining Tasks

1. **Test thoroughly** with both admin and customer accounts
2. **Delete redundant files** after confirming everything works:
   - `frontend/src/pages/CustomerSeaCargo.tsx`
   - `frontend/src/pages/CustomerAirCargo.tsx`
   - `frontend/src/pages/CustomerCargoContainerDetailsPage.tsx`
3. Update any documentation referencing old customer pages
