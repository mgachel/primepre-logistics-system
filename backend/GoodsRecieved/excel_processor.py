"""
Robust Excel processing utility for handling messy Excel files.
This module provides functions to extract specific columns from Excel files
that may have merged cells, blank rows, or inconsistent formatting.
"""

import pandas as pd
import io
import logging
from typing import List, Dict, Any, Optional, Union, Tuple
from decimal import Decimal, InvalidOperation
import re

logger = logging.getLogger(__name__)


def extract_target_columns(
    file_path_or_buffer: Union[str, io.BytesIO], 
    target_columns: List[str],
    max_header_search_rows: int = 20,
    min_column_match_threshold: float = 0.5,
    clean_data: bool = True
) -> List[Dict[str, Any]]:
    """
    Extract specific columns from a messy Excel file by automatically detecting the header row.
    
    Args:
        file_path_or_buffer: Path to Excel file or BytesIO buffer
        target_columns: List of column names to look for (case-insensitive)
        max_header_search_rows: Maximum number of rows to search for headers (default: 20)
        min_column_match_threshold: Minimum percentage of target columns that must match (default: 0.5)
        clean_data: Whether to clean the data after extraction (default: True)
    
    Returns:
        List of dictionaries containing the extracted data, or empty list if no match found
    """
    try:
        # Read Excel file - try multiple sheets
        if isinstance(file_path_or_buffer, str):
            excel_file = pd.ExcelFile(file_path_or_buffer)
        else:
            excel_file = pd.ExcelFile(file_path_or_buffer)
        
        best_match_data = []
        best_match_score = 0
        best_sheet_name = ""
        
        # Try each sheet
        for sheet_name in excel_file.sheet_names:
            logger.info(f"Processing sheet: {sheet_name}")
            
            # Read the sheet without assuming headers
            df_raw = pd.read_excel(
                excel_file, 
                sheet_name=sheet_name, 
                header=None,
                nrows=max_header_search_rows + 50  # Read extra rows for data
            )
            
            # Clean up completely empty rows and columns first
            df_raw = _clean_empty_rows_columns(df_raw)
            
            if df_raw.empty:
                logger.warning(f"Sheet {sheet_name} is empty after cleaning")
                continue
            
            # Search for header row in the first max_header_search_rows rows
            header_row_idx, matched_columns = _find_header_row(
                df_raw, 
                target_columns, 
                max_header_search_rows,
                min_column_match_threshold
            )
            
            if header_row_idx is not None:
                match_score = len(matched_columns) / len(target_columns)
                logger.info(f"Sheet {sheet_name}: Found header at row {header_row_idx + 1} with {len(matched_columns)} matches (score: {match_score:.2f})")
                
                if match_score > best_match_score:
                    # Extract data from this sheet
                    extracted_data = _extract_data_from_sheet(
                        df_raw, 
                        header_row_idx, 
                        matched_columns,
                        clean_data
                    )
                    
                    if extracted_data:
                        best_match_data = extracted_data
                        best_match_score = match_score
                        best_sheet_name = sheet_name
        
        if best_match_data:
            logger.info(f"Best match found in sheet '{best_sheet_name}' with {len(best_match_data)} records")
            return best_match_data
        else:
            logger.warning("No suitable header row found in any sheet")
            return []
            
    except Exception as e:
        logger.error(f"Error processing Excel file: {str(e)}")
        return []


