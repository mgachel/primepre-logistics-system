# Bulk Upload Excel Template

The bulk upload feature expects an Excel file (.xlsx or .xls) with the following columns:

## Required Columns:
- `shipping_mark` - Must match an existing customer's shipping mark
- `item_description` - Description of the cargo item
- `quantity` - Number of items (integer)
- `cbm` - Cubic meters (decimal)

## Optional Columns:
- `weight` - Weight in kg (decimal)
- `unit_value` - Value per unit (decimal)
- `total_value` - Total value (decimal)
- `status` - Status of the item (default: "pending")

## Example Data:
| shipping_mark | item_description | quantity | cbm | weight | unit_value | total_value | status |
|---------------|------------------|----------|-----|--------|------------|-------------|---------|
| PMBRIGHT LUCIEN JNR | Electronics | 10 | 2.5 | 100.0 | 50.0 | 500.0 | pending |
| PMTEST | Clothing | 20 | 1.8 | 30.0 | 25.0 | 500.0 | pending |

## Important Notes:
1. The shipping_mark must exactly match an existing customer's shipping mark in the system
2. quantity must be an integer
3. cbm, weight, unit_value, and total_value must be decimal numbers
4. The Excel file must have a .xlsx or .xls extension
5. You must select a valid container for the upload

## Available Shipping Marks:
- PMBRIGHT LUCIEN JNR
- PM  
- PMTEST

## Error Handling:
If there are errors with specific rows, the system will:
- Skip invalid rows and continue processing valid ones
- Return a list of errors for each problematic row
- Still create items for valid rows even if some fail
