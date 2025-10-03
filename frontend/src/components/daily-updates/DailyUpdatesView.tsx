import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell } from "lucide-react";
import { CustomerCargoTab } from "./customer/CustomerCargoTab";
import { CustomerShipmentsTab } from "./customer/CustomerShipmentsTab";

interface DailyUpdatesViewProps {
  className?: string;
}

export function DailyUpdatesView({ className }: DailyUpdatesViewProps) {
  return (
    <div className={className}>
      <header className="mb-8 space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          <Bell className="h-4 w-4" />
          Customer Dashboard
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Daily updates</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Track your active cargo containers and the latest goods received into the China warehouse. Everything here is read-only, so you can stay informed while we handle the operations.
        </p>
      </header>

      <Tabs defaultValue="cargo" className="space-y-6">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="cargo">Cargo</TabsTrigger>
          <TabsTrigger value="shipments">Shipments</TabsTrigger>
        </TabsList>

        <TabsContent value="cargo" className="space-y-6">
          <CustomerCargoTab />
        </TabsContent>

        <TabsContent value="shipments" className="space-y-6">
          <CustomerShipmentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default DailyUpdatesView;