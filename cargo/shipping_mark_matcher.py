"""
Shipping mark matching service for Excel upload processing.
Handles matching imported shipping marks with existing CustomerUser records.
"""
from typing import List, Dict, Any, Optional, Tuple
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import Q
from .excel_utils import normalize_shipping_mark
import logging

logger = logging.getLogger(__name__)

CustomerUser = get_user_model()


class ShippingMarkMatcher:
    """Service for matching shipping marks from Excel with existing customers."""
    
    def __init__(self, container_id: str):
        self.container_id = container_id
        self.customer_cache = {}
        self._load_customers()
    
    def _load_customers(self):
        """Load and cache all customers with their normalized shipping marks."""
        customers = CustomerUser.objects.all()
        
        for customer in customers:
            if customer.shipping_mark:
                normalized_mark = normalize_shipping_mark(customer.shipping_mark)
                if normalized_mark:
                    self.customer_cache[normalized_mark] = customer
    
    def match_candidates(self, candidates: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Match shipping mark candidates with existing customers.
        
        Args:
            candidates: List of parsed Excel row candidates
            
        Returns:
            Dictionary with matched items, unmatched items, and statistics
        """
        matched_items = []
        unmatched_items = []
        duplicate_tracking_numbers = []

        for candidate in candidates:
            shipping_mark = candidate['shipping_mark_normalized']
            tracking_number = candidate['tracking_number']
            
            # NOTE: Duplicate tracking numbers are allowed. Previously we
            # rejected candidates that had duplicate tracking numbers in the
            # batch or already existed in the DB. The system now accepts
            # duplicate tracking numbers, so we do not reject here.
            # Try to match with existing customer
            customer = self.customer_cache.get(shipping_mark)
            
            if customer:
                # Previously we checked the DB for existing tracking IDs and
                # rejected matches when found. We now allow duplicate tracking
                # IDs, so skip that check and proceed to match the customer.
                
                matched_items.append({
                    'candidate': candidate,
                    'customer': {
                        'id': customer.id,
                        'shipping_mark': customer.shipping_mark,
                        'name': customer.get_full_name() or customer.phone,
                        'phone': customer.phone if hasattr(customer, 'phone') else '',
                        'email': customer.email
                    }
                })
            else:
                unmatched_items.append(candidate)
        
        return {
            'matched_items': matched_items,
            'unmatched_items': unmatched_items,
            'statistics': {
                'total_candidates': len(candidates),
                'matched_count': len(matched_items),
                'unmatched_count': len(unmatched_items),
                    'duplicate_count': len(duplicate_tracking_numbers)
            }
        }
    
    def suggest_similar_customers(self, shipping_mark: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Find customers with similar shipping marks using fuzzy matching.
        
        Args:
            shipping_mark: The normalized shipping mark to find matches for
            limit: Maximum number of suggestions to return
            
        Returns:
            List of customer suggestions with similarity scores
        """
        if not shipping_mark:
            return []
        
        suggestions = []
        
        # Exact substring matches
        for normalized_mark, customer in self.customer_cache.items():
            if shipping_mark in normalized_mark or normalized_mark in shipping_mark:
                suggestions.append({
                    'customer': {
                        'id': customer.id,
                        'shipping_mark': customer.shipping_mark,
                        'name': customer.get_full_name() or customer.phone,
                        'phone': customer.phone if hasattr(customer, 'phone') else '',
                        'email': customer.email
                    },
                    'similarity_type': 'substring',
                    'normalized_mark': normalized_mark
                })
        
        # If no substring matches, try partial word matches
        if not suggestions:
            mark_words = set(shipping_mark.split())
            for normalized_mark, customer in self.customer_cache.items():
                other_words = set(normalized_mark.split())
                common_words = mark_words.intersection(other_words)
                
                if common_words:
                    similarity_score = len(common_words) / max(len(mark_words), len(other_words))
                    if similarity_score >= 0.5:  # At least 50% word overlap
                        suggestions.append({
                            'customer': {
                                'id': customer.id,
                                'shipping_mark': customer.shipping_mark,
                                'name': customer.get_full_name() or customer.phone,
                                'phone': customer.phone if hasattr(customer, 'phone') else '',
                                'email': customer.email
                            },
                            'similarity_type': 'partial_words',
                            'similarity_score': similarity_score,
                            'normalized_mark': normalized_mark,
                            'common_words': list(common_words)
                        })
        
        # Sort by similarity and return top results
        suggestions.sort(key=lambda x: x.get('similarity_score', 1.0), reverse=True)
        return suggestions[:limit]
    
    def create_cargo_items(self, matched_items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Create CargoItem instances from matched items.
        
        Args:
            matched_items: List of matched item dictionaries
            
        Returns:
            Dictionary with created items and any errors
        """
        from .models import CargoItem, CargoContainer, ClientShipmentSummary
        from django.db import transaction
        
        created_items = []
        errors = []

        try:
            container = CargoContainer.objects.get(container_id=self.container_id)
        except CargoContainer.DoesNotExist:
            return {
                'created_items': [],
                'errors': [{'error': f'Container {self.container_id} not found'}]
            }

        for item_data in matched_items:
            candidate = (item_data or {}).get('candidate') or {}
            customer_payload = (item_data or {}).get('customer') or {}
            source_row = candidate.get('source_row_number')

            customer_id = customer_payload.get('id')
            if not customer_id:
                logger.warning(
                    "Skipping matched item for container %s due to missing customer data: %s",
                    self.container_id,
                    customer_payload,
                )
                errors.append({
                    'source_row_number': source_row,
                    'error': 'Missing customer information for matched item',
                    'candidate': candidate,
                })
                continue

            try:
                customer = CustomerUser.objects.get(id=customer_id)
            except CustomerUser.DoesNotExist:
                logger.warning(
                    "Customer %s referenced in matched items could not be found",
                    customer_id,
                )
                errors.append({
                    'source_row_number': source_row,
                    'error': f'Customer with id {customer_id} not found',
                    'candidate': candidate,
                })
                continue

            cbm_value = candidate.get('cbm')
            if cbm_value is not None:
                try:
                    cbm_value = float(cbm_value)
                except (TypeError, ValueError):
                    cbm_value = None

            try:
                with transaction.atomic():
                    cargo_item = CargoItem(
                        container=container,
                        client=customer,
                        tracking_id=candidate.get('tracking_number') or '',
                        item_description=candidate.get('description') or '',
                        quantity=candidate.get('quantity') or 0,
                        cbm=cbm_value
                    )

                    # Preserve the tracking_id provided in the candidate — do
                    # not overwrite or clear it. Uploads should exactly reflect
                    # what's in the Excel sheet.
                    cargo_item.save()

                    summary, _ = ClientShipmentSummary.objects.get_or_create(
                        container=container,
                        client=customer
                    )
                    summary.update_totals()

                created_items.append({
                    'cargo_item_id': str(cargo_item.id),
                    'tracking_id': cargo_item.tracking_id,
                    'source_row_number': source_row,
                    'customer_name': customer.get_full_name() or customer.phone
                })
            except IntegrityError as exc:
                logger.warning(
                    "Integrity error while creating cargo item for container %s row %s: %s",
                    self.container_id,
                    source_row,
                    exc,
                )
                errors.append({
                    'source_row_number': source_row,
                    'error': 'Integrity error while creating cargo item',
                    'details': str(exc),
                    'candidate': candidate,
                })
            except Exception as exc:
                logger.error(
                    "Unexpected error creating cargo item for container %s row %s: %s",
                    self.container_id,
                    source_row,
                    exc,
                    exc_info=True,
                )
                errors.append({
                    'source_row_number': source_row,
                    'error': str(exc),
                    'candidate': candidate,
                })

        return {
            'created_items': created_items,
            'errors': errors
        }


def process_excel_upload(container_id: str, candidates: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Main function to process Excel upload candidates.
    
    Args:
        container_id: The container ID to add items to
        candidates: List of parsed Excel row candidates
        
    Returns:
        Complete processing results with matches, suggestions, and statistics
    """
    matcher = ShippingMarkMatcher(container_id)
    match_results = matcher.match_candidates(candidates)
    
    # Add similarity suggestions for unmatched items (flat) and also
    # group unmatched items by their normalized shipping mark so the
    # frontend/UI can present groups for bulk resolution.
    unmatched_with_suggestions = []
    for unmatched_item in match_results['unmatched_items']:
        suggestions = matcher.suggest_similar_customers(
            unmatched_item['shipping_mark_normalized']
        )
        unmatched_with_suggestions.append({
            'candidate': unmatched_item,
            'suggestions': suggestions
        })

    # Group unmatched items by normalized shipping mark
    groups: Dict[str, Dict[str, Any]] = {}
    for uw in unmatched_with_suggestions:
        candidate = uw['candidate']
        key = candidate.get('shipping_mark_normalized') or candidate.get('shipping_mark') or ''

        if key not in groups:
            # Use a human-friendly display mark from the first candidate
            display_mark = candidate.get('shipping_mark') or key
            groups[key] = {
                'shipping_mark_normalized': key,
                'display_mark': display_mark,
                'count': 0,
                'candidates': [],
                # Compute suggestions once per group (could be empty list)
                'suggestions': matcher.suggest_similar_customers(key)
            }

        groups[key]['candidates'].append(candidate)
        groups[key]['count'] += 1

    # Convert groups dict to list sorted by descending count (largest groups first)
    grouped_unmatched = sorted(groups.values(), key=lambda g: g['count'], reverse=True)

    # Extend statistics to include grouped unmatched info (non-breaking)
    stats = dict(match_results['statistics']) if match_results.get('statistics') else {}
    stats['grouped_unmatched_count'] = len(grouped_unmatched)

    return {
        'matched_items': match_results['matched_items'],
        # Flat list (backwards compatible) - each item has 'candidate' and 'suggestions'
        'unmatched_items': unmatched_with_suggestions,
        # Grouped unmatched items for bulk resolution in the UI
        'unmatched_groups': grouped_unmatched,
        'duplicate_tracking_numbers': [],
        'statistics': stats
    }