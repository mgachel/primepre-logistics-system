import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plane, Ship, Info } from 'lucide-react';
import { CustomerAirUpdates } from './CustomerAirUpdates';
import { CustomerSeaUpdates } from './CustomerSeaUpdates';

/**
 * Customer Daily Updates Component
 * Two main tabs: Air and Sea
 * Each with subtabs for Containers and Goods Received
 * Shows only data from last 30 days, read-only
 */
export function CustomerDailyUpdates() {
  const [activeTab, setActiveTab] = useState<'air' | 'sea'>('air');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Updates</h1>
          <p className="text-muted-foreground mt-2">
            View cargo containers and goods received from the last 30 days
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="flex items-start gap-3 pt-6">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Information</p>
            <p>
              This section shows cargo data from the <strong>last 30 days only</strong>.
              You can view and search items, but cannot make any changes.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs: Air vs Sea */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'air' | 'sea')} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="air" className="flex items-center gap-2">
            <Plane className="h-4 w-4" />
            Air Cargo
          </TabsTrigger>
          <TabsTrigger value="sea" className="flex items-center gap-2">
            <Ship className="h-4 w-4" />
            Sea Cargo
          </TabsTrigger>
        </TabsList>

        {/* Air Cargo Tab */}
        <TabsContent value="air" className="mt-6">
          <CustomerAirUpdates />
        </TabsContent>

        {/* Sea Cargo Tab */}
        <TabsContent value="sea" className="mt-6">
          <CustomerSeaUpdates />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default CustomerDailyUpdates;
