import { CustomerAirContainers } from '@/components/daily-updates/CustomerAirContainers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plane } from 'lucide-react';

/**
 * Customer Air Containers Page
 * Shows only air cargo containers (last 30 days)
 */
export default function AirContainersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Plane className="h-8 w-8" />
          Air Cargo Containers
        </h1>
        <p className="text-muted-foreground mt-2">
          View air cargo containers from the last 30 days
        </p>
      </div>
      <CustomerAirContainers />
    </div>
  );
}
