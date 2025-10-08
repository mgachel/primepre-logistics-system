from rest_framework import serializers
from .models import GoodsReceivedChina, GoodsReceivedGhana, GoodsReceivedContainer, GoodsReceivedItem
from users.models import CustomerUser
import pandas as pd
import io
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import uuid

# Config
CHINA_DEFAULT_LOCATION = "GUANGZHOU"
GHANA_DEFAULT_LOCATION = "ACCRA"
MAX_FILE_SIZE_MB = 10
MAX_CBM_LIMIT = 10000  # Increased temporarily for debugging
MAX_WEIGHT_LIMIT = 50000
MAX_QUANTITY_LIMIT = 100000
MAX_VALUE_LIMIT = 1000000
MAX_SHIPPING_MARK_LENGTH = 100


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
            "length", "breadth", "height", "cbm", "weight", "quantity", 
            "description", "location", "status", "method_of_shipping", 
            "date_loading", "date_received", "created_at", "updated_at",
            "days_in_warehouse", "is_ready_for_delivery", "is_flagged",
        ]
        read_only_fields = ["date_received", "created_at", "updated_at"]
        extra_kwargs = {
            'customer': {'required': False, 'allow_null': True},
            'shipping_mark': {'required': False, 'allow_null': True, 'allow_blank': True},
            'length': {'required': False, 'allow_null': True},
            'breadth': {'required': False, 'allow_null': True},
            'height': {'required': False, 'allow_null': True},
            'cbm': {'required': False, 'allow_null': True}
        }

    def validate(self, data):
        """Override to make CBM conditional based on shipping method and validate dimensions."""
        # Call parent validation first
        data = super().validate(data)
        
        method_of_shipping = data.get("method_of_shipping")
        cbm = data.get("cbm")
        length = data.get("length")
        breadth = data.get("breadth")
        height = data.get("height")
        
        # For sea cargo, either provide dimensions OR CBM directly
        if method_of_shipping == "SEA":
            has_dimensions = all([length, breadth, height])
            has_cbm = cbm is not None
            
            if not has_dimensions and not has_cbm:
                raise serializers.ValidationError({
                    "cbm": "For sea cargo, either provide dimensions (length, breadth, height) for auto-calculation or enter CBM directly."
                })
            
            # If dimensions are provided, validate them
            if has_dimensions:
                for dim_name, dim_value in [("length", length), ("breadth", breadth), ("height", height)]:
                    if dim_value <= 0:
                        raise serializers.ValidationError({
                            dim_name: f"{dim_name.capitalize()} must be greater than 0."
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
        """Validate Excel data according to specific column structure."""
        if warehouse_type == "china":
            return self._process_china_rows(df)
        return self._process_ghana_rows(df)

    def _process_china_rows(self, df):
        """Leniently process China warehouse rows (columns A-F)."""
        valid_rows = []

        for index, row in df.iterrows():
            shipping_mark_raw = row.iloc[0] if len(row) > 0 else None
            shipping_mark = str(shipping_mark_raw).strip() if shipping_mark_raw is not None else ""
            if not shipping_mark or shipping_mark.lower() in ["nan", "none", ""]:
                shipping_mark = "UNKNOWN"

            date_value = row.iloc[1] if len(row) > 1 else None
            try:
                date_receipt = self.parse_date(date_value, index, "Date of Receipt")
            except serializers.ValidationError:
                date_receipt = None

            if date_receipt is None:
                from django.utils import timezone
                date_receipt = timezone.now().date()

            description_raw = row.iloc[2] if len(row) > 2 else None
            description = str(description_raw).strip() if description_raw is not None else ""
            if not description or description.lower() in ["nan", "none", ""]:
                description = "No description"

            quantity_value = row.iloc[3] if len(row) > 3 else None
            quantity = self._coerce_int(quantity_value, default=1)
            if quantity <= 0:
                quantity = 1
            elif quantity > MAX_QUANTITY_LIMIT:
                quantity = MAX_QUANTITY_LIMIT

            cbm_value = row.iloc[4] if len(row) > 4 else None
            cbm = self._coerce_decimal(cbm_value, default=Decimal("0"))
            if cbm < 0:
                cbm = Decimal("0")
            elif cbm > MAX_CBM_LIMIT:
                cbm = Decimal(str(MAX_CBM_LIMIT))

            tracking_raw = row.iloc[5] if len(row) > 5 else None
            tracking_value = str(tracking_raw).strip() if tracking_raw is not None else ""
            if not tracking_value or tracking_value.lower() in ["nan", "none", ""]:
                tracking_value = f"UNTRACKED-{uuid.uuid4().hex[:10].upper()}"

            valid_rows.append({
                "shipping_mark": shipping_mark[:MAX_SHIPPING_MARK_LENGTH],
                "date_receipt": date_receipt,
                "description": description,
                "quantity": quantity,
                "cbm": cbm,
                "supply_tracking": tracking_value[:50],
                "status": "PENDING",
                "method_of_shipping": "SEA"
            })

        return valid_rows

    def _process_ghana_rows(self, df):
        """Validate Ghana warehouse rows with stricter requirements."""
        errors = []
        row_errors = []

        # Expected columns using Excel notation A-H (0-indexed positions)
        expected_columns = {
            0: "shipping_mark",
            1: "date_receipt",
            2: "date_loading",
            3: "description",
            4: "quantity",
            6: "cbm",
            7: "supply_tracking",
        }

        required_column_count = max(expected_columns.keys()) + 1
        if len(df.columns) < required_column_count:
            errors.append(
                f"Excel file must have at least {required_column_count} columns. Found {len(df.columns)} columns."
            )

        missing_columns = []
        for col_idx, field_name in expected_columns.items():
            if col_idx >= len(df.columns):
                missing_columns.append(f"Column {chr(65 + col_idx)} ({field_name})")

        if missing_columns:
            errors.append(f"Missing required columns: {', '.join(missing_columns)}")

        if errors:
            raise serializers.ValidationError({"excel_errors": errors})

        valid_rows = []

        for index, row in df.iterrows():
            row_data = {}
            row_error_list = []

            try:
                shipping_mark = str(row.iloc[0] if len(row) > 0 else "").strip()
                if not shipping_mark or shipping_mark.lower() in ["nan", "none", ""]:
                    row_error_list.append(f"Row {index + 2}: Shipping Mark (Column A) is required")
                else:
                    row_data["shipping_mark"] = shipping_mark[:MAX_SHIPPING_MARK_LENGTH]

                try:
                    date_receipt = self.parse_date(row.iloc[1] if len(row) > 1 else None, index, "Date of Receipt")
                    if date_receipt is None:
                        row_error_list.append(f"Row {index + 2}: Date of Receipt (Column B) is required")
                    else:
                        row_data["date_receipt"] = date_receipt
                except serializers.ValidationError as exc:
                    detail = exc.detail if isinstance(exc.detail, list) else [str(exc.detail)]
                    row_error_list.extend(detail)

                try:
                    date_loading = self.parse_date(row.iloc[2] if len(row) > 2 else None, index, "Date of Loading")
                    if date_loading:
                        row_data["date_loading"] = date_loading
                except serializers.ValidationError as exc:
                    detail = exc.detail if isinstance(exc.detail, list) else [str(exc.detail)]
                    row_error_list.extend(detail)

                description = str(row.iloc[3] if len(row) > 3 else "").strip()
                if not description or description.lower() in ["nan", "none", ""]:
                    row_error_list.append(f"Row {index + 2}: Description (Column D) is required")
                else:
                    row_data["description"] = description

                quantity = self._coerce_int(row.iloc[4] if len(row) > 4 else None)
                if quantity is None:
                    row_error_list.append(f"Row {index + 2}: Quantity (Column E) is required")
                elif quantity <= 0:
                    row_error_list.append(f"Row {index + 2}: Quantity must be greater than 0")
                elif quantity > MAX_QUANTITY_LIMIT:
                    row_error_list.append(f"Row {index + 2}: Quantity too large (max {MAX_QUANTITY_LIMIT})")
                else:
                    row_data["quantity"] = quantity

                cbm = self._coerce_decimal(row.iloc[6] if len(row) > 6 else None)
                if cbm is None:
                    row_error_list.append(f"Row {index + 2}: CBM (Column G) is required for Ghana warehouse")
                elif cbm <= 0:
                    row_error_list.append(f"Row {index + 2}: CBM must be greater than 0")
                elif cbm > MAX_CBM_LIMIT:
                    row_error_list.append(f"Row {index + 2}: CBM too large (max {MAX_CBM_LIMIT})")
                else:
                    row_data["cbm"] = cbm

                supply_tracking = str(row.iloc[7] if len(row) > 7 else "").strip()
                if not supply_tracking or supply_tracking.lower() in ["nan", "none", ""]:
                    row_error_list.append(f"Row {index + 2}: Suppliers Tracking No (Column H) is required")
                else:
                    row_data["supply_tracking"] = supply_tracking[:50]

                row_data["status"] = "READY_FOR_DELIVERY"
                row_data["method_of_shipping"] = "SEA" if row_data.get("cbm") else "AIR"

                if not row_error_list:
                    valid_rows.append(row_data)
                else:
                    row_errors.extend(row_error_list)

            except Exception as exc:
                row_errors.append(f"Row {index + 2}: Unexpected error - {str(exc)}")

        if row_errors:
            raise serializers.ValidationError({"excel_errors": row_errors})

        return valid_rows

    def _coerce_int(self, value, default=None):
        if pd.isna(value) or value in (None, "", "nan"):
            return default
        try:
            return int(float(str(value).strip()))
        except (ValueError, TypeError):
            return default

    def _coerce_decimal(self, value, default=None):
        def normalize(val):
            if val is None:
                return None
            if pd.isna(val) or val in ("", "nan"):
                return None
            if not isinstance(val, Decimal):
                val = Decimal(str(val).strip())
            return val.quantize(Decimal("0.00001"), rounding=ROUND_HALF_UP)

        if pd.isna(value) or value in (None, "", "nan"):
            return normalize(default)
        try:
            return normalize(value)
        except (InvalidOperation, ValueError, TypeError):
            return normalize(default)

    def process_excel_file(self):
        file = self.validated_data["file"]
        warehouse_type = self.validated_data["warehouse"]
        
        try:
            # Read Excel file without assuming headers
            df = pd.read_excel(io.BytesIO(file.read()), header=None)

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


# ==========================================
# NEW CONTAINER-BASED SERIALIZERS
# ==========================================

class GoodsReceivedItemSerializer(serializers.ModelSerializer):
    """Serializer for individual goods received items within containers."""
    
    days_in_warehouse = serializers.SerializerMethodField()
    is_flagged = serializers.SerializerMethodField()
    customer_name = serializers.CharField(source='customer.username', read_only=True)
    
    class Meta:
        model = GoodsReceivedItem
        fields = [
            'id', 'container', 'customer', 'customer_name', 'shipping_mark', 
            'supply_tracking', 'description', 'quantity', 'weight', 'cbm',
            'length', 'breadth', 'height', 'estimated_value', 'supplier_name',
            'location', 'status', 'date_received', 'delivery_date', 'notes',
            'days_in_warehouse', 'is_flagged', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'date_received', 'created_at', 'updated_at', 'days_in_warehouse', 'is_flagged']
    
    def get_days_in_warehouse(self, obj):
        return obj.days_in_warehouse
    
    def get_is_flagged(self, obj):
        return obj.is_flagged
    
    def validate_weight(self, value):
        if value and value > MAX_WEIGHT_LIMIT:
            raise serializers.ValidationError(f"Weight too large (max {MAX_WEIGHT_LIMIT} kg).")
        return value
    
    def validate_cbm(self, value):
        if value is not None and value > MAX_CBM_LIMIT:
            raise serializers.ValidationError(f"CBM too large (max {MAX_CBM_LIMIT}).")
        return value
    
    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be positive.")
        if value > MAX_QUANTITY_LIMIT:
            raise serializers.ValidationError(f"Quantity too large (max {MAX_QUANTITY_LIMIT}).")
        return value


class GoodsReceivedContainerSerializer(serializers.ModelSerializer):
    """Serializer for goods received containers."""
    
    goods_items = serializers.SerializerMethodField()
    items_by_shipping_mark = serializers.SerializerMethodField()
    
    class Meta:
        model = GoodsReceivedContainer
        fields = [
            'container_id', 'container_type', 'location', 'arrival_date',
            'expected_delivery_date', 'actual_delivery_date', 'total_weight',
            'total_cbm', 'total_items_count', 'selected_rate_id', 'rates', 'dollar_rate', 'status', 'notes', 
            'created_at', 'updated_at', 'goods_items', 'items_by_shipping_mark'
        ]
        read_only_fields = ['container_id', 'total_weight', 'total_cbm', 'total_items_count', 'created_at', 'updated_at']
    
    def get_goods_items(self, obj):
        """Get goods items, filtered by search query if present in context."""
        items = obj.goods_items.all()
        
        # If search query is present in context, filter items
        search_query = self.context.get('search_query', None)
        if search_query:
            from django.db.models import Q
            items = items.filter(
                Q(shipping_mark__icontains=search_query) |
                Q(supply_tracking__icontains=search_query) |
                Q(description__icontains=search_query) |
                Q(customer_name__icontains=search_query)
            )
        
        return GoodsReceivedItemSerializer(items, many=True).data
    
    def get_items_by_shipping_mark(self, obj):
        """Group items by shipping mark for organized display."""
        items = obj.goods_items.all()
        
        # If search query is present in context, filter items
        search_query = self.context.get('search_query', None)
        if search_query:
            from django.db.models import Q
            items = items.filter(
                Q(shipping_mark__icontains=search_query) |
                Q(supply_tracking__icontains=search_query) |
                Q(description__icontains=search_query) |
                Q(customer_name__icontains=search_query)
            )
        
        grouped = {}
        
        for item in items:
            mark = item.shipping_mark or "Unknown"
            if mark not in grouped:
                grouped[mark] = []
            grouped[mark].append(GoodsReceivedItemSerializer(item).data)
        
        return grouped


class CreateGoodsReceivedContainerSerializer(serializers.ModelSerializer):
    """Serializer for creating new goods received containers."""
    
    class Meta:
        model = GoodsReceivedContainer
        fields = [
            'container_id', 'container_type', 'location', 'arrival_date', 
            'expected_delivery_date', 'selected_rate_id', 'rates', 'dollar_rate', 'notes', 'status'
        ]
    
    def validate(self, data):
        # Ensure required fields are present
        if 'container_type' not in data:
            raise serializers.ValidationError("Container type is required.")
        if 'location' not in data:
            raise serializers.ValidationError("Location is required.")
        if 'arrival_date' not in data:
            raise serializers.ValidationError("Arrival date is required.")
        
        return data


class UpdateGoodsReceivedContainerSerializer(serializers.ModelSerializer):
    """Serializer for updating existing goods received containers (allows partial updates)."""
    
    class Meta:
        model = GoodsReceivedContainer
        fields = [
            'container_id', 'container_type', 'location', 'arrival_date', 
            'expected_delivery_date', 'selected_rate_id', 'rates', 'dollar_rate', 'notes', 'status'
        ]
        extra_kwargs = {
            'container_id': {'required': False},
            'container_type': {'required': False},
            'location': {'required': False},
            'arrival_date': {'required': False},
            'expected_delivery_date': {'required': False},
            'selected_rate_id': {'required': False},
            'dollar_rate': {'required': False},
            'notes': {'required': False},
            'status': {'required': False},
        }
    
    def validate(self, data):
        # No validation for updates - allow partial updates
        return data


class CreateGoodsReceivedItemSerializer(serializers.ModelSerializer):
    """Serializer for creating individual goods received items."""
    
    class Meta:
        model = GoodsReceivedItem
        fields = [
            'container', 'customer', 'shipping_mark', 'supply_tracking',
            'description', 'quantity', 'weight', 'cbm', 'length', 'breadth', 
            'height', 'estimated_value', 'supplier_name', 'location', 'notes'
        ]
        extra_kwargs = {
            'customer': {'required': False, 'allow_null': True},
            'length': {'required': False, 'allow_null': True},
            'breadth': {'required': False, 'allow_null': True},
            'height': {'required': False, 'allow_null': True},
            'cbm': {'required': False, 'allow_null': True},
        }
    
    def validate(self, data):
        """Validate that for sea cargo, either dimensions OR CBM is provided."""
        container = data.get('container')
        
        # If container is provided and it's a sea container
        if container and container.container_type == 'sea':
            length = data.get('length')
            breadth = data.get('breadth')
            height = data.get('height')
            cbm = data.get('cbm')
            
            has_dimensions = all([length, breadth, height])
            has_cbm = cbm is not None and cbm > 0
            
            if not has_dimensions and not has_cbm:
                raise serializers.ValidationError({
                    "cbm": "For sea cargo, either provide dimensions (length, breadth, height) for auto-calculation or enter CBM directly."
                })
            
            # If dimensions are provided, validate them
            if has_dimensions:
                for dim_name, dim_value in [("length", length), ("breadth", breadth), ("height", height)]:
                    if dim_value <= 0:
                        raise serializers.ValidationError({
                            dim_name: f"{dim_name.capitalize()} must be greater than 0."
                        })
        
        return data
    
    def create(self, validated_data):
        print(f"DEBUG: Creating goods received item with data: {validated_data}")
        return super().create(validated_data)
    
    def validate_weight(self, value):
        if value and value > MAX_WEIGHT_LIMIT:
            raise serializers.ValidationError(f"Weight too large (max {MAX_WEIGHT_LIMIT} kg).")
        return value
    
    def validate_cbm(self, value):
        if value is not None and value > MAX_CBM_LIMIT:
            raise serializers.ValidationError(f"CBM too large (max {MAX_CBM_LIMIT}).")
        return value
    
    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be positive.")
        if value > MAX_QUANTITY_LIMIT:
            raise serializers.ValidationError(f"Quantity too large (max {MAX_QUANTITY_LIMIT}).")
        return value


class GoodsReceivedContainerStatsSerializer(serializers.Serializer):
    """Serializer for goods received container statistics."""
    
    total_containers = serializers.IntegerField()
    pending_containers = serializers.IntegerField()
    processing_containers = serializers.IntegerField()
    ready_for_delivery = serializers.IntegerField()
    delivered_containers = serializers.IntegerField()
    flagged_containers = serializers.IntegerField()
    
    total_items = serializers.IntegerField()
    total_weight = serializers.FloatField()
    total_cbm = serializers.FloatField()
    
    # Air vs Sea breakdown
    air_containers = serializers.IntegerField()
    sea_containers = serializers.IntegerField()
