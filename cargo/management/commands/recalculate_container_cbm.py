from django.core.management.base import BaseCommand
from cargo.models import CargoContainer


class Command(BaseCommand):
    help = 'Recalculate total CBM for all sea cargo containers based on their cargo items'

    def handle(self, *args, **options):
        sea_containers = CargoContainer.objects.filter(cargo_type='sea')
        
        self.stdout.write(f'Found {sea_containers.count()} sea cargo containers to update...')
        
        updated_count = 0
        for container in sea_containers:
            old_cbm = container.cbm
            container.update_total_cbm()
            new_cbm = container.cbm
            
            if old_cbm != new_cbm:
                updated_count += 1
                self.stdout.write(
                    f'Updated {container.container_id}: {old_cbm} m³ → {new_cbm} m³'
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully updated {updated_count} containers with recalculated CBM totals'
            )
        )