import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Copy, 
  ExternalLink,
  Package,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { settingsService, WarehouseAddress } from '@/services/settingsService';
import { useAuth } from '@/contexts/AuthContext';

const AddressCard = ({ address, shippingMark }: { address: WarehouseAddress, shippingMark: string }) => {
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    });
  };

  const openInMaps = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://maps.google.com/maps?q=${encodedAddress}`, '_blank');
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-blue-600" />
            <div>
              <CardTitle className="text-lg">{address.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-blue-100 text-blue-800">
                  {address.location}
                </Badge>
                {address.is_active ? (
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        {address.description && (
          <CardDescription className="mt-2">
            {address.description}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Address */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Address</span>
          </div>
          <p className="text-sm text-muted-foreground pl-6">
            {shippingMark} {address.address}
          </p>
          <div className="flex gap-2 pl-6">
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(`${shippingMark} ${address.address}`, 'Address')}
              className="flex items-center gap-1"
            >
              <Copy className="h-3 w-3" />
              Copy
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openInMaps(address.address)}
              className="flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Maps
            </Button>
          </div>
        </div>

        {/* Created Date */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">Created</span>
          </div>
          <p className="text-sm text-muted-foreground pl-6">
            {new Date(address.created_at).toLocaleDateString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default function CustomerAddresses() {
  const [addresses, setAddresses] = useState<WarehouseAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  console.log("Auth user object:", user); // Debugging log

  const shippingMark = user?.shipping_mark || "No Shipping Mark Found";

  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await settingsService.getWarehouseAddresses();
        if (response.success) {
          setAddresses(response.data);
        } else {
          setError(response.message);
        }
      } catch (err) {
        console.error('Failed to fetch addresses:', err);
        setError('Failed to load warehouse addresses. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAddresses();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading addresses...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Addresses</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Warehouse Addresses</h1>
        <p className="text-muted-foreground mt-1">
          View all warehouse locations and contact information for pickup and delivery.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Warehouses</p>
                <p className="font-semibold">
                  {addresses.length} Locations
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Warehouses</p>
                <p className="font-semibold">
                  {addresses.filter(a => a.is_active).length} Active
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Warehouse Addresses */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Warehouse Locations
        </h2>
        
        <div className="grid gap-6 md:grid-cols-2">
          {addresses.map((address) => (
            <AddressCard key={address.id} address={address} shippingMark={shippingMark} />
          ))}
        </div>
      </div>

      {/* Help Section */}
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-2">Need Help with Pickup or Delivery?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Contact our customer service team for assistance with scheduling pickups or deliveries.
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm">
              Contact Support
            </Button>
            <Button variant="outline" size="sm">
              Contact Form
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
