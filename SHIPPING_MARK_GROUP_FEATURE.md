# Shipping Mark Group Feature Implementation

## Overview
Implemented a new "Add Shipping Mark Group" feature for Ghana warehouse container details pages. This allows admins to add multiple items under a single shipping mark in one workflow, with automatic CBM calculation and invoice generation.

## Feature Description

### What It Does
Instead of adding items one by one, admins can now:
1. **Select a Shipping Mark/Client** - Choose from the customer directory
2. **Add Multiple Items** - Add as many cargo items as needed for that shipping mark
3. **Auto-Calculate CBM** - For sea cargo, CBM is automatically calculated from dimensions (Length × Breadth × Height × Quantity / 1,000,000)
4. **View Summary** - See total quantity, CBM, and weight as items are added
5. **Generate Invoice** - Optionally save and view a formatted invoice with all items

## User Interface

### Step 1: Select Client
- Search and select a shipping mark/client from the customer directory
- Shows shipping mark, client name, and phone number for easy identification

### Step 2: Add Items
- Clean card-based interface for each item
- Required fields:
  - **Supply Tracking** - Unique tracking number
  - **Quantity** - Number of cartons (CTNS)
  - **Dimensions** (Sea Cargo): Length, Breadth, Height in centimeters
  - **Weight** (Air Cargo): Weight in kilograms

- Optional fields:
  - **Description** - Brief description of the item
  - **Notes** - Additional information

### Features While Adding Items:
- **Add Another Item** button to add more items
- **Remove Item** button (appears when multiple items exist)
- **Real-time CBM calculation** for sea cargo
- **Live summary** showing:
  - Total number of items
  - Total quantity (CTNS)
  - Total CBM (sea) or Total Weight (air)
- **Change Client** button to go back and select a different shipping mark

### Step 3: Save Options
The dialog stays open after saving, allowing continuous item addition:

1. **Save & Add More** (Primary action)
   - Saves current batch of items
   - Clears the form but keeps the shipping mark selected
   - Shows a success message with count of items saved
   - Allows adding more items for the same shipping mark
   - Updates the "already saved" counter in the footer

2. **Save & View Invoice**
   - Saves all current items
   - Generates and displays a printable invoice
   - Opens invoice in new window/tab
   - Closes the dialog after saving

3. **Finish & Close**
   - Closes the dialog
   - Shows total count of all items saved in the session
   - Use this when done adding all items for the shipping mark

### Workflow Benefits
- **No interruption**: Keep adding items without reopening the dialog
- **Visual feedback**: See how many items already saved (green checkmark)
- **Flexible batching**: Save items in groups as you go
- **Safety**: Items are saved immediately, reducing risk of data loss
- **Progress tracking**: Always know how many items you've added

## Invoice Features

The generated invoice includes:
- **Header**: Company name and invoice title
- **Invoice Details**:
  - Container ID
  - Shipping Mark
  - Client name
  - Container type (SEA/AIR)
  - Location
  - Invoice number (Container-ShippingMark)
  - Date generated
- **Summary Box**:
  - Total items count
  - Total quantity (CTNS)
  - Total CBM (for sea) or Total Weight (for air)
  - Estimated total amount
- **Detailed Table**:
  - Item number
  - Supply tracking
  - Description
  - Quantity
  - Dimensions (for sea) or Weight (for air)
  - CBM per item (for sea)
- **Footer**: Company info and generation timestamp

The invoice opens in a new window and is ready to print.

## Technical Implementation

### Files Created/Modified

1. **New Component**: `frontend/src/components/dialogs/AddShippingMarkGroupDialog.tsx`
   - Multi-step dialog (client selection → item addition)
   - Real-time CBM calculation
   - Invoice generation
   - Batch API calls for item creation

2. **Modified**: `frontend/src/pages/GoodsReceivedContainerDetailsPage.tsx`
   - Added "Add Shipping Mark Group" button (primary action)
   - Added "Add Single Item" button (secondary action for individual items)
   - Integrated new dialog component

### Key Features
- **Validation**: Comprehensive validation for all required fields
- **Error Handling**: Clear error messages for failed operations
- **Auto-Calculation**: CBM calculated automatically from dimensions
- **Batch Processing**: All items created in parallel for better performance
- **Invoice Generation**: Printable HTML invoice with professional styling
- **Responsive Design**: Works on all screen sizes

## Benefits

### For Admins
- **Faster Data Entry**: Add multiple items at once instead of one by one
- **Better Organization**: Group items by shipping mark logically
- **Fewer Clicks**: Complete workflow in one dialog
- **Immediate Feedback**: See totals and summaries as you work
- **Invoice Ready**: Generate invoice immediately after adding items

### For System
- **Better UX**: More intuitive workflow
- **Data Integrity**: All items for a shipping mark added together
- **Audit Trail**: Clear grouping by shipping mark
- **Professional Output**: Formatted invoices for clients

## Usage Instructions

### For Sea Cargo:
1. Click "Add Shipping Mark Group" button
2. Search and select the client/shipping mark
3. For each item, enter:
   - Supply tracking number
   - Quantity (CTNS)
   - Length (cm)
   - Breadth (cm)
   - Height (cm)
   - Description (optional)
   - Notes (optional)
4. Click "Save & Add More" to save current items
5. The form clears but shipping mark remains selected
6. Continue adding more items as needed
7. Click "Add Another Item" if you want to add multiple items in one batch
8. When completely done, click "Finish & Close"

**Alternative workflows:**
- Click "Save & View Invoice" at any time to save and generate invoice
- Click "Add Another Item" to batch multiple items before saving

### For Air Cargo:
Same as above, but instead of dimensions, enter:
- Weight (kg) for each item
- Summary shows total weight instead of CBM

### Tips:
- Items are saved immediately when you click "Save & Add More"
- Green checkmark shows how many items already saved
- You can add items one at a time or in batches
- Dialog stays open until you click "Finish & Close"
- All items are automatically grouped under the selected shipping mark

## Future Enhancements

Possible improvements:
1. **Rate Integration**: Fetch actual rates from container and calculate exact amounts
2. **Email Invoice**: Send invoice directly to customer
3. **PDF Generation**: Generate PDF instead of HTML for better portability
4. **Template Customization**: Allow customizing invoice template
5. **Bulk Edit**: Edit multiple items at once
6. **Duplicate Detection**: Warn about duplicate supply tracking numbers
7. **Import from Excel**: Import items from Excel directly into the form

## Date Implemented
October 8, 2025
