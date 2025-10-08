import { CustomerAirGoodsReceived } from '@/components/daily-updates/CustomerAirGoodsReceived';
import { Plane, Ship } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Customer Air Goods Received Page
 * Shows only air goods received in China (last 30 days)
 */
export default function AirGoodsReceivedPage() {
  const navigate = useNavigate();
  
  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        <button
          onClick={() => navigate('/daily-updates/sea-goods')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <Ship className="h-4 w-4" />
          Sea Goods
        </button>
        <button
          onClick={() => navigate('/daily-updates/air-goods')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground"
        >
          <Plane className="h-4 w-4" />
          Air Goods
        </button>
      </div>

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
