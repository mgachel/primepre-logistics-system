import { CustomerAirGoodsReceived } from '@/components/daily-updates/CustomerAirGoodsReceived';
import { Plane } from 'lucide-react';

/**
 * Customer Air Goods Received Page
 * Shows only air goods received in China (last 30 days)
 */
export default function AirGoodsReceivedPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Plane className="h-8 w-8" />
          Air Goods Received in China
        </h1>
        <p className="text-muted-foreground mt-2">
          View air goods received from the last 30 days
        </p>
      </div>
      <CustomerAirGoodsReceived />
    </div>
  );
}
