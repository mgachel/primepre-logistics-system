import { CustomerAirContainers } from '@/components/daily-updates/CustomerAirContainers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plane, Ship } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Customer Air Containers Page
 * Shows only air cargo containers (last 30 days)
 */
export default function AirContainersPage() {
  const navigate = useNavigate();
  
  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        <button
          onClick={() => navigate('/shipments/sea-containers')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <Ship className="h-4 w-4" />
          Sea Goods
        </button>
        <button
          onClick={() => navigate('/shipments/air-containers')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground"
        >
          <Plane className="h-4 w-4" />
          Air Goods
        </button>
      </div>

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
