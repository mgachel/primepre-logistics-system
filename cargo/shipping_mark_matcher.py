"""
Shipping mark matching service for Excel upload processing.
Handles matching imported shipping marks with existing CustomerUser records.
"""
from typing import List, Dict, Any, Optional, Tuple
from django.contrib.auth import get_user_model
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
        
        # Track tracking numbers to detect duplicates
        tracking_numbers_seen = set()
        
        for candidate in candidates:
            shipping_mark = candidate['shipping_mark_normalized']
            tracking_number = candidate['tracking_number']
            
            # Check for duplicate tracking numbers within this batch
            if tracking_number and tracking_number in tracking_numbers_seen:
                duplicate_tracking_numbers.append({
                    'candidate': candidate,
                    'reason': 'duplicate_tracking_number_in_batch'
                })
                continue
            
            if tracking_number:
                tracking_numbers_seen.add(tracking_number)
            
            # Try to match with existing customer
            customer = self.customer_cache.get(shipping_mark)
            
            if customer:
                # Check for duplicate tracking number in database
                from .models import CargoItem
                if tracking_number:
                    existing_item = CargoItem.objects.filter(tracking_id=tracking_number).first()
                    if existing_item:
                        duplicate_tracking_numbers.append({
                            'candidate': candidate,
                            'reason': 'duplicate_tracking_number_in_db',
                            'existing_item_id': str(existing_item.id),
                            'existing_container': existing_item.container.container_id
                        })
                        continue
                
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
            'duplicate_tracking_numbers': duplicate_tracking_numbers,
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
        from .models import CargoItem, CargoContainer
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
        
        with transaction.atomic():
            for item_data in matched_items:
                try:
                    candidate = item_data['candidate']
                    customer = CustomerUser.objects.get(id=item_data['customer']['id'])
                    
                    cargo_item = CargoItem(
                        container=container,
                        client=customer,
                        tracking_id=candidate['tracking_number'] or '',  # Will be auto-generated if empty
                        item_description=candidate['description'],
                        quantity=candidate['quantity'],
                        cbm=candidate['cbm']
                    )
                    cargo_item.save()
                    
                    created_items.append({
                        'cargo_item_id': str(cargo_item.id),
                        'tracking_id': cargo_item.tracking_id,
                        'source_row_number': candidate['source_row_number'],
                        'customer_name': customer.get_full_name() or customer.phone
                    })
                    
                except Exception as e:
                    logger.error(f"Error creating cargo item for row {candidate['source_row_number']}: {e}")
                    errors.append({
                        'source_row_number': candidate['source_row_number'],
                        'error': str(e),
                        'candidate': candidate
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
    
    # Add similarity suggestions for unmatched items
    unmatched_with_suggestions = []
    for unmatched_item in match_results['unmatched_items']:
        suggestions = matcher.suggest_similar_customers(
            unmatched_item['shipping_mark_normalized']
        )
        unmatched_with_suggestions.append({
            'candidate': unmatched_item,
            'suggestions': suggestions
        })
    
    return {
        'matched_items': match_results['matched_items'],
        'unmatched_items': unmatched_with_suggestions,
        'duplicate_tracking_numbers': match_results['duplicate_tracking_numbers'],
        'statistics': match_results['statistics']
    }