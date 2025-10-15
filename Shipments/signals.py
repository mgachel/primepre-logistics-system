from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from GoodsRecieved.models import GoodsReceivedChina, GoodsReceivedGhana
from cargo.models import CargoItem, CargoContainer
from .models import Shipments


@receiver(post_save, sender=GoodsReceivedChina)
def create_shipment_from_china(sender, instance, created, **kwargs):
    """
    When goods are received in China, auto-create a Shipment.
    """
    if created:
        supply_tracking = instance.supply_tracking
        if not supply_tracking:
            return

        defaults = {
            "goods_received_china": instance,
            "shipping_mark": instance.shipping_mark or "UNKNOWN",
            "quantity": instance.quantity,
            "cbm": instance.cbm,
            "weight": instance.weight,
            "date_received": instance.date_received,
            "status": "pending",
            "method_of_shipping": (instance.method_of_shipping or "sea").lower(),
        }

        _shipment, _created = Shipments.objects.update_or_create(
            supply_tracking=supply_tracking,
            defaults=defaults,
        )
    else:
        # If goods are marked as shipped, update Shipment
        if instance.status == "SHIPPED":
            shipment = Shipments.objects.filter(goods_received_china=instance).first()
            if shipment:
                shipment.status = "in_transit"
                shipment.date_shipped = timezone.now()
                shipment.save(update_fields=["status", "date_shipped", "updated_at"])


@receiver(post_save, sender=GoodsReceivedGhana)
def update_shipment_from_ghana(sender, instance, created, **kwargs):
    """
    When goods are received/delivered in Ghana, update Shipment to 'delivered'.
    """
    if instance.status == "DELIVERED":
        shipment_qs = Shipments.objects.filter(supply_tracking=instance.supply_tracking)
        shipment = shipment_qs.first()
        if shipment:
            # If there are multiple shipments matching this tracking id, log a warning
            if shipment_qs.count() > 1:
                import logging
                logging.getLogger(__name__).warning(
                    "Multiple shipments found for supply_tracking=%s; using first",
                    instance.supply_tracking
                )
            shipment.status = "delivered"
            shipment.save(update_fields=["status", "updated_at"])


@receiver(post_save, sender=CargoItem)
def update_shipment_from_cargo_item(sender, instance, created, **kwargs):
    """
    When a CargoItem is created, link/update the Shipment.
    """
    shipment_qs = Shipments.objects.filter(supply_tracking=instance.tracking_id)
    shipment = shipment_qs.first()
    if not shipment:
        return
    if shipment_qs.count() > 1:
        import logging
        logging.getLogger(__name__).warning(
            "Multiple shipments found for tracking_id=%s; using first",
            instance.tracking_id
        )

    # If cargo item is moved to in_transit
    if instance.status == "in_transit":
        shipment.status = "in_transit"
        shipment.date_shipped = timezone.now()
        shipment.save(update_fields=["status", "date_shipped", "updated_at"])

    # If cargo item is delivered
    if instance.status == "delivered":
        shipment.status = "delivered"
        shipment.save(update_fields=["status", "updated_at"])


@receiver(post_save, sender=CargoContainer)
def update_shipment_from_container(sender, instance, created, **kwargs):
    """
    If a container enters demurrage, mark all linked Shipments as 'demurrage'.
    """
    if instance.is_demurrage:
        cargo_items = instance.cargo_items.all()
        for item in cargo_items:
                shipment = Shipments.objects.filter(supply_tracking=item.tracking_id).first()
                if not shipment:
                    continue
                # Log if multiple shipments exist
                if Shipments.objects.filter(supply_tracking=item.tracking_id).count() > 1:
                    import logging
                    logging.getLogger(__name__).warning(
                        "Multiple shipments found for tracking_id=%s when marking demurrage; using first",
                        item.tracking_id
                    )
                shipment.status = "demurrage"
                shipment.save(update_fields=["status", "updated_at"])
