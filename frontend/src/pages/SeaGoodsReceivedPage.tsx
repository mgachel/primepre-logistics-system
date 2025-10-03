import { CustomerSeaGoodsReceived } from '@/components/daily-updates/CustomerSeaGoodsReceived';
import { Ship } from 'lucide-react';

/**
 * Customer Sea Goods Received Page
 * Shows only sea goods received in China (last 30 days)
 */
export default function SeaGoodsReceivedPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Ship className="h-8 w-8" />
          Sea Goods Received in China
        </h1>
        <p className="text-muted-foreground mt-2">
          View sea goods received from the last 30 days
        </p>
      </div>
      <CustomerSeaGoodsReceived />
    </div>
  );
}
