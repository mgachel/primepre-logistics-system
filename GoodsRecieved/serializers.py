from rest_framework import serializers
from .models import GoodsReceivedChina, GoodsReceivedGhana
from users.models import CustomerUser
import pandas as pd
import io
from decimal import Decimal, InvalidOperation

# Config
CHINA_DEFAULT_LOCATION = "GUANGZHOU"
GHANA_DEFAULT_LOCATION = "ACCRA"
MAX_FILE_SIZE_MB = 10
MAX_CBM_LIMIT = 1000
MAX_WEIGHT_LIMIT = 50000
MAX_QUANTITY_LIMIT = 100000
MAX_VALUE_LIMIT = 1000000


class BaseGoodsReceivedSerializer(serializers.ModelSerializer):
    """
    Base serializer for GoodsReceived models with common validation logic.
    """
    days_in_warehouse = serializers.SerializerMethodField()
    is_flagged = serializers.SerializerMethodField()

    def get_days_in_warehouse(self, obj):
        """Returns the number of days goods have been in warehouse."""
        return obj.days_in_warehouse

    def get_is_flagged(self, obj):
        """Returns True if status is FLAGGED."""
        return obj.is_flagged

    class Meta:
        abstract = True
        read_only_fields = ["date_received", "created_at", "updated_at"]

    def validate_cbm(self, value):
        """Ensure CBM is within allowed limits when provided."""
        if value is not None and value > MAX_CBM_LIMIT:
            raise serializers.ValidationError(f"CBM too large (max {MAX_CBM_LIMIT}).")
        return value

    def validate_weight(self, value):
        """Ensure weight is within allowed limits."""
        if value and value > MAX_WEIGHT_LIMIT:
            raise serializers.ValidationError(f"Weight too large (max {MAX_WEIGHT_LIMIT} kg).")
        return value

    def validate_quantity(self, value):
        """Ensure quantity is positive and within allowed limits."""
        if value and value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0.")
        if value and value > MAX_QUANTITY_LIMIT:
            raise serializers.ValidationError(f"Quantity too large (max {MAX_QUANTITY_LIMIT}).")
        return value

    def validate(self, data):
        """Ensure shipping_mark matches customer's shipping_mark when both are provided."""
        customer = data.get("customer")
        shipping_mark = data.get("shipping_mark")
        
        # If customer is provided but no shipping_mark, auto-populate from customer
        if customer and not shipping_mark and hasattr(customer, "shipping_mark") and customer.shipping_mark:
            data["shipping_mark"] = customer.shipping_mark
        
        # If both customer and shipping_mark are provided, ensure they match
        elif customer and shipping_mark and hasattr(customer, "shipping_mark") and customer.shipping_mark:
            if customer.shipping_mark != shipping_mark:
                raise serializers.ValidationError({
                    "shipping_mark": f"Must match customer's shipping mark: {customer.shipping_mark}"
                })
        
        return data


class GoodsReceivedChinaSerializer(BaseGoodsReceivedSerializer):
    """Serializer for China warehouse goods."""
    is_ready_for_shipping = serializers.ReadOnlyField()

    class Meta:
        model = GoodsReceivedChina
        fields = [
            "id", "customer", "shipping_mark", "supply_tracking",
            "cbm", "weight", "quantity", "description",
            "status", "method_of_shipping", "date_loading",
            "date_received", "created_at", "updated_at",
            "days_in_warehouse", "is_ready_for_shipping", "is_flagged",
        ]
        read_only_fields = ["date_received", "created_at", "updated_at"]
        extra_kwargs = {
            'customer': {'required': False, 'allow_null': True},
            'shipping_mark': {'required': False, 'allow_null': True, 'allow_blank': True},
            'weight': {'required': False, 'allow_null': True},
            'cbm': {'required': False, 'allow_null': True}
        }

    def validate(self, data):
        """Override to make weight optional for SEA and CBM optional for AIR."""
        # Call parent validation first
        data = super().validate(data)
        
        method_of_shipping = data.get('method_of_shipping')
        
        # For SEA shipping, weight is not needed
        if method_of_shipping == 'SEA':
            # Remove weight if provided for SEA shipping
            if 'weight' in data:
                data.pop('weight', None)
        
        # For AIR shipping, CBM is not needed
        if method_of_shipping == 'AIR':
            # Remove CBM if provided for AIR shipping
            if 'cbm' in data:
                data.pop('cbm', None)
        
        return data

    def validate_supply_tracking(self, value):
        """Validate supply tracking uniqueness."""
        if value:
            # Check if supply_tracking already exists for this model
            if self.instance:
                # Update case - exclude current instance
                if GoodsReceivedChina.objects.filter(supply_tracking=value).exclude(id=self.instance.id).exists():
                    raise serializers.ValidationError("Goods Received (China) with this supply tracking already exists.")
            else:
                # Create case - check if exists
                if GoodsReceivedChina.objects.filter(supply_tracking=value).exists():
                    raise serializers.ValidationError("Goods Received (China) with this supply tracking already exists.")
        return value


