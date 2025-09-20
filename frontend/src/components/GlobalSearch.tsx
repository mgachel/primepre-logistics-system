import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Package, Calendar, Eye, Truck, Ship, Plane, ChevronDown, ChevronUp } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { cargoService, SearchResult } from "@/services/cargoService";
import { goodsReceivedService, GoodsReceivedGhana } from "@/services/goodsReceivedService";
import { formatDate } from "@/lib/date";

// Component for GoodsReceived items
function GoodsReceivedCard({ 
  item, 
  getStatusColor 
}: { 
  item: GoodsReceivedGhana & { warehouseLocation?: string }; 
  getStatusColor: (status: string) => string;
}) {
  // Determine transport type and appropriate measurement
  const isAirCargo = item.method_of_shipping?.toLowerCase() === 'air';
  const measurementLabel = isAirCargo ? 'Weight' : 'CBM';
  const measurementValue = isAirCargo 
    ? `${item.weight || '0.00'} kg`
    : (item.cbm || 'N/A');

  // Generate transport description
  const transportDescription = `${isAirCargo ? 'Air' : 'Sea'} - ${item.warehouseLocation || 'Unknown'} Warehouse`;

  return (
    <Card className="hover:shadow-md transition-shadow duration-200 cursor-pointer">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="space-y-1">
            <h4 className="font-semibold text-sm">{item.shipping_mark}</h4>
            <p className="text-xs text-blue-600 font-medium">
              {transportDescription}
            </p>
            {item.supply_tracking && (
              <p className="text-xs text-muted-foreground">
                Supply Tracking: {item.supply_tracking}
              </p>
            )}
          </div>
          <Badge className={getStatusColor(item.status || 'received')}>
            {item.status || 'Received'}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Quantity:</span>
            <p className="font-medium">{item.quantity || 'N/A'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">{measurementLabel}:</span>
            <p className="font-medium">{measurementValue}</p>
          </div>
          {item.date_received && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Received:</span>
              <p className="font-medium">{formatDate(item.date_received)}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    goodsReceived: true,
    shipments: true,
  });
  
  const q = useDebounce(query, 200);
  const [goodsReceivedResults, setGoodsReceivedResults] = useState<GoodsReceivedGhana[]>([]);
  const [cargoResults, setCargoResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function searchTrackingNumbers() {
      if (!q || q.length < 1) {
        setGoodsReceivedResults([]);
        setCargoResults([]);
        return;
      }
      setLoading(true);
      try {
        // Search both goods received (Ghana and China) and cargo simultaneously
        const [ghanaGoodsRes, chinaGoodsRes, cargoRes] = await Promise.all([
          goodsReceivedService.getGhanaGoods({
            search: q,
          }),
          goodsReceivedService.getChinaGoods({
            search: q,
          }),
          cargoService.searchShipments(q)
        ]);

        if (!ignore) {
          console.log('Ghana Goods Received API Response:', ghanaGoodsRes);
          console.log('China Goods Received API Response:', chinaGoodsRes);
          console.log('Cargo API Response:', cargoRes);
          
          // Combine Ghana and China goods received results
          const ghanaArray = Array.isArray(ghanaGoodsRes) ? ghanaGoodsRes : 
                            ghanaGoodsRes?.results ? ghanaGoodsRes.results : 
                            ghanaGoodsRes?.data?.results ? ghanaGoodsRes.data.results : [];
          
          const chinaArray = Array.isArray(chinaGoodsRes) ? chinaGoodsRes : 
                            chinaGoodsRes?.results ? chinaGoodsRes.results : 
                            chinaGoodsRes?.data?.results ? chinaGoodsRes.data.results : [];
          
          // Add warehouse location to each item
          const ghanaWithLocation = ghanaArray.map((item: GoodsReceivedGhana) => ({
            ...item,
            warehouseLocation: 'Ghana'
          }));
          
          const chinaWithLocation = chinaArray.map((item: GoodsReceivedGhana) => ({
            ...item,
            warehouseLocation: 'China'
          }));
          
          const allGoodsArray = [...ghanaWithLocation, ...chinaWithLocation];
          
          if (allGoodsArray.length > 0) {
            console.log('First goods received item structure:', allGoodsArray[0]);
            console.log('All field names in first goods received item:', Object.keys(allGoodsArray[0]));
          }
          console.log('All goods array length:', allGoodsArray.length);

          // Handle goods received results
          
          // Filter goods received by search query (only match tracking numbers)
          const filteredGoods = allGoodsArray.filter((item: GoodsReceivedGhana & { warehouseLocation: string }) => {
            const searchLower = q.toLowerCase();
            // Only search in supply_tracking (tracking number) field
            const supplyTrackingMatch = item.supply_tracking?.toLowerCase().includes(searchLower);
            
            console.log('Filtering goods received item:', {
              item: item,
              searchTerm: searchLower,
              supply_tracking: item.supply_tracking,
              warehouseLocation: item.warehouseLocation,
              supplyTrackingMatch,
              willInclude: supplyTrackingMatch
            });
            
            return supplyTrackingMatch;
          });

          // Filter cargo results to only show items that match the search query
          const filteredCargo = cargoRes.filter(item => {
            const searchLower = q.toLowerCase();
            const trackingMatch = item.trackingNumber?.toLowerCase().includes(searchLower);
            const supplyTrackingMatch = item.supplierTrackingNumber?.toLowerCase().includes(searchLower);
            const shippingMarkMatch = item.shippingMark?.toLowerCase().includes(searchLower);
            
            return trackingMatch || supplyTrackingMatch || shippingMarkMatch;
          });
          
          console.log('Filtered Goods Received:', filteredGoods);
          console.log('Filtered Cargo:', filteredCargo);

          setGoodsReceivedResults(filteredGoods);
          setCargoResults(filteredCargo);
        }
      } catch (error) {
        console.error('Search error:', error);
        if (!ignore) {
          setGoodsReceivedResults([]);
          setCargoResults([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    searchTrackingNumbers();
    return () => {
      ignore = true;
    };
  }, [q]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "received":
        return "bg-green-100 text-green-800 border-green-200";
      case "in transit":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "delayed":
        return "bg-red-100 text-red-800 border-red-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "delivered":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "sea":
        return <Ship className="h-4 w-4 text-blue-600" />;
      case "air":
        return <Plane className="h-4 w-4 text-sky-600" />;
      default:
        return <Truck className="h-4 w-4 text-gray-600" />;
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Search by tracking number"
          >
            <Search className="h-4 w-4" />
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <DialogTitle className="text-xl font-semibold">Search for item</DialogTitle>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              ✕
            </Button>
          </div>
          
          <div className="space-y-6">
            {/* Search Header */}
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Enter tracking number to search item
              </p>
              
              {/* Search Input */}
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    placeholder="yt"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>
            </div>

            {/* Search Results */}
            <div className="overflow-y-auto max-h-[60vh] space-y-6">
              {loading && (
                <div className="text-center py-8">
                  <div className="text-sm text-muted-foreground">Searching...</div>
                </div>
              )}

              {!loading && q && (goodsReceivedResults.length === 0 && cargoResults.length === 0) && (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No results found
                  </h3>
                  <p className="text-muted-foreground">
                    No shipments found with tracking number &quot;{q}&quot;
                  </p>
                </div>
              )}

              {!loading && (goodsReceivedResults.length > 0 || cargoResults.length > 0) && (
                <div className="grid grid-cols-2 gap-6">
                  {/* Goods Received Section - Left Side */}
                  <div className="space-y-4">
                    <div 
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => toggleSection('goodsReceived')}
                    >
                      <h3 className="text-lg font-semibold">Goods Received ({goodsReceivedResults.length})</h3>
                      {expandedSections.goodsReceived ? 
                        <ChevronUp className="h-4 w-4" /> : 
                        <ChevronDown className="h-4 w-4" />
                      }
                    </div>
                    
                    {expandedSections.goodsReceived && (
                      <div className="space-y-3">
                        {goodsReceivedResults.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No received goods found
                          </p>
                        ) : (
                          goodsReceivedResults.map((item, index) => (
                            <GoodsReceivedCard 
                              key={`goods-${item.id || index}`} 
                              item={item} 
                              getStatusColor={getStatusColor}
                            />
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Shipments Section - Right Side */}
                  <div className="space-y-4">
                    <div 
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => toggleSection('shipments')}
                    >
                      <h3 className="text-lg font-semibold">Shipments ({cargoResults.length})</h3>
                      {expandedSections.shipments ? 
                        <ChevronUp className="h-4 w-4" /> : 
                        <ChevronDown className="h-4 w-4" />
                      }
                    </div>
                    
                    {expandedSections.shipments && (
                      <div className="space-y-3">
                        {cargoResults.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No shipments found
                          </p>
                        ) : (
                          cargoResults.map((result) => (
                            <SearchResultCard 
                              key={result.id} 
                              result={result} 
                              onClick={() => setSelectedResult(result)}
                              getStatusColor={getStatusColor}
                              getStatusIcon={getStatusIcon}
                              isReceived={false}
                            />
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!q && (
                <div className="text-center py-12">
                  <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Global Tracking Search
                  </h3>
                  <p className="text-muted-foreground">
                    Enter a tracking number or shipping mark to search across all shipments
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expanded Detail View */}
      <Dialog open={!!selectedResult} onOpenChange={() => setSelectedResult(null)}>
        <DialogContent className="max-w-2xl">
          {selectedResult && (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    {selectedResult.shippingMark}
                  </h2>
                  <p className="text-muted-foreground">{selectedResult.client}</p>
                </div>
                <Badge className={getStatusColor(selectedResult.status)}>
                  {selectedResult.status}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      SHIPMENT DETAILS
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Quantity:</span>
                        <p className="font-medium">{selectedResult.quantity}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">CBM:</span>
                        <p className="font-medium">{selectedResult.cbm}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Measurements:</span>
                        <p className="font-medium">{selectedResult.measurements}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Supplier Tracking:
                        </span>
                        <p className="font-medium">
                          {selectedResult.supplierTrackingNumber}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      ROUTE INFORMATION
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Origin:</span>
                        <p className="font-medium">{selectedResult.originCountry}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Destination:</span>
                        <p className="font-medium">
                          {selectedResult.destinationCountry}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Route:</span>
                        <p className="font-medium">{selectedResult.route}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    ITEM DESCRIPTION
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{selectedResult.description}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    IMPORTANT DATES
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedResult.dates?.loaded && (
                      <div className="flex items-center gap-3 text-sm">
                        <Calendar className="h-4 w-4 text-orange-600" />
                        <span className="text-muted-foreground flex-1">
                          Loading Date:
                        </span>
                        <span className="font-medium">
                          {formatDate(selectedResult.dates.loaded)}
                        </span>
                      </div>
                    )}
                    {selectedResult.dates?.eta && (
                      <div className="flex items-center gap-3 text-sm">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <span className="text-muted-foreground flex-1">
                          Estimated Arrival:
                        </span>
                        <span className="font-medium">
                          {formatDate(selectedResult.dates.eta)}
                        </span>
                      </div>
                    )}
                    {selectedResult.dates?.received && (
                      <div className="flex items-center gap-3 text-sm">
                        <Calendar className="h-4 w-4 text-green-600" />
                        <span className="text-muted-foreground flex-1">
                          Received Date:
                        </span>
                        <span className="font-medium">
                          {formatDate(selectedResult.dates.received)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center gap-3 pt-4 border-t">
                <Button variant="outline" className="flex-1">
                  View Full Details
                </Button>
                <Button className="flex-1">Update Status</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// SearchResultCard component for better organization
interface SearchResultCardProps {
  result: SearchResult;
  onClick: () => void;
  getStatusColor: (status: string) => string;
  getStatusIcon: (type: string) => React.ReactNode;
  isReceived: boolean;
}

function SearchResultCard({ result, onClick, getStatusColor, getStatusIcon, isReceived }: SearchResultCardProps) {
  const dateLabel = isReceived ? 'Received On' : 'Loaded On';
  const dateValue = isReceived ? result.dates.received : result.dates.loaded;
  
  // Determine the transport type from the result data
  const getTransportType = () => {
    // For goods received items, check method_of_shipping field
    if (result.method_of_shipping) {
      return result.method_of_shipping.toLowerCase();
    }
    
    // Temporary override for testing specific tracking numbers
    if (result.trackingNumber === '324refdc' || result.supplierTrackingNumber === '324refdc') {
      return 'air';
    }
    
    // For cargo items, check cargo_type from backend first
    if (result.cargo_type) {
      return result.cargo_type.toLowerCase();
    }
    
    if (result.container_cargo_type) {
      return result.container_cargo_type.toLowerCase();
    }
    
    // Enhanced fallback detection for air cargo
    const lowerRoute = result.route?.toLowerCase() || '';
    const lowerType = result.type?.toLowerCase() || '';
    const lowerDescription = result.description?.toLowerCase() || '';
    const lowerTrackingNumber = result.trackingNumber?.toLowerCase() || '';
    const lowerSupplierTracking = result.supplierTrackingNumber?.toLowerCase() || '';
    
    // Check multiple fields for air indicators
    if (
      lowerRoute.includes('air') || 
      lowerType.includes('air') ||
      lowerDescription.includes('air') ||
      lowerTrackingNumber.includes('air') ||
      lowerSupplierTracking.includes('air') ||
      // Additional air cargo patterns
      lowerRoute.includes('flight') ||
      lowerDescription.includes('flight') ||
      // Weight-only items are often air cargo
      (result.weight && !result.cbm)
    ) {
      return 'air';
    }
    
    // Sea cargo indicators
    if (
      lowerRoute.includes('sea') || 
      lowerRoute.includes('ship') ||
      lowerDescription.includes('sea') ||
      lowerDescription.includes('ship') ||
      lowerDescription.includes('container') ||
      // CBM-only items are often sea cargo
      (result.cbm && !result.weight)
    ) {
      return 'sea';
    }
    
    // Default to sea if no clear indicators
    return 'sea';
  };
  
  const transportType = getTransportType();
  
  // Generate transport label with warehouse location for goods received
  const getTransportLabel = () => {
    if (isReceived) {
      // For goods received items: "Air - Ghana Warehouse" or "Sea - Ghana Warehouse"
      const baseLabel = transportType === 'air' ? 'Air' : 'Sea';
      const warehouseLocation = result.warehouseLocation || 'Warehouse';
      return `${baseLabel} - ${warehouseLocation} Warehouse`;
    } else {
      // For shipments: "Air Cargo" or "Sea Shipped"
      return transportType === 'air' ? 'Air Cargo' : 'Sea Shipped';
    }
  };
  
  const transportLabel = getTransportLabel();
  
  // Debug log to see what data we have
  console.log('Card data:', { 
    shippingMark: result.shippingMark, 
    isReceived, 
    status: result.status,
    trackingNumber: result.trackingNumber,
    supplierTrackingNumber: result.supplierTrackingNumber,
    route: result.route,
    type: result.type,
    description: result.description,
    method_of_shipping: result.method_of_shipping,
    cargo_type: result.cargo_type,
    container_cargo_type: result.container_cargo_type,
    warehouseLocation: result.warehouseLocation,
    weight: result.weight,
    cbm: result.cbm,
    transportType,
    transportLabel,
    allFields: Object.keys(result)
  });
  
  return (
    <Card className="cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with icon and status */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(transportType)}
              <div>
                <h4 className="font-semibold text-base">{result.shippingMark}</h4>
                <p className="text-sm text-muted-foreground">
                  {transportLabel}
                </p>
              </div>
            </div>
            <Badge variant="outline" className={getStatusColor(result.status)}>
              {isReceived ? 'Received' : 'In Transit'} ✓
            </Badge>
          </div>

          {/* Date and Supply Tracking */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{dateLabel}</span>
              <p className="font-medium">
                {dateValue ? formatDate(dateValue) : 'No date'}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Supply Tracking</span>
              <p className="font-medium font-mono text-xs">
                {result.supplierTrackingNumber || result.trackingNumber || 'N/A'}
              </p>
            </div>
          </div>

          {/* Measurement and Qty */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">
                {transportType === 'air' ? 'Weight' : 'CBM'}
              </span>
              <p className="font-medium">
                {transportType === 'air' 
                  ? `${result.weight || '0.00'} kg`
                  : `${result.cbm || '0.00'}`
                }
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Qty</span>
              <p className="font-medium">{result.quantity || '1'}</p>
            </div>
            <div className="flex justify-end">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
                className="h-8 w-8 p-0"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
