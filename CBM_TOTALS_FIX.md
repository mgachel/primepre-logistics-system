# CBM/Weight Totals Not Updating After Excel Upload - FIXED

## Issue Description
After uploading an Excel file to add cargo items to a sea or air container, the container's CBM (for sea cargo) or weight (for air cargo) column was not showing the accurate totals. The individual items had correct CBM/weight values, but the container's total was not updated.

## Root Cause
The issue was in the `ContainerItemsCreateView` in `cargo/container_excel_views.py`. When processing Excel uploads:

1. **Matched Items Path**: Items that automatically matched existing customers were created using individual `CargoItem.save()` calls in `ShippingMarkMatcher.create_cargo_items()`. These triggered the model's `save()` method which updates container totals.

2. **Resolved Mappings Path** (PROBLEM): Items from resolved mappings (unmatched shipping marks that admin mapped) were created using `CargoItem.objects.bulk_create()` for performance. However, `bulk_create()` **bypasses the model's `save()` method**, so the container totals were never recalculated.

## The Fix
Added explicit container total updates in two places in `container_excel_views.py`:

### 1. After Matched Items Creation (Line ~280)
```python
# Update container totals after matched items creation
# (Individual saves should trigger updates, but ensure it's done)
if created_items:
    if container.cargo_type == 'sea':
        container.update_total_cbm()
    elif container.cargo_type == 'air':
        container.update_total_weight()
```

### 2. After Bulk Create for Resolved Mappings (Line ~545)
```python
# Update container totals (CBM for sea cargo, weight for air cargo)
# This is critical after bulk_create since it bypasses save() signals
try:
    if container.cargo_type == 'sea':
        container.update_total_cbm()
        logger.info(
            "Updated container %s total CBM to %.2f after bulk item creation",
            container.container_id,
            container.cbm or 0
        )
    elif container.cargo_type == 'air':
        container.update_total_weight()
        logger.info(
            "Updated container %s total weight to %.2f after bulk item creation",
            container.container_id,
            container.weight or 0
        )
except Exception as exc:
    logger.error(
        "Error updating container totals for %s: %s",
        container.container_id,
        exc,
        exc_info=True
    )
```

## How It Works
The `CargoContainer` model (in `cargo/models.py`) has two methods:

1. **`calculate_total_cbm()`**: Sums up all `cbm` values from cargo items (for sea cargo)
2. **`calculate_total_weight()`**: Sums up all `weight` values from cargo items (for air cargo)
3. **`update_total_cbm()`**: Calls `calculate_total_cbm()` and saves the result to the container's `cbm` field
4. **`update_total_weight()`**: Calls `calculate_total_weight()` and saves the result to the container's `weight` field

These methods are now explicitly called after bulk item creation.

## Impact
- ✅ Sea cargo containers will now show accurate total CBM after Excel upload
- ✅ Air cargo containers will now show accurate total weight after Excel upload
- ✅ Both matched items and resolved mappings paths are covered
- ✅ Logging added to track when totals are updated
- ✅ Error handling ensures upload doesn't fail if total update has issues

## Testing
To verify the fix:
1. Upload an Excel file with cargo items to a sea container
2. Check that the container's CBM column shows the sum of all items' CBM values
3. Upload an Excel file with cargo items to an air container
4. Check that the container's weight column shows the sum of all items' weight values
5. Check both immediately matched items and resolved mappings scenarios

## Management Command for Existing Data
If you have existing containers with incorrect totals, you can recalculate them using the management command:

```bash
# Recalculate both sea (CBM) and air (weight) containers
python manage.py recalculate_container_cbm

# Recalculate only sea containers
python manage.py recalculate_container_cbm --cargo-type=sea

# Recalculate only air containers
python manage.py recalculate_container_cbm --cargo-type=air
```

This command will:
- Find all containers of the specified type(s)
- Recalculate totals from their cargo items
- Display which containers were updated with old → new values
- Report how many containers were updated

## Date Fixed
October 8, 2025
