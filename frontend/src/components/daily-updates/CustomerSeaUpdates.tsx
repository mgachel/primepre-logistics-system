import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Warehouse } from 'lucide-react';
import { CustomerSeaContainers } from './CustomerSeaContainers';
import { CustomerSeaGoodsReceived } from './CustomerSeaGoodsReceived';

/**
 * Customer Sea Updates Component
 * Subtabs: Containers (Shipments) and Goods Received
 */
export function CustomerSeaUpdates() {
  const [activeSubTab, setActiveSubTab] = useState<'containers' | 'goods-received'>('containers');

  return (
    <Tabs value={activeSubTab} onValueChange={(value) => setActiveSubTab(value as 'containers' | 'goods-received')} className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="containers" className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          Containers (Shipments)
        </TabsTrigger>
        <TabsTrigger value="goods-received" className="flex items-center gap-2">
          <Warehouse className="h-4 w-4" />
          Goods Received
        </TabsTrigger>
      </TabsList>

      {/* Containers Subtab */}
      <TabsContent value="containers" className="mt-6">
        <CustomerSeaContainers />
      </TabsContent>

      {/* Goods Received Subtab */}
      <TabsContent value="goods-received" className="mt-6">
        <CustomerSeaGoodsReceived />
      </TabsContent>
    </Tabs>
  );
}

export default CustomerSeaUpdates;
