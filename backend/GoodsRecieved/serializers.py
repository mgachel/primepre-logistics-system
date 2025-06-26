from rest_framework import serializers
from .models import GoodsReceivedChina, GoodsReceivedGhana
import pandas as pd
import io
from decimal import Decimal, InvalidOperation
from datetime import datetime

# Configuration constants
CHINA_DEFAULT_LOCATION = 'GUANGZHOU'
GHANA_DEFAULT_LOCATION = 'ACCRA'
MAX_FILE_SIZE_MB = 10
MAX_CBM_LIMIT = 1000
MAX_WEIGHT_LIMIT = 50000  # 50 tons
MAX_QUANTITY_LIMIT = 100000
MAX_VALUE_LIMIT = 1000000  # 1 million USD


class GoodsReceivedChinaSerializer(serializers.ModelSerializer):
    """
    Serializer for GoodsReceivedChina model with validation and business logic.
    """
    days_in_warehouse = serializers.ReadOnlyField()
    is_ready_for_shipping = serializers.ReadOnlyField()
    is_flagged = serializers.ReadOnlyField()
    
    class Meta:
        model = GoodsReceivedChina
        fields = [
            'id', 'item_id', 'shipping_mark', 'supply_tracking',
            'cbm', 'weight', 'quantity', 'description', 'location',
            'status', 'supplier_name', 'estimated_value', 'notes',
            'date_received', 'created_at', 'updated_at',
            'days_in_warehouse', 'is_ready_for_shipping', 'is_flagged'
        ]
        read_only_fields = ['item_id', 'date_received', 'created_at', 'updated_at']
    
    def validate_cbm(self, value):
        """Validate CBM is within reasonable limits"""
        if value > 1000:  # 1000 cubic meters seems excessive for a single item
            raise serializers.ValidationError("CBM seems too large. Please verify.")
        return value
    
    def validate_weight(self, value):
        """Validate weight is within reasonable limits"""
        if value and value > 50000:  # 50 tons
            raise serializers.ValidationError("Weight seems too large. Please verify.")
        return value
    
    def validate_quantity(self, value):
        """Validate quantity is reasonable"""
        if value > 100000:  # 100k pieces
            raise serializers.ValidationError("Quantity seems too large. Please verify.")
        return value
    
    def validate_estimated_value(self, value):
        """Validate estimated value is reasonable"""
        if value and value > 1000000:  # 1 million USD
            raise serializers.ValidationError("Estimated value seems too high. Please verify.")
        return value


class GoodsReceivedGhanaSerializer(serializers.ModelSerializer):
    """
    Serializer for GoodsReceivedGhana model with validation and business logic.
    """
    days_in_warehouse = serializers.ReadOnlyField()
    is_ready_for_shipping = serializers.ReadOnlyField()
    is_flagged = serializers.ReadOnlyField()
    
    class Meta:
        model = GoodsReceivedGhana
        fields = [
            'id', 'item_id', 'shipping_mark', 'supply_tracking',
            'cbm', 'weight', 'quantity', 'description', 'location',
            'status', 'supplier_name', 'estimated_value', 'notes',
            'date_received', 'created_at', 'updated_at',
            'days_in_warehouse', 'is_ready_for_shipping', 'is_flagged'
        ]
        read_only_fields = ['item_id', 'date_received', 'created_at', 'updated_at']
    
    def validate_cbm(self, value):
        """Validate CBM is within reasonable limits"""
        if value > 1000:  # 1000 cubic meters seems excessive for a single item
            raise serializers.ValidationError("CBM seems too large. Please verify.")
        return value
    
    def validate_weight(self, value):
        """Validate weight is within reasonable limits"""
        if value and value > 50000:  # 50 tons
            raise serializers.ValidationError("Weight seems too large. Please verify.")
        return value
    
    def validate_quantity(self, value):
        """Validate quantity is reasonable"""
        if value > 100000:  # 100k pieces
            raise serializers.ValidationError("Quantity seems too large. Please verify.")
        return value
    
    def validate_estimated_value(self, value):
        """Validate estimated value is reasonable"""
        if value and value > 1000000:  # 1 million USD
            raise serializers.ValidationError("Estimated value seems too high. Please verify.")
        return value


class StatusUpdateSerializer(serializers.Serializer):
    """
    Serializer for status updates with optional reason.
    """
    status = serializers.ChoiceField(choices=GoodsReceivedChina.STATUS_CHOICES)
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True)
    
    def validate_status(self, value):
        """Validate status transition is allowed"""
        # Add business logic for valid status transitions if needed
        return value