def _clean_empty_rows_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Remove completely empty rows and columns from DataFrame.
    """
    # Remove rows that are completely NaN
    df = df.dropna(how='all')
    
    # Remove columns that are completely NaN
    df = df.dropna(axis=1, how='all')
    
    # Reset index
    df = df.reset_index(drop=True)
    
    return df


def _normalize_column_name(column_name: str) -> str:
    """
    Normalize column name for comparison - remove extra spaces, convert to lowercase, etc.
    """
    if pd.isna(column_name):
        return ""
    
    # Convert to string and normalize
    normalized = str(column_name).strip().lower()
    
    # Remove extra whitespace and special characters
    normalized = re.sub(r'\s+', ' ', normalized)
    normalized = re.sub(r'[^\w\s&/()-]', '', normalized)
    
    return normalized


def _find_header_row(
    df: pd.DataFrame, 
    target_columns: List[str], 
    max_search_rows: int,
    min_threshold: float
) -> Tuple[Optional[int], Dict[str, str]]:
    """
    Find the row that best matches the target column names.
    
    Returns:
        Tuple of (header_row_index, {target_column: actual_column_name})
    """
    normalized_targets = [_normalize_column_name(col) for col in target_columns]
    best_row_idx = None
    best_matches = {}
    best_score = 0
    
    search_rows = min(max_search_rows, len(df))
    
    for row_idx in range(search_rows):
        row = df.iloc[row_idx]
        
        # Normalize all values in this row
        normalized_row = [_normalize_column_name(cell) for cell in row]
        
        # Find matches
        matches = {}
        for target_norm, target_orig in zip(normalized_targets, target_columns):
            if not target_norm:
                continue
                
            for col_idx, cell_norm in enumerate(normalized_row):
                if cell_norm and target_norm in cell_norm:
                    matches[target_orig] = df.columns[col_idx] if hasattr(df.columns, '__getitem__') else col_idx
                    break
        
        match_score = len(matches) / len(target_columns)
        
        if match_score >= min_threshold and match_score > best_score:
            best_score = match_score
            best_row_idx = row_idx
            best_matches = matches
    
    return best_row_idx, best_matches


def _extract_data_from_sheet(
    df: pd.DataFrame, 
    header_row_idx: int, 
    column_mapping: Dict[str, str],
    clean_data: bool
) -> List[Dict[str, Any]]:
    """
    Extract data from the sheet starting from the row after the header.
    """
    # Set the header row
    header_row = df.iloc[header_row_idx]
    
    # Get data starting from the row after header
    data_df = df.iloc[header_row_idx + 1:].copy()
    
    if data_df.empty:
        return []
    
    # Set column names from header row
    data_df.columns = header_row
    
    # Clean empty rows
    data_df = data_df.dropna(how='all')
    
    if data_df.empty:
        return []
    
    # Extract only the columns we care about
    extracted_records = []
    
    for _, row in data_df.iterrows():
        record = {}
        has_data = False
        
        for target_col, actual_col in column_mapping.items():
            try:
                value = row[actual_col] if actual_col in row.index else None
                
                if pd.notna(value) and str(value).strip() != '':
                    if clean_data:
                        # Clean the value
                        cleaned_value = _clean_cell_value(value, target_col)
                        if cleaned_value is not None:
                            record[target_col] = cleaned_value
                            has_data = True
                    else:
                        record[target_col] = value
                        has_data = True
                        
            except Exception as e:
                logger.warning(f"Error extracting column {target_col}: {e}")
                continue
        
        # Only add record if it has at least one non-empty value
        if has_data:
            extracted_records.append(record)
    
    return extracted_records


def _clean_cell_value(value: Any, column_type: str) -> Any:
    """
    Clean and validate cell values based on expected column type.
    """
    if pd.isna(value):
        return None
    
    # Convert to string first for cleaning
    str_value = str(value).strip()
    
    if not str_value or str_value.lower() in ['nan', 'none', 'null', '']:
        return None
    
    # Column-specific cleaning
    column_lower = column_type.lower()
    
    if any(keyword in column_lower for keyword in ['cbm', 'volume', 'cubic']):
        try:
            return float(str_value.replace(',', ''))
        except ValueError:
            return None
    
    elif any(keyword in column_lower for keyword in ['quantity', 'ctns', 'count', 'qty']):
        try:
            return int(float(str_value.replace(',', '')))
        except ValueError:
            return None
    
    elif any(keyword in column_lower for keyword in ['weight', 'kg', 'weight_kg']):
        try:
            return float(str_value.replace(',', ''))
        except ValueError:
            return None
    
    elif any(keyword in column_lower for keyword in ['value', 'price', 'cost', 'amount']):
        try:
            # Remove currency symbols
            cleaned = re.sub(r'[^\d.,]', '', str_value)
            return float(cleaned.replace(',', ''))
        except ValueError:
            return None
    
    else:
        # String values - just return cleaned string
        return str_value


# Pre-defined column mappings for different warehouse types
CHINA_WAREHOUSE_COLUMNS = [
    'shipping_mark',
    'supply_tracking', 
    'cbm',
    'quantity',
    'description',
    'date_loading',
    'weight',
    'estimated_value'
]

GHANA_WAREHOUSE_COLUMNS = [
    'shipping_mark',
    'supply_tracking',
    'cbm', 
    'quantity',
    'description',
    'date_loading',
    'weight',
    'estimated_value'
]

CARGO_COLUMNS = [
    'shipping_mark',
    'item_description',
    'quantity',
    'cbm',
    'weight',
    'unit_value',
    'total_value',
    'status'
]


def process_goods_received_excel(
    file_buffer: io.BytesIO, 
    warehouse_type: str
) -> Dict[str, Any]:
    """
    Process Excel file for GoodsReceived with warehouse-specific column mapping.
    
    Args:
        file_buffer: BytesIO buffer containing the Excel file
        warehouse_type: 'china' or 'ghana'
    
    Returns:
        Dictionary with processed data and metadata
    """
    target_columns = CHINA_WAREHOUSE_COLUMNS if warehouse_type == 'china' else GHANA_WAREHOUSE_COLUMNS
    
    extracted_data = extract_target_columns(
        file_buffer, 
        target_columns,
        max_header_search_rows=20,
        min_column_match_threshold=0.4  # Require at least 40% of columns to match
    )
    
    return {
        'warehouse_type': warehouse_type,
        'total_rows': len(extracted_data),
        'valid_rows': len(extracted_data),
        'data': extracted_data,
        'columns_found': list(extracted_data[0].keys()) if extracted_data else []
    }


def process_cargo_excel(file_buffer: io.BytesIO) -> Dict[str, Any]:
    """
    Process Excel file for Cargo items.
    
    Args:
        file_buffer: BytesIO buffer containing the Excel file
    
    Returns:
        Dictionary with processed data and metadata
    """
    extracted_data = extract_target_columns(
        file_buffer,
        CARGO_COLUMNS,
        max_header_search_rows=20,
        min_column_match_threshold=0.5  # Require at least 50% of columns to match
    )
    
    return {
        'total_rows': len(extracted_data),
        'valid_rows': len(extracted_data), 
        'data': extracted_data,
        'columns_found': list(extracted_data[0].keys()) if extracted_data else []
    }
