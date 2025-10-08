# Flexible CBM Entry & Edit Features Implementation

## Summary
Implemented flexible CBM entry modes and item editing capabilities for the Ghana goods received system, plus password reset functionality for clients.

## Features Implemented

### 1. Flexible CBM Entry for Goods Received Items
**Location:** `AddShippingMarkGroupDialog.tsx`, `EditGoodsReceivedItemDialog.tsx`

Workers can now choose between two CBM entry methods for sea cargo:

#### **Dimensions Mode** (Auto-calculation)
- Enter: Length, Breadth, Height (in cm)
- System automatically calculates: CBM = (L × B × H × Quantity) / 1,000,000
- CBM field is read-only and shows calculated value

#### **Direct CBM Mode** (Manual entry)
- Enter: CBM value directly
- No dimensions required
- Useful when workers already know the total CBM

**UI Implementation:**
- Toggle buttons to switch between modes
- Clear visual indication of selected mode
- Smooth mode switching with automatic field clearing
- Helper text to guide users

**Backend Support:**
- Updated `CreateGoodsReceivedItemSerializer` in `GoodsRecieved/serializers.py`
- Validates that EITHER dimensions OR direct CBM is provided for sea cargo
- Dimensions fields are now optional (`required: False, allow_null: True`)
- Existing `GoodsReceivedGhanaSerializer` already had this flexibility

### 2. Edit Goods Received Items
**Location:** `EditGoodsReceivedItemDialog.tsx`, `GoodsReceivedContainerDetailsPage.tsx`

Admins can now edit existing items in goods received containers:

**Features:**
- Edit button in row actions dropdown for each item
- Full form with all item details pre-populated
- Supports both CBM entry modes (dimensions vs direct)
- Intelligently detects which mode the item was created with
- Updates client, dimensions, CBM, quantity, description, notes
- Admin-only feature (customers cannot edit)

**Data Loading:**
- Smart detection of entry mode based on existing data:
  - If dimensions exist → uses Dimensions Mode
  - If only CBM exists → uses Direct Mode
  - Handles number/string conversions properly
- All fields populated correctly including client information

**Service Method:**
- Uses existing `updateItem()` method in `goodsReceivedContainerService`
- Sends appropriate payload based on selected entry mode

### 3. Client Password Reset
**Location:** `Clients.tsx`

Admins can reset client passwords to default "PrimeMade":

**Features:**
- "Reset Password" option in client row actions dropdown
- Confirmation dialog showing the new password
- Automatically resets password to "PrimeMade"
- Success/error toast notifications
- Uses existing `resetUserPassword()` method from `adminService`

**UI Elements:**
- KeyRound icon for visual clarity
- Clear confirmation message
- Shows client name in confirmation

## Technical Details

### Backend Changes

#### GoodsRecieved/serializers.py
```python
class CreateGoodsReceivedItemSerializer(serializers.ModelSerializer):
    class Meta:
        extra_kwargs = {
            'customer': {'required': False, 'allow_null': True},
            'length': {'required': False, 'allow_null': True},
            'breadth': {'required': False, 'allow_null': True},
            'height': {'required': False, 'allow_null': True},
            'cbm': {'required': False, 'allow_null': True},
        }
    
    def validate(self, data):
        """Validate that for sea cargo, either dimensions OR CBM is provided."""
        # Ensures flexibility while maintaining data integrity
```

### Frontend Changes

#### ItemForm Interface (AddShippingMarkGroupDialog.tsx)
```typescript
interface ItemForm {
  id: string;
  supplyTracking: string;
  quantity: string;
  description: string;
  length: string;
  breadth: string;
  height: string;
  cbm: string;
  weight: string;
  notes: string;
  cbmEntryMode: 'dimensions' | 'direct';  // NEW: tracks entry method
}
```

#### CBM Mode Switching Logic
- `handleCbmEntryModeChange()`: Switches modes and clears appropriate fields
- `updateItemCbm()`: Only calculates when in 'dimensions' mode
- Validation respects selected mode

#### Edit Dialog Features
- Smart initialization based on existing item data
- Proper type conversion for numbers/strings
- Debug logging for troubleshooting
- Handles null/undefined values gracefully

## User Workflows

### Adding Items with Flexible CBM Entry

**Scenario 1: Worker knows dimensions**
1. Click "Add Shipping Mark Group"
2. Select client
3. Keep "Enter Dimensions" mode (default)
4. Enter Length, Breadth, Height
5. CBM auto-calculates
6. Click "Add & Continue" or "Add & Generate Invoice"

**Scenario 2: Worker knows CBM directly**
1. Click "Add Shipping Mark Group"
2. Select client
3. Switch to "Enter CBM Directly" mode
4. Enter CBM value directly
5. No dimensions needed
6. Click "Add & Continue" or "Add & Generate Invoice"

### Editing Existing Items

1. Navigate to Goods Received Container Details
2. Expand shipping mark group
3. Click row actions (⋮) for any item
4. Click "Edit Item"
5. Dialog opens with current values pre-filled
6. Modify any fields (can switch CBM entry mode)
7. Click "Update Item"
8. Changes are saved and list refreshes

### Resetting Client Passwords

1. Go to Clients page
2. Find client in list
3. Click row actions (⋮)
4. Click "Reset Password"
5. Confirm the action
6. Password is reset to "PrimeMade"
7. Client can now login with default password

## Validation Rules

### Sea Cargo Items
- **Must have:** Supply Tracking, Quantity, Client
- **Must have ONE of:**
  - Dimensions Mode: Length, Breadth, Height (all required)
  - Direct Mode: CBM value

### Air Cargo Items
- **Must have:** Supply Tracking, Quantity, Client, Weight

## Error Handling

- Frontend validation before submission
- Backend validation with clear error messages
- Toast notifications for success/failure
- Console logging for debugging
- Type-safe field conversions

## Benefits

1. **Flexibility:** Workers can use whichever method is most convenient
2. **Accuracy:** Reduces manual calculation errors
3. **Speed:** Faster data entry when CBM is already known
4. **User-Friendly:** Clear UI with visual indicators
5. **Edit Capability:** Fix mistakes without deleting and recreating
6. **Password Management:** Easy password reset for support tasks

## Notes

- Edit feature is admin-only (respects `isCustomer` check)
- CBM precision: 5 decimal places for accuracy
- Dimensions in centimeters (cm)
- Weight in kilograms (kg)
- Password reset is immediate and cannot be undone
- Dialog stays open for continuous addition in AddShippingMarkGroupDialog
- Edit dialog closes after successful update

## Files Modified

### Frontend
- `frontend/src/components/dialogs/AddShippingMarkGroupDialog.tsx` - Added CBM entry mode toggle
- `frontend/src/components/dialogs/EditGoodsReceivedItemDialog.tsx` - NEW: Edit dialog with flexible CBM
- `frontend/src/pages/GoodsReceivedContainerDetailsPage.tsx` - Added edit functionality
- `frontend/src/pages/Clients.tsx` - Added password reset option

### Backend
- `GoodsRecieved/serializers.py` - Made dimensions optional, added validation

## Testing Checklist

- [ ] Add item with dimensions mode (auto-calc CBM)
- [ ] Add item with direct CBM mode (no dimensions)
- [ ] Edit item and switch between modes
- [ ] Edit item and verify all fields populate correctly
- [ ] Verify CBM calculations are accurate
- [ ] Verify edit is admin-only
- [ ] Reset client password and verify login works
- [ ] Verify validation messages appear correctly
- [ ] Test with air cargo (no CBM fields)
- [ ] Test invoice generation after adding items