class BulkStatusUpdateSerializer(serializers.Serializer):
    """
    Serializer for bulk status updates.
    """
    item_ids = serializers.ListField(
        child=serializers.CharField(max_length=50),
        min_length=1,
        max_length=100  # Limit bulk operations
    )
    status = serializers.ChoiceField(choices=GoodsReceivedChina.STATUS_CHOICES)
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True)


class GoodsSearchSerializer(serializers.Serializer):
    """
    Serializer for search parameters.
    """
    shipping_mark = serializers.CharField(max_length=20, required=False)
    supply_tracking = serializers.CharField(max_length=50, required=False)
    status = serializers.ChoiceField(
        choices=GoodsReceivedChina.STATUS_CHOICES, 
        required=False
    )
    location = serializers.CharField(max_length=20, required=False)
    date_from = serializers.DateTimeField(required=False)
    date_to = serializers.DateTimeField(required=False)
    supplier_name = serializers.CharField(max_length=100, required=False)


class GoodsStatsSerializer(serializers.Serializer):
    """
    Serializer for goods statistics.
    """
    total_items = serializers.IntegerField()
    pending_count = serializers.IntegerField()
    ready_for_shipping_count = serializers.IntegerField()
    flagged_count = serializers.IntegerField()
    shipped_count = serializers.IntegerField()
    cancelled_count = serializers.IntegerField()
    total_cbm = serializers.DecimalField(max_digits=15, decimal_places=3)
    total_weight = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_estimated_value = serializers.DecimalField(max_digits=15, decimal_places=2)
    average_days_in_warehouse = serializers.FloatField()


