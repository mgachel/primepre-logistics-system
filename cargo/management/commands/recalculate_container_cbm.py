from django.core.management.base import BaseCommand
from cargo.models import CargoContainer


class Command(BaseCommand):
    help = 'Recalculate total CBM for sea cargo containers and weight for air cargo containers based on their cargo items'

    def add_arguments(self, parser):
        parser.add_argument(
            '--cargo-type',
            type=str,
            choices=['sea', 'air', 'all'],
            default='all',
            help='Type of cargo to recalculate (sea, air, or all)'
        )

    def handle(self, *args, **options):
        cargo_type = options['cargo_type']
        
        if cargo_type in ['sea', 'all']:
            self.stdout.write(self.style.WARNING('\n=== Recalculating Sea Cargo CBM ==='))
            self.recalculate_sea_containers()
        
        if cargo_type in ['air', 'all']:
            self.stdout.write(self.style.WARNING('\n=== Recalculating Air Cargo Weight ==='))
            self.recalculate_air_containers()
    
    def recalculate_sea_containers(self):
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
                f'Successfully updated {updated_count} sea containers with recalculated CBM totals'
            )
        )
    
    def recalculate_air_containers(self):
        air_containers = CargoContainer.objects.filter(cargo_type='air')
        
        self.stdout.write(f'Found {air_containers.count()} air cargo containers to update...')
        
        updated_count = 0
        for container in air_containers:
            old_weight = container.weight
            container.update_total_weight()
            new_weight = container.weight
            
            if old_weight != new_weight:
                updated_count += 1
                self.stdout.write(
                    f'Updated {container.container_id}: {old_weight} kg → {new_weight} kg'
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully updated {updated_count} air containers with recalculated weight totals'
            )
        )