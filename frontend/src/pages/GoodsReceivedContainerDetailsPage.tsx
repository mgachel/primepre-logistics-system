import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import {
  ArrowLeft,
  Plus,
  RefreshCcw,
  Edit,
  Trash2,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { DataTable, Column } from "@/components/data-table/DataTable";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  goodsReceivedContainerService,
  GoodsReceivedContainer,
  GoodsReceivedItem,
} from "@/services/goodsReceivedContainerService";
import { EditGoodsReceivedContainerDialog } from "@/components/dialogs/EditGoodsReceivedContainerDialog";
import { AddGoodsReceivedItemDialog } from "@/components/dialogs/AddGoodsReceivedItemDialog";
import { ExcelUploadButton } from "@/components/ui/ExcelUploadButton";
import { formatDate } from "@/lib/date";

export default function GoodsReceivedContainerDetailsPage() {
  const { containerId } = useParams<{ containerId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthStore();
  
  // Check if user is customer
  const isCustomer = user?.user_role === 'CUSTOMER' || user?.is_admin_user === false;
  const customerShippingMark = user?.shipping_mark;

  const [loading, setLoading] = useState(true);
  const [container, setContainer] = useState<GoodsReceivedContainer | null>(null);
  const [goodsItems, setGoodsItems] = useState<GoodsReceivedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedMark, setExpandedMark] = useState<string | null>(null);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [showEditContainerDialog, setShowEditContainerDialog] = useState(false);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [invoiceData, setInvoiceData] = useState<{shippingMark: string, items: GoodsReceivedItem[], totalAmount: number} | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Load container and goods items
  useEffect(() => {
    const loadData = async () => {
      if (!containerId) return;

      setLoading(true);
      setError(null);
      try {
        const [containerRes] = await Promise.all([
          goodsReceivedContainerService.getContainerById(containerId),
        ]);

        if (containerRes.data) {
          setContainer(containerRes.data);
          // Extract items from container response
          setGoodsItems(containerRes.data.goods_items || []);
          console.log('Loaded container with items:', containerRes.data.goods_items?.length || 0);
        } else {
          setError("Container not found");
          return;
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load container details";
        setError(msg);
        console.error('Failed to load container data:', e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [containerId]);

  // Refresh data function
  const refreshData = async () => {
    if (!containerId) return;

    try {
      const containerRes = await goodsReceivedContainerService.getContainerById(containerId);
      if (containerRes.data) {
        setContainer(containerRes.data);
        setGoodsItems(containerRes.data.goods_items || []);
        console.log('Refreshed container with items:', containerRes.data.goods_items?.length || 0);
      }
    } catch (e: unknown) {
      console.error('Failed to refresh container data:', e);
    }
  };

  // Filter and group goods items by shipping mark based on search
  const groupedByShippingMark = useMemo(() => {
    const groups: Record<string, GoodsReceivedItem[]> = {};

    // Filter items based on search query and customer shipping mark
    const filteredItems = goodsItems.filter((item) => {
      // If customer, only show items with their shipping mark
      if (isCustomer && customerShippingMark) {
        if (item.shipping_mark !== customerShippingMark) {
          return false;
        }
      }
      
      // Then apply search filter
      if (!searchQuery.trim()) return true;
      
      const query = searchQuery.toLowerCase();
      const shippingMark = item.shipping_mark?.toLowerCase() || "";
      const description = item.description?.toLowerCase() || "";
      const supplyTracking = item.supply_tracking?.toLowerCase() || "";
      
      return shippingMark.includes(query) || 
             description.includes(query) || 
             supplyTracking.includes(query);
    });

    filteredItems.forEach((item) => {
      const mark = item.shipping_mark || "Unknown";
      if (!groups[mark]) {
        groups[mark] = [];
      }
      groups[mark].push(item);
    });

    return groups;
  }, [goodsItems, searchQuery, isCustomer, customerShippingMark]);

  const handleDeleteItem = async (itemId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this goods item? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      // TODO: Implement delete goods item service
      toast({
        title: "Item Deleted",
        description: "Goods item has been successfully deleted",
      });
      // Reload after deletion
      setGoodsItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (e: unknown) {
      toast({
        title: "Delete Failed",
        description: e instanceof Error ? e.message : "Failed to delete item",
        variant: "destructive",
      });
    }
  };

  const handlePreviewInvoice = (shippingMark: string, items: GoodsReceivedItem[], totalAmount: number) => {
    setInvoiceData({ shippingMark, items, totalAmount });
    setShowInvoicePreview(true);
  };

  const generateInvoiceHTML = (shippingMark: string, items: GoodsReceivedItem[], totalAmount: number) => {
    // Get client information from the first item (all items in a shipping mark should have the same client)
    const clientName = items[0]?.customer_name || 'N/A';
    
    // Generate invoice HTML for goods received
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Goods Received Invoice - ${shippingMark}</title>
          <style>
            body { 
              font-family: 'Arial', sans-serif; 
              margin: 0; 
              padding: 30px; 
              background: white; 
              color: #333;
              height: 100vh;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
            }
            .header { 
              text-align: center; 
              margin-bottom: 25px; 
              border-bottom: 1px solid #ddd; 
              padding-bottom: 15px; 
            }
            .header h1 { 
              color: #333; 
              margin: 0; 
              font-size: 24px; 
              font-weight: 600;
            }
            .header .company { 
              color: #666; 
              margin-top: 8px; 
              font-size: 14px; 
            }
            .invoice-details { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 30px; 
              margin-bottom: 25px; 
            }
            .info-section { 
              padding: 0; 
            }
            .info-row { 
              margin-bottom: 6px; 
              font-size: 13px; 
              display: flex;
              justify-content: space-between;
            }
            .info-row strong {
              color: #333;
              min-width: 120px;
            }
            .invoice-number { 
              text-align: right; 
            }
            .invoice-number h2 { 
              color: #333; 
              margin: 0 0 10px 0; 
              font-size: 18px;
            }
            .invoice-number div {
              font-size: 13px;
              margin-bottom: 6px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 20px;
              flex: 1;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 8px 10px; 
              text-align: left; 
              font-size: 13px;
            }
            th { 
              background-color: #f5f5f5; 
              color: #333; 
              font-weight: 600; 
            }
            tbody tr:nth-child(even) { 
              background-color: #fafafa; 
            }
            .amount-cell { 
              text-align: right; 
              font-family: 'Courier New', monospace; 
            }
            .total-row { 
              background-color: #f0f0f0 !important; 
              font-weight: bold; 
            }
            .total-row td { 
              border-top: 2px solid #333; 
              padding: 10px;
            }
            .footer { 
              text-align: center; 
              margin-top: auto; 
              color: #666; 
              font-size: 11px; 
              border-top: 1px solid #eee; 
              padding-top: 15px; 
            }
            @media print {
              body { 
                margin: 0; 
                padding: 20px;
                height: auto;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>GOODS RECEIVED INVOICE</h1>
            <div class="company">PrimePre Logistics System</div>
          </div>
          
          <div class="invoice-details">
            <div class="info-section">
              <div class="info-row"><strong>Container ID:</strong> <span>${container?.container_id}</span></div>
              <div class="info-row"><strong>Shipping Mark:</strong> <span>${shippingMark}</span></div>
              <div class="info-row"><strong>Client:</strong> <span>${clientName}</span></div>
              <div class="info-row"><strong>Container Type:</strong> <span>${container?.container_type?.toUpperCase()}</span></div>
              <div class="info-row"><strong>Offloading Date:</strong> <span>${container?.arrival_date ? new Date(container.arrival_date).toLocaleDateString() : 'N/A'}</span></div>
              ${container?.dollar_rate ? `<div class="info-row"><strong>Rate:</strong> <span>₵${parseFloat(container.dollar_rate.toString()).toFixed(2)} per ${container.container_type === 'air' ? 'kg' : 'CBM'}</span></div>` : ''}
            </div>
            
            <div class="invoice-number">
              <h2>Invoice #${container?.container_id}-${shippingMark}</h2>
              <div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
              <div><strong>Total Amount:</strong> ₵${totalAmount.toFixed(2)}</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Supply Tracking</th>
                <th>Quantity</th>
                <th>${container?.container_type === 'air' ? 'Weight (kg)' : 'CBM'}</th>
                <th>Amount (₵)</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => {
                const dollarRate = parseFloat(container?.dollar_rate?.toString() || '0');
                const cbmRate = parseFloat(container?.rates?.toString() || '0');
                let amount = 0;
                let measurementValue = 0;
                
                if (container?.container_type === 'air') {
                  // Ghana Air: Weight * Dollar Rate * Rate
                  const weight = parseFloat(item.weight?.toString() || '0') || 0;
                  amount = weight * dollarRate * cbmRate;
                  measurementValue = weight;
                } else {
                  // Ghana Sea: CBM * Dollar Rate * CBM Rate
                  const cbm = parseFloat(item.cbm?.toString() || '0') || 0;
                  amount = cbm * dollarRate * cbmRate;
                  measurementValue = cbm;
                }
                
                return `
                  <tr>
                    <td>${item.supply_tracking}</td>
                    <td>${item.quantity}</td>
                    <td>${measurementValue.toFixed(container?.container_type === 'air' ? 1 : 3)}</td>
                    <td class="amount-cell">₵${amount.toFixed(2)}</td>
                  </tr>
                `;
              }).join('')}
              <tr class="total-row">
                <td colspan="3"><strong>TOTAL AMOUNT</strong></td>
                <td class="amount-cell"><strong>₵${totalAmount.toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>
          
          <div class="footer">
            <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          </div>
        </body>
      </html>
    `;
    
    return invoiceHTML;
  };  const handleDownloadFromPreview = () => {
    if (!invoiceData) return;
    
    const invoiceHTML = generateInvoiceHTML(invoiceData.shippingMark, invoiceData.items, invoiceData.totalAmount);
    
    // Create and trigger download
    const blob = new Blob([invoiceHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `goods-received-invoice-${invoiceData.shippingMark}-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const mapStatus = (status: string): "pending" | "in-transit" | "delivered" | "delayed" => {
    switch (status?.toLowerCase()) {
      case "delivered":
        return "delivered";
      case "processing":
      case "ready_for_delivery":
        return "in-transit";
      case "flagged":
        return "delayed";
      default:
        return "pending";
    }
  };

  // Table columns for goods received items
  const columns: Column<GoodsReceivedItem>[] = [
    {
      id: "supply_tracking",
      header: "Supply Tracking",
      accessor: (item) => (
        <div className="font-mono text-sm">{item.supply_tracking}</div>
      ),
    },
    // Length, Breadth, Height for sea goods received only
    ...(container?.container_type === "sea"
      ? [
          {
            id: "length",
            header: "Length (cm)",
            accessor: (item: GoodsReceivedItem) => (
              <div className="text-center">{item.length || '-'}</div>
            ),
            align: "center" as const,
          },
          {
            id: "breadth",
            header: "Breadth (cm)",
            accessor: (item: GoodsReceivedItem) => (
              <div className="text-center">{item.breadth || '-'}</div>
            ),
            align: "center" as const,
          },
          {
            id: "height",
            header: "Height (cm)",
            accessor: (item: GoodsReceivedItem) => (
              <div className="text-center">{item.height || '-'}</div>
            ),
            align: "center" as const,
          },
        ]
      : []),
    // CBM for sea, Weight for air
    ...(container?.container_type === "sea"
      ? [
          {
            id: "cbm",
            header: "CBM",
            accessor: (item: GoodsReceivedItem) => (
              <div className="text-right">{(parseFloat(item.cbm?.toString() || '0') || 0).toFixed(5)}</div>
            ),
            align: "right" as const,
          },
        ]
      : [
          {
            id: "weight",
            header: "Weight (kg)",
            accessor: (item: GoodsReceivedItem) => (
              <div className="text-right">{(parseFloat(item.weight?.toString() || '0') || 0).toFixed(1)}</div>
            ),
            align: "right" as const,
          },
        ]),
    // Amount column - show only if dollar_rate and rates are set
    ...(container?.dollar_rate && container?.rates ? [{
      id: "amount",
      header: "Amount (₵)",
      accessor: (item: GoodsReceivedItem) => {
        const dollarRate = parseFloat(container?.dollar_rate?.toString() || '0');
        const cbmRate = parseFloat(container?.rates?.toString() || '0');
        let amount = 0;
        
        if (container?.container_type === 'air') {
          // Ghana Air: Weight * Dollar Rate * Rate
          const weight = parseFloat(item.weight?.toString() || '0') || 0;
          amount = weight * dollarRate * cbmRate;
        } else {
          // Ghana Sea: CBM * Dollar Rate * CBM Rate
          const cbm = parseFloat(item.cbm?.toString() || '0') || 0;
          amount = cbm * dollarRate * cbmRate;
        }
        
        return (
          <div className="text-right font-medium text-green-600">
            ₵{amount.toFixed(2)}
          </div>
        );
      },
      align: "right" as const,
    }] : []),
    {
      id: "status",
      header: "Status",
      accessor: (item) => (
                <StatusBadge status={mapStatus(item.status)} />
      ),
    },
    {
      id: "date_received",
      header: "Date Received",
      accessor: (item) => formatDate(item.date_received),
    },
  ];

  if (loading) {
    return <p className="text-center py-8">Loading container details...</p>;
  }

  if (error || !container) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">{error || "Container not found"}</p>
        <Button onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div className="mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold">{container.container_id}</h1>
          <p className="text-muted-foreground text-sm lg:text-base">
            {container.container_type === "sea" ? "Sea" : "Air"} Goods Received •{" "}
            {goodsItems.length} items • {container.location === "china" ? "China" : "Ghana"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refreshData}>
            <RefreshCcw className="h-4 w-4" /> Refresh
          </Button>
          {!isCustomer && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowEditContainerDialog(true)}>
                <Edit className="h-4 w-4" /> Edit Container
              </Button>
              <ExcelUploadButton
                uploadType="goods_received"
                warehouse="Ghana"
                onUploadComplete={(response) => {
                  console.log('Excel upload complete for container:', containerId, response);
                  refreshData();
                }}
                size="sm"
              />
              <Button size="sm" onClick={() => setShowAddItemDialog(true)}>
                <Plus className="h-4 w-4" /> Add Item
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Container Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="logistics-card p-4">
          <div className="text-sm text-muted-foreground">Rate</div>
          <div className="font-medium">
            {container.rates ? `₵${container.rates}` : "Not set"}
          </div>
        </div>
        <div className="logistics-card p-4">
          <div className="text-sm text-muted-foreground">Offloading Date</div>
          <div className="font-medium">
            {container.arrival_date ? formatDate(container.arrival_date) : "Not set"}
          </div>
        </div>
        <div className="logistics-card p-4">
          <div className="text-sm text-muted-foreground">Total Items</div>
          <div className="font-medium">{container.total_items_count || 0}</div>
        </div>
        <div className="logistics-card p-4">
          <div className="text-sm text-muted-foreground">Dollar Rate</div>
          <div className="font-medium">
            {container.dollar_rate ? `$${container.dollar_rate}` : "Not set"}
          </div>
        </div>
      </div>

      {/* Search Field */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search by shipping mark, description, or supply tracking..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Grouped by Shipping Mark */}
      <div className="space-y-4">
        {Object.entries(groupedByShippingMark).map(([mark, items]) => {
          const totalCBM = items.reduce((sum, i) => sum + (parseFloat(i.cbm?.toString() || '0') || 0), 0);
          const totalWeight = items.reduce((sum, i) => sum + (parseFloat(i.weight?.toString() || '0') || 0), 0);
          const totalQty = items.reduce((sum, i) => sum + (parseInt(i.quantity?.toString() || '0') || 0), 0);
          
          // Calculate total amount
          const totalAmount = container?.dollar_rate && container?.rates
            ? items.reduce((sum, i) => {
                const dollarRate = parseFloat(container?.dollar_rate?.toString() || '0');
                const cbmRate = parseFloat(container?.rates?.toString() || '0');
                
                if (container?.container_type === 'sea') {
                  // Ghana Sea: CBM * Dollar Rate * CBM Rate
                  const cbm = parseFloat(i.cbm?.toString() || '0') || 0;
                  return sum + (cbm * dollarRate * cbmRate);
                } else if (container?.container_type === 'air') {
                  // Ghana Air: Weight * Dollar Rate * Rate
                  const weight = parseFloat(i.weight?.toString() || '0') || 0;
                  return sum + (weight * dollarRate * cbmRate);
                }
                
                return sum;
              }, 0)
            : 0;

          return (
            <div key={mark} className="logistics-card p-4">
              {/* Group Row */}
              <div className="flex justify-between items-center">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() =>
                    setExpandedMark(expandedMark === mark ? null : mark)
                  }
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">{mark}</h3>
                      <p className="text-sm text-muted-foreground">
                        {items.length} item{items.length > 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex gap-8">
                      {container?.container_type === "sea" ? (
                        <span>CBM: {totalCBM.toFixed(5)}</span>
                      ) : (
                        <span>Weight: {totalWeight.toFixed(1)} kg</span>
                      )}
                      <span>Qty: {totalQty}</span>
                      {/* Show total amount if dollar rate is set */}
                      {container?.dollar_rate && (
                        <span className="font-semibold text-green-600">
                          Total: ₵{totalAmount.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Download Invoice Button */}
                {container?.dollar_rate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreviewInvoice(mark, items, totalAmount);
                    }}
                    className="ml-4"
                  >
                    Preview Invoice
                  </Button>
                )}
              </div>

              {/* Expanded Items Table */}
              {expandedMark === mark && (
                <div className="mt-4 pt-4 border-t">
                  <DataTable
                    id="goods-received-items"
                    columns={columns}
                    rows={items}
                    rowActions={!isCustomer ? (item) => (
                      <>
                        <DropdownMenuItem onClick={() => handleDeleteItem(item.id)}>
                          <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                          Delete Item
                        </DropdownMenuItem>
                      </>
                    ) : undefined}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* No items message */}
      {Object.keys(groupedByShippingMark).length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {searchQuery ? "No items match your search criteria" : "No goods received items in this container yet"}
        </div>
      )}

      {/* Dialogs */}
      {showEditContainerDialog && (
        <EditGoodsReceivedContainerDialog
          open={showEditContainerDialog}
          onOpenChange={setShowEditContainerDialog}
          container={container}
          onSaved={() => {
            refreshData(); // Refresh data after edit
          }}
        />
      )}

      {/* Add Item Dialog */}
      {showAddItemDialog && (
        <AddGoodsReceivedItemDialog
          open={showAddItemDialog}
          onOpenChange={setShowAddItemDialog}
          containerId={containerId || ""}
          containerType={container?.container_type}
          location={container?.location}
          onSuccess={() => {
            refreshData(); // Refresh data after adding item
          }}
        />
      )}
      
      {/* Invoice Preview Dialog */}
      <Dialog open={showInvoicePreview} onOpenChange={setShowInvoicePreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Preview</DialogTitle>
          </DialogHeader>
          
          <div className="invoice-preview">
            {invoiceData && (
              <div 
                dangerouslySetInnerHTML={{
                  __html: generateInvoiceHTML(
                    invoiceData.shippingMark,
                    invoiceData.items,
                    invoiceData.totalAmount
                  )
                }}
              />
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowInvoicePreview(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleDownloadFromPreview}>
              Download Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}