import { CustomerSeaContainers } from '@/components/daily-updates/CustomerSeaContainers';
import { Ship } from 'lucide-react';

/**
 * Customer Sea Containers Page
 * Shows only sea cargo containers (last 30 days)
 */
export default function SeaContainersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Ship className="h-8 w-8" />
          Sea Cargo Containers
        </h1>
        <p className="text-muted-foreground mt-2">
          View sea cargo containers from the last 30 days
        </p>
      </div>
      <CustomerSeaContainers />
    </div>
  );
}
