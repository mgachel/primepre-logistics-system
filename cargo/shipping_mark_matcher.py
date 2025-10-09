"""
Shipping mark matching service for Excel upload processing.
Groups candidates by shipping mark (client) and prevents duplicate summaries.
"""

from typing import List, Dict, Any
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import Q
from .excel_utils import normalize_shipping_mark
import logging

logger = logging.getLogger(__name__)
CustomerUser = get_user_model()


class ShippingMarkMatcher:
    """Service for matching and grouping shipping marks from Excel uploads."""

    def __init__(self, container_id: str):
        self.container_id = container_id
        self.customer_cache = {}
        self._load_customers()

    def _load_customers(self):
        """Load all customers and cache by normalized shipping mark."""
        customers = CustomerUser.objects.all()
        for customer in customers:
            if customer.shipping_mark:
                normalized = normalize_shipping_mark(customer.shipping_mark)
                if normalized:
                    self.customer_cache[normalized] = customer

    def match_candidates(self, candidates: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Match Excel candidates to customers.
        Groups by shipping mark, allows duplicate tracking numbers.
        """
        matched_groups = {}
        unmatched_items = []
        duplicate_tracking_numbers = []

        for candidate in candidates:
            shipping_mark = candidate['shipping_mark_normalized']
            tracking_number = candidate.get('tracking_number')
            customer = self.customer_cache.get(shipping_mark)

            if customer:
                key = customer.id
                matched_groups.setdefault(key, {
                    'customer': {
                        'id': customer.id,
                        'shipping_mark': customer.shipping_mark,
                        'name': customer.get_full_name() or customer.phone,
                        'phone': getattr(customer, 'phone', ''),
                        'email': customer.email,
                    },
                    'candidates': []
                })
                matched_groups[key]['candidates'].append(candidate)
            else:
                unmatched_items.append(candidate)

        return {
            'matched_groups': matched_groups,
            'unmatched_items': unmatched_items,
            'statistics': {
                'total_candidates': len(candidates),
                'matched_groups_count': len(matched_groups),
                'unmatched_count': len(unmatched_items),
            }
        }

    def create_cargo_items(self, matched_groups: Dict[int, Dict[str, Any]]) -> Dict[str, Any]:
        """
        Create CargoItem and ClientShipmentSummary entries for grouped clients.
        """
        from .models import CargoItem, CargoContainer, ClientShipmentSummary

        created_items = []
        errors = []

        try:
            container = CargoContainer.objects.get(container_id=self.container_id)
        except CargoContainer.DoesNotExist:
            return {
                'created_items': [],
                'errors': [{'error': f'Container {self.container_id} not found'}]
            }

        for group_data in matched_groups.values():
            customer_info = group_data['customer']
            candidates = group_data['candidates']

            try:
                customer = CustomerUser.objects.get(id=customer_info['id'])
            except CustomerUser.DoesNotExist:
                errors.append({
                    'error': f"Customer with id {customer_info['id']} not found",
                    'customer_info': customer_info
                })
                continue

            # Ensure only one summary per (container, client)
            summary, _ = ClientShipmentSummary.objects.get_or_create(
                container=container,
                client=customer
            )

            # Create all cargo items for this customer group
            for candidate in candidates:
                cbm_value = candidate.get('cbm')
                try:
                    cbm_value = float(cbm_value) if cbm_value else None
                except (TypeError, ValueError):
                    cbm_value = None

                try:
                    with transaction.atomic():
                        cargo_item = CargoItem.objects.create(
                            container=container,
                            client=customer,
                            tracking_id=candidate.get('tracking_number') or '',
                            item_description=candidate.get('description') or '',
                            quantity=candidate.get('quantity') or 0,
                            cbm=cbm_value,
                        )
                        created_items.append({
                            'cargo_item_id': str(cargo_item.id),
                            'tracking_id': cargo_item.tracking_id,
                            'source_row_number': candidate.get('source_row_number'),
                            'customer_name': customer.get_full_name() or customer.phone,
                        })
                except IntegrityError as exc:
                    logger.warning(
                        "Integrity error while creating cargo item for container %s: %s",
                        self.container_id, exc
                    )
                    errors.append({
                        'error': 'Integrity error while creating cargo item',
                        'details': str(exc),
                        'candidate': candidate,
                    })
                except Exception as exc:
                    logger.error(
                        "Unexpected error creating cargo item for container %s: %s",
                        self.container_id, exc, exc_info=True
                    )
                    errors.append({
                        'error': str(exc),
                        'candidate': candidate,
                    })

            # Update totals once per client
            summary.update_totals()

        return {'created_items': created_items, 'errors': errors}


def process_excel_upload(container_id: str, candidates: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Main entry for Excel upload processing.
    Groups by client and creates all items + summaries.
    """
    matcher = ShippingMarkMatcher(container_id)
    match_results = matcher.match_candidates(candidates)

    unmatched_with_suggestions = []
    for unmatched_item in match_results['unmatched_items']:
        suggestions = matcher.suggest_similar_customers(
            unmatched_item['shipping_mark_normalized']
        )
        unmatched_with_suggestions.append({
            'candidate': unmatched_item,
            'suggestions': suggestions
        })

    created_data = matcher.create_cargo_items(match_results['matched_groups'])

    return {
        'created_items': created_data['created_items'],
        'errors': created_data['errors'],
        'unmatched_items': unmatched_with_suggestions,
        'statistics': match_results['statistics'],
    }