class ExcelUploadSerializer(serializers.Serializer):
    """
    Serializer for Excel file upload with validation.
    """
    file = serializers.FileField()
    warehouse = serializers.ChoiceField(choices=[('china', 'China'), ('ghana', 'Ghana')])
    
    def validate_file(self, value):
        """Validate that the uploaded file is an Excel file"""
        if not value.name.endswith(('.xlsx', '.xls', '.csv')):
            raise serializers.ValidationError("File must be an Excel file (.xlsx, .xls) or CSV file (.csv)")
        
        # Check file size (limit to configurable MB)
        if value.size > MAX_FILE_SIZE_MB * 1024 * 1024:
            raise serializers.ValidationError(f"File size must be less than {MAX_FILE_SIZE_MB}MB")
        
        return value
    
    def validate_excel_data(self, df, warehouse_type):
        """Validate the Excel data structure and content"""
        errors = []
        
        # Define expected column mappings for China warehouse
        china_column_mapping = {
            'SHIPPIN MARK/CLIENT': 'shipping_mark',
            'DATE OF RECEIPT': 'date_received',  # Optional
            'DATE OF LOADING': 'date_loading',   # Optional (can be null)
            'DESCRIPTION': 'description',        # Optional
            'CTNS': 'quantity',                  # Required
            'SPECIFICATIONS': 'specifications',   # Not used in model
            'CBM': 'cbm',                        # Required
            'SUPPLIER&TRACKING NO': 'supply_tracking'  # Required
        }
        
        # For Ghana, we'll use similar mapping but different expected columns if needed
        ghana_column_mapping = china_column_mapping.copy()
        
        column_mapping = china_column_mapping if warehouse_type == 'china' else ghana_column_mapping
        
        # Check if required columns exist (case-insensitive)
        df_columns_upper = [col.upper().strip() for col in df.columns]
        required_fields = ['shipping_mark', 'quantity', 'cbm', 'supply_tracking']
        
        # Map actual column names to our expected names
        actual_column_mapping = {}
        for expected_col, field_name in column_mapping.items():
            for actual_col in df.columns:
                if expected_col.upper().strip() == actual_col.upper().strip():
                    actual_column_mapping[field_name] = actual_col
                    break
        
        # Check for required columns
        missing_required = []
        for field in required_fields:
            if field not in actual_column_mapping:
                missing_required.append(field)
        
        if missing_required:
            errors.append(f"Missing required columns: {', '.join(missing_required)}")
        
        # Validate data in each row
        valid_rows = []
        row_errors = []
        
        for index, row in df.iterrows():
            row_data = {}
            row_error = []
            
            try:
                # Shipping Mark (Required)
                if 'shipping_mark' in actual_column_mapping:
                    shipping_mark = str(row[actual_column_mapping['shipping_mark']]).strip()
                    if not shipping_mark or shipping_mark.lower() == 'nan':
                        row_error.append(f"Row {index + 2}: Shipping mark is required")
                    else:
                        row_data['shipping_mark'] = shipping_mark[:20]  # Limit to 20 chars
                
                # Supply Tracking (Required)
                if 'supply_tracking' in actual_column_mapping:
                    supply_tracking = str(row[actual_column_mapping['supply_tracking']]).strip()
                    if not supply_tracking or supply_tracking.lower() == 'nan':
                        row_error.append(f"Row {index + 2}: Supply tracking is required")
                    else:
                        row_data['supply_tracking'] = supply_tracking[:50]  # Limit to 50 chars
                
                # CBM (Required)
                if 'cbm' in actual_column_mapping:
                    try:
                        cbm_value = row[actual_column_mapping['cbm']]
                        if pd.isna(cbm_value) or cbm_value == '':
                            row_error.append(f"Row {index + 2}: CBM is required")
                        else:
                            cbm = Decimal(str(cbm_value))
                            if cbm <= 0:
                                row_error.append(f"Row {index + 2}: CBM must be greater than 0")
                            elif cbm > 1000:
                                row_error.append(f"Row {index + 2}: CBM seems too large ({cbm})")
                            else:
                                row_data['cbm'] = cbm
                    except (ValueError, InvalidOperation):
                        row_error.append(f"Row {index + 2}: Invalid CBM value")
                
                # Quantity/CTNS (Required)
                if 'quantity' in actual_column_mapping:
                    try:
                        quantity_value = row[actual_column_mapping['quantity']]
                        if pd.isna(quantity_value) or quantity_value == '':
                            row_error.append(f"Row {index + 2}: Quantity is required")
                        else:
                            quantity = int(float(quantity_value))
                            if quantity <= 0:
                                row_error.append(f"Row {index + 2}: Quantity must be greater than 0")
                            else:
                                row_data['quantity'] = quantity
                    except (ValueError, TypeError):
                        row_error.append(f"Row {index + 2}: Invalid quantity value")
                
                # Description (Optional)
                if 'description' in actual_column_mapping:
                    description = str(row[actual_column_mapping['description']]).strip()
                    if description and description.lower() != 'nan':
                        row_data['description'] = description
                
                # Set default values for required fields not in Excel
                row_data['location'] = CHINA_DEFAULT_LOCATION if warehouse_type == 'china' else GHANA_DEFAULT_LOCATION
                row_data['status'] = 'PENDING'
                
                # Weight (Optional) - add weight processing if available
                if 'weight' in actual_column_mapping:
                    try:
                        weight_value = row[actual_column_mapping['weight']]
                        if not pd.isna(weight_value) and weight_value != '':
                            weight = Decimal(str(weight_value))
                            if weight > 0:
                                if weight > 50000:  # 50 tons limit
                                    row_error.append(f"Row {index + 2}: Weight seems too large ({weight} kg)")
                                else:
                                    row_data['weight'] = weight
                    except (ValueError, InvalidOperation):
                        row_error.append(f"Row {index + 2}: Invalid weight value")
                
                # Only add row if no errors
                if not row_error:
                    valid_rows.append(row_data)
                else:
                    row_errors.extend(row_error)
                    
            except Exception as e:
                row_errors.append(f"Row {index + 2}: Unexpected error - {str(e)}")
        
        if errors or row_errors:
            all_errors = errors + row_errors
            raise serializers.ValidationError({"excel_errors": all_errors})
        
        return valid_rows
    
    def process_excel_file(self):
        """Process the uploaded Excel file and return validated data"""
        file = self.validated_data['file']
        warehouse_type = self.validated_data['warehouse']
        
        try:
            # Read the Excel file
            if file.name.endswith('.csv'):
                df = pd.read_csv(io.BytesIO(file.read()))
            else:
                df = pd.read_excel(io.BytesIO(file.read()))
            
            # Validate and process the data
            valid_rows = self.validate_excel_data(df, warehouse_type)
            
            return {
                'warehouse_type': warehouse_type,
                'total_rows': len(df),
                'valid_rows': len(valid_rows),
                'data': valid_rows
            }
            
        except Exception as e:
            raise serializers.ValidationError(f"Error processing file: {str(e)}")


class BulkCreateResultSerializer(serializers.Serializer):
    """
    Serializer for bulk create operation results.
    """
    total_processed = serializers.IntegerField()
    successful_creates = serializers.IntegerField()
    failed_creates = serializers.IntegerField()
    errors = serializers.ListField(child=serializers.CharField(), required=False)
    created_items = serializers.ListField(child=serializers.CharField(), required=False)


class ExcelUploadResultSerializer(serializers.Serializer):
    """
    Serializer for Excel upload results.
    """
    success = serializers.BooleanField()
    message = serializers.CharField()
    created_count = serializers.IntegerField(default=0)
    error_count = serializers.IntegerField(default=0)
    errors = serializers.ListField(child=serializers.DictField(), default=list)
    created_items = serializers.ListField(child=serializers.DictField(), default=list)