class GoodsReceivedGhanaSerializer(BaseGoodsReceivedSerializer):
    """Serializer for Ghana warehouse goods."""
    is_ready_for_delivery = serializers.ReadOnlyField()

    class Meta:
        model = GoodsReceivedGhana
        fields = [
            "id", "customer", "shipping_mark", "supply_tracking",
            "cbm", "weight", "quantity", "description", "location",
            "status", "method_of_shipping", "date_loading",
            "date_received", "created_at", "updated_at",
            "days_in_warehouse", "is_ready_for_delivery", "is_flagged",
        ]
        read_only_fields = ["date_received", "created_at", "updated_at"]
        extra_kwargs = {
            'customer': {'required': False, 'allow_null': True},
            'shipping_mark': {'required': False, 'allow_null': True, 'allow_blank': True},
            'cbm': {'required': False, 'allow_null': True}
        }

    def validate(self, data):
        """Override to make CBM conditional based on shipping method."""
        # Call parent validation first
        data = super().validate(data)
        
        method_of_shipping = data.get("method_of_shipping")
        cbm = data.get("cbm")
        
        # CBM is required for SEA but optional for AIR
        if method_of_shipping == "SEA" and not cbm:
            raise serializers.ValidationError({
                "cbm": "CBM is required for sea cargo."
            })
        
        return data

    def validate_supply_tracking(self, value):
        """Validate supply tracking uniqueness."""
        if value:
            # Check if supply_tracking already exists for this model
            if self.instance:
                # Update case - exclude current instance
                if GoodsReceivedGhana.objects.filter(supply_tracking=value).exclude(id=self.instance.id).exists():
                    raise serializers.ValidationError("Goods Received (Ghana) with this supply tracking already exists.")
            else:
                # Create case - check if exists
                if GoodsReceivedGhana.objects.filter(supply_tracking=value).exists():
                    raise serializers.ValidationError("Goods Received (Ghana) with this supply tracking already exists.")
        return value


class StatusUpdateSerializer(serializers.Serializer):
    status = serializers.CharField(max_length=20)
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True)


class BulkStatusUpdateSerializer(serializers.Serializer):
    item_ids = serializers.ListField(
        child=serializers.CharField(max_length=50),
        min_length=1,
        max_length=100
    )
    status = serializers.CharField(max_length=20)
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True)


class GoodsSearchSerializer(serializers.Serializer):
    shipping_mark = serializers.CharField(max_length=20, required=False)
    supply_tracking = serializers.CharField(max_length=50, required=False)
    status = serializers.CharField(max_length=20, required=False)
    location = serializers.CharField(max_length=20, required=False)
    date_from = serializers.DateTimeField(required=False)
    date_to = serializers.DateTimeField(required=False)
    customer_id = serializers.IntegerField(required=False)


class GoodsStatsSerializer(serializers.Serializer):
    total_items = serializers.IntegerField()
    pending_count = serializers.IntegerField()
    ready_for_shipping_count = serializers.IntegerField()
    flagged_count = serializers.IntegerField()
    shipped_count = serializers.IntegerField()
    cancelled_count = serializers.IntegerField()
    total_cbm = serializers.DecimalField(max_digits=15, decimal_places=3)
    total_weight = serializers.DecimalField(max_digits=15, decimal_places=2)
    average_days_in_warehouse = serializers.FloatField()


class ExcelUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    warehouse = serializers.ChoiceField(choices=[("china", "China"), ("ghana", "Ghana")])

    def validate_file(self, value):
        if not value.name.endswith((".xlsx", ".xls")):
            raise serializers.ValidationError("File must be Excel (.xlsx, .xls)")
        if value.size > MAX_FILE_SIZE_MB * 1024 * 1024:
            raise serializers.ValidationError(f"File must be less than {MAX_FILE_SIZE_MB}MB")
        return value

    def parse_date(self, date_value, row_index, field_name):
        """Parse date from various formats with detailed error reporting."""
        if pd.isna(date_value) or date_value in (None, "", "nan"):
            return None
            
        try:
            # Try pandas to_datetime which handles many formats
            parsed_date = pd.to_datetime(date_value, dayfirst=True, errors='coerce')
            if pd.isna(parsed_date):
                raise ValueError("Could not parse date")
            return parsed_date.date()
        except Exception as e:
            raise serializers.ValidationError(
                f"Row {row_index + 2}: Invalid {field_name} format '{date_value}'. Expected formats: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD"
            )

    def validate_excel_data(self, df, warehouse_type):
        """Validate Excel data according to specific column structure A,B,C,D,E,G,H."""
        errors = []
        
        # Ensure we have the minimum required number of columns
        if len(df.columns) < 8:
            errors.append(f"Excel file must have at least 8 columns (A-H). Found {len(df.columns)} columns.")
            
        # Define expected column mapping based on position
        expected_columns = {
            0: "shipping_mark",      # Column A: SHIPPING MARK/CLIENT
            1: "date_receipt",       # Column B: DATE OF RECEIPT  
            2: "date_loading",       # Column C: DATE OF LOADING
            3: "description",        # Column D: DESCRIPTION
            4: "quantity",           # Column E: CTNS (quantity)
            6: "cbm",               # Column G: CBM  
            7: "supply_tracking"     # Column H: SUPPLIERS TRACKING NO
        }
        
        # Check if we have required columns by position
        missing_columns = []
        for col_idx, field_name in expected_columns.items():
            if col_idx >= len(df.columns):
                missing_columns.append(f"Column {chr(65 + col_idx)} ({field_name})")
        
        if missing_columns:
            errors.append(f"Missing required columns: {', '.join(missing_columns)}")
            
        if errors:
            raise serializers.ValidationError({"excel_errors": errors})

        valid_rows = []
        row_errors = []
        
        for index, row in df.iterrows():
            row_data = {}
            row_error_list = []
            
            try:
                # Column A: Shipping Mark (Required)
                shipping_mark = str(row.iloc[0] if len(row) > 0 else "").strip()
                if not shipping_mark or shipping_mark.lower() in ["nan", "none", ""]:
                    row_error_list.append(f"Row {index + 2}: Shipping Mark (Column A) is required")
                else:
                    row_data["shipping_mark"] = shipping_mark[:20]
                
                # Column B: Date of Receipt (Required)
                try:
                    date_receipt = self.parse_date(row.iloc[1] if len(row) > 1 else None, index, "Date of Receipt")
                    if date_receipt is None:
                        row_error_list.append(f"Row {index + 2}: Date of Receipt (Column B) is required")
                    else:
                        row_data["date_receipt"] = date_receipt
                except serializers.ValidationError as e:
                    row_error_list.extend(e.detail)
                
                # Column C: Date of Loading (Optional)
                try:
                    date_loading = self.parse_date(row.iloc[2] if len(row) > 2 else None, index, "Date of Loading")
                    if date_loading:
                        row_data["date_loading"] = date_loading
                except serializers.ValidationError as e:
                    row_error_list.extend(e.detail)
                
                # Column D: Description (Required)
                description = str(row.iloc[3] if len(row) > 3 else "").strip()
                if not description or description.lower() in ["nan", "none", ""]:
                    row_error_list.append(f"Row {index + 2}: Description (Column D) is required")
                else:
                    row_data["description"] = description
                
                # Column E: CTNS/Quantity (Required)
                try:
                    qty_value = row.iloc[4] if len(row) > 4 else None
                    if pd.isna(qty_value) or qty_value in (None, "", "nan"):
                        row_error_list.append(f"Row {index + 2}: Quantity/CTNS (Column E) is required")
                    else:
                        qty = int(float(qty_value))
                        if qty <= 0:
                            row_error_list.append(f"Row {index + 2}: Quantity/CTNS must be greater than 0")
                        elif qty > MAX_QUANTITY_LIMIT:
                            row_error_list.append(f"Row {index + 2}: Quantity/CTNS too large (max {MAX_QUANTITY_LIMIT})")
                        else:
                            row_data["quantity"] = qty
                except (ValueError, TypeError):
                    row_error_list.append(f"Row {index + 2}: Invalid Quantity/CTNS format in Column E")
                
                # Column G: CBM (Required for Ghana/Sea cargo)
                try:
                    cbm_value = row.iloc[6] if len(row) > 6 else None
                    if pd.isna(cbm_value) or cbm_value in (None, "", "nan"):
                        if warehouse_type == "ghana":  # CBM required for Ghana warehouse
                            row_error_list.append(f"Row {index + 2}: CBM (Column G) is required for Ghana warehouse")
                    else:
                        cbm = Decimal(str(cbm_value))
                        if cbm <= 0:
                            row_error_list.append(f"Row {index + 2}: CBM must be greater than 0")
                        elif cbm > MAX_CBM_LIMIT:
                            row_error_list.append(f"Row {index + 2}: CBM too large (max {MAX_CBM_LIMIT})")
                        else:
                            row_data["cbm"] = cbm
                except (ValueError, TypeError, InvalidOperation):
                    row_error_list.append(f"Row {index + 2}: Invalid CBM format in Column G")
                
                # Column H: Suppliers Tracking No (Required)
                supply_tracking = str(row.iloc[7] if len(row) > 7 else "").strip()
                if not supply_tracking or supply_tracking.lower() in ["nan", "none", ""]:
                    row_error_list.append(f"Row {index + 2}: Suppliers Tracking No (Column H) is required")
                else:
                    row_data["supply_tracking"] = supply_tracking[:50]
                
                # Set default status
                row_data["status"] = "PENDING" if warehouse_type == "china" else "READY_FOR_DELIVERY"
                
                # Set method of shipping based on warehouse and CBM
                if warehouse_type == "ghana":
                    # For Ghana: if CBM is provided, it's likely sea cargo
                    row_data["method_of_shipping"] = "SEA" if row_data.get("cbm") else "AIR"
                else:
                    # For China: default to SEA, but this can be overridden
                    row_data["method_of_shipping"] = "SEA"
                
                # Only add to valid rows if no errors
                if not row_error_list:
                    valid_rows.append(row_data)
                else:
                    row_errors.extend(row_error_list)
                    
            except Exception as e:
                row_errors.append(f"Row {index + 2}: Unexpected error - {str(e)}")

        if errors or row_errors:
            raise serializers.ValidationError({"excel_errors": errors + row_errors})
            
        return valid_rows

    def process_excel_file(self):
        file = self.validated_data["file"]
        warehouse_type = self.validated_data["warehouse"]
        
        try:
            # Read Excel file
            df = pd.read_excel(io.BytesIO(file.read()))
            
            # Skip header row if it exists (check if first row contains text headers)
            if len(df) > 0:
                first_row = df.iloc[0]
                # If first row contains header-like text, skip it
                if any(isinstance(val, str) and any(header_word in str(val).upper() 
                      for header_word in ['SHIPPING', 'DATE', 'DESCRIPTION', 'CTNS', 'CBM', 'TRACKING']) 
                      for val in first_row):
                    df = df.iloc[1:].reset_index(drop=True)
            
            # Remove completely empty rows
            df = df.dropna(how='all').reset_index(drop=True)
            
            if len(df) == 0:
                raise serializers.ValidationError({"excel_errors": ["No data found in Excel file"]})
            
            valid_rows = self.validate_excel_data(df, warehouse_type)
            
            return {
                "warehouse_type": warehouse_type,
                "total_rows": len(df),
                "valid_rows": len(valid_rows),
                "data": valid_rows,
            }
            
        except Exception as e:
            if isinstance(e, serializers.ValidationError):
                raise
            raise serializers.ValidationError({"excel_errors": [f"Error processing Excel file: {str(e)}"]})


class BulkCreateResultSerializer(serializers.Serializer):
    total_processed = serializers.IntegerField()
    successful_creates = serializers.IntegerField()
    failed_creates = serializers.IntegerField()
    errors = serializers.ListField(child=serializers.CharField(), required=False)
    created_items = serializers.ListField(child=serializers.CharField(), required=False)


class ExcelUploadResultSerializer(serializers.Serializer):
    success = serializers.BooleanField()
    message = serializers.CharField()
    created_count = serializers.IntegerField(default=0)
    error_count = serializers.IntegerField(default=0)
    errors = serializers.ListField(child=serializers.DictField(), default=list)
    created_items = serializers.ListField(child=serializers.DictField(), default=list)
