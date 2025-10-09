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
  Eye,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  goodsReceivedContainerService,
  GoodsReceivedContainer,
  GoodsReceivedItem,
} from "@/services/goodsReceivedContainerService";
import { EditGoodsReceivedContainerDialog } from "@/components/dialogs/EditGoodsReceivedContainerDialog";
import { AddGoodsReceivedItemDialog } from "@/components/dialogs/AddGoodsReceivedItemDialog";
import { EditGoodsReceivedItemDialog } from "@/components/dialogs/EditGoodsReceivedItemDialog";
import { AddShippingMarkGroupDialog } from "@/components/dialogs/AddShippingMarkGroupDialog";
import { ViewShippingMarkGroupDialog } from "@/components/dialogs/ViewShippingMarkGroupDialog";
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
  const [showAddShippingMarkGroupDialog, setShowAddShippingMarkGroupDialog] = useState(false);
  const [showEditContainerDialog, setShowEditContainerDialog] = useState(false);
  const [showEditItemDialog, setShowEditItemDialog] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<GoodsReceivedItem | null>(null);
  const [showViewGroupDialog, setShowViewGroupDialog] = useState(false);
  const [viewGroupData, setViewGroupData] = useState<{shippingMark: string, items: GoodsReceivedItem[]} | null>(null);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [previewInvoiceData, setPreviewInvoiceData] = useState<{shippingMark: string, items: GoodsReceivedItem[], totalAmount: number, invoiceNumber: string} | null>(null);
  
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

  const handleEditItem = (item: GoodsReceivedItem) => {
    setItemToEdit(item);
    setShowEditItemDialog(true);
  };

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
    // Generate invoice number
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const invoiceNumber = `PM${dateStr}${randomNum}`;
    
    // Set preview data and show dialog
    setPreviewInvoiceData({ shippingMark, items, totalAmount, invoiceNumber });
    setShowInvoicePreview(true);
  };

  const handleDownloadPDF = () => {
    if (!previewInvoiceData) return;
    
    generateInvoicePDF(
      previewInvoiceData.shippingMark,
      previewInvoiceData.items,
      previewInvoiceData.totalAmount,
      previewInvoiceData.invoiceNumber
    );
  };

  const generateInvoicePDF = async (shippingMark: string, items: GoodsReceivedItem[], totalAmount: number, invoiceNumber: string) => {
    try {
      // Calculate totals
      const totalQty = items.reduce((sum, item) => sum + (parseInt(item.quantity?.toString() || '0') || 0), 0);
      const totalCBM = items.reduce((sum, item) => sum + (parseFloat(item.cbm?.toString() || '0') || 0), 0);
      const totalWeight = items.reduce((sum, item) => sum + (parseFloat(item.weight?.toString() || '0') || 0), 0);
      
      // Create PDF
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      
      // Load logo and add to PDF
      const loadLogo = (): Promise<boolean> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            try {
              // Add logo at the top center
              const imgWidth = 50;
              const imgHeight = 25;
              pdf.addImage(img, 'PNG', (pageWidth - imgWidth) / 2, 10, imgWidth, imgHeight);
              console.log('Logo added successfully');
              resolve(true);
            } catch (error) {
              console.error('Error adding logo:', error);
              resolve(false);
            }
          };
          img.onerror = (error) => {
            console.error('Failed to load logo:', error);
            resolve(false);
          };
          // Use the actual path from public folder
          img.src = '/primepre-logo-1.png';
        });
      };
      
      // Try loading logo
      const logoLoaded = await loadLogo();
      
      if (!logoLoaded) {
        console.log('Logo failed to load, generating PDF without logo');
      }
    
    // Header
    const startY = logoLoaded ? 45 : 20;
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('GOODS RECEIVED INVOICE', pageWidth / 2, startY, { align: 'center' });
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('PrimePre Logistics System', pageWidth / 2, startY + 7, { align: 'center' });
    
    // Invoice details - Left side
    let yPos = startY + 20;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Container ID:', 14, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(container?.container_id || '', 50, yPos);
    
    yPos += 6;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Shipping Mark:', 14, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(shippingMark, 50, yPos);
    
    yPos += 6;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Container Type:', 14, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(container?.container_type?.toUpperCase() || '', 50, yPos);
    
    yPos += 6;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Offloading Date:', 14, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(container?.arrival_date ? new Date(container.arrival_date).toLocaleDateString() : 'N/A', 50, yPos);
    
    // Invoice details - Right side
    yPos = startY + 20;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Invoice #${invoiceNumber}`, pageWidth - 14, yPos, { align: 'right' });
    
    yPos += 8;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Date:', pageWidth - 60, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(new Date().toLocaleDateString(), pageWidth - 14, yPos, { align: 'right' });
    
    yPos += 6;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Total Amount:', pageWidth - 60, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`GHS ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - 14, yPos, { align: 'right' });
    
    // Prepare table data
      const tableData = items.map(item => {
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
        
        return [
          item.supply_tracking,
          item.quantity?.toString() || '0',
          measurementValue.toFixed(container?.container_type === 'air' ? 1 : 3),
          `GHS ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ];
      });
      
      // Add totals row
      tableData.push([
        'TOTAL',
        totalQty.toString(),
        (container?.container_type === 'air' ? totalWeight.toFixed(1) : totalCBM.toFixed(3)),
        `GHS ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]);
      
      // Generate table
      autoTable(pdf, {
        startY: 95,
        head: [[
          'Supply Tracking',
          'Quantity',
          container?.container_type === 'air' ? 'Weight (kg)' : 'CBM',
          'Amount (GHS)'
        ]],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: {
          fontSize: 8
        },
        columnStyles: {
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'right', fontStyle: 'bold' }
        },
        didParseCell: (data) => {
          // Style the last row (totals) differently
          if (data.row.index === tableData.length - 1) {
            data.cell.styles.fillColor = [240, 240, 240];
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.lineWidth = 0.5;
            data.cell.styles.lineColor = [0, 0, 0];
          }
        },
        margin: { left: 14, right: 14 }
      });
      
      // Footer
      const finalY = (pdf as any).lastAutoTable.finalY || 200;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      const footerText = `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`;
      pdf.text(footerText, pageWidth / 2, finalY + 15, { align: 'center' });
      
      // Save PDF
      pdf.save(`invoice-${invoiceNumber}-${shippingMark}.pdf`);
      
      toast({
        title: "Invoice Downloaded",
        description: "PDF invoice has been downloaded successfully",
      });
      
      // Close preview dialog
      setShowInvoicePreview(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF invoice",
        variant: "destructive",
      });
    }
  };

  const handleViewGroup = (shippingMark: string, items: GoodsReceivedItem[]) => {
    setViewGroupData({ shippingMark, items });
    setShowViewGroupDialog(true);
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
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Back Button */}
      <div className="mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3">
          <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Back
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col space-y-3 sm:space-y-4">
        <div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold">{container.container_id}</h1>
          <p className="text-muted-foreground text-xs sm:text-sm lg:text-base">
            {container.container_type === "sea" ? "Sea" : "Air"} Goods Received •{" "}
            {goodsItems.length} items • {container.location === "china" ? "China" : "Ghana"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={refreshData} className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3">
            <RefreshCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Refresh
          </Button>
          {!isCustomer && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowEditContainerDialog(true)} className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3">
                <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Edit
              </Button>
              <ExcelUploadButton
                uploadType="goods_received"
                warehouse="Ghana"
                onUploadComplete={(response) => {
                  console.log('Excel upload complete for container:', containerId, response);
                  refreshData();
                }}
                size="sm"
                className="h-8 sm:h-9 text-xs sm:text-sm"
              />
              <Button size="sm" onClick={() => setShowAddShippingMarkGroupDialog(true)} className="bg-primary h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3">
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Add Group
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowAddItemDialog(true)} className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3">
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Add Item
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Container Info Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        <div className="logistics-card p-3 sm:p-4">
          <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Rate</div>
          <div className="font-medium text-sm sm:text-base">
            {container.rates ? `₵${container.rates}` : "Not set"}
          </div>
        </div>
        <div className="logistics-card p-3 sm:p-4">
          <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Offloading Date</div>
          <div className="font-medium text-sm sm:text-base">
            {container.arrival_date ? formatDate(container.arrival_date) : "Not set"}
          </div>
        </div>
        <div className="logistics-card p-3 sm:p-4">
          <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Total Items</div>
          <div className="font-medium text-sm sm:text-base">{container.total_items_count || 0}</div>
        </div>
        <div className="logistics-card p-3 sm:p-4">
          <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Dollar Rate</div>
          <div className="font-medium text-sm sm:text-base">
            {container.dollar_rate ? `$${container.dollar_rate}` : "Not set"}
          </div>
        </div>
      </div>

      {/* Search Field */}
      <div className="mb-4 sm:mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <Input
            type="text"
            placeholder="Search by shipping mark, description, or supply tracking..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 sm:pl-10 h-9 sm:h-10 text-xs sm:text-sm"
          />
        </div>
      </div>

      {/* Grouped by Shipping Mark */}
      <div className="space-y-3 sm:space-y-4">
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
            <div key={mark} className="logistics-card p-3 sm:p-4">
              {/* Group Row */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() =>
                    setExpandedMark(expandedMark === mark ? null : mark)
                  }
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <div>
                      <h3 className="font-semibold text-sm sm:text-base">{mark}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {items.length} item{items.length > 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3 sm:gap-6 text-xs sm:text-sm">
                      {container?.container_type === "sea" ? (
                        <span>CBM: <span className="font-medium">{totalCBM.toFixed(5)}</span></span>
                      ) : (
                        <span>Weight: <span className="font-medium">{totalWeight.toFixed(1)} kg</span></span>
                      )}
                      <span>Qty: <span className="font-medium">{totalQty}</span></span>
                      {/* Show total amount if dollar rate is set */}
                      {container?.dollar_rate && (
                        <span className="font-semibold text-green-600">
                          Total: ₵{totalAmount.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2 flex-wrap sm:flex-nowrap ml-0 sm:ml-4">
                  {/* View Group Button - Available to all users */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewGroup(mark, items);
                    }}
                    className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3"
                  >
                    <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    View
                  </Button>
                  
                  {/* Download Invoice Button - Only when dollar rate is set */}
                  {container?.dollar_rate && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreviewInvoice(mark, items, totalAmount);
                      }}
                      className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3"
                    >
                      Download PDF
                    </Button>
                  )}
                </div>
              </div>

              {/* Expanded Items Table */}
              {expandedMark === mark && (
                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t overflow-x-auto">
                  <DataTable
                    id="goods-received-items"
                    columns={columns}
                    rows={items}
                    rowActions={!isCustomer ? (item) => (
                      <>
                        <DropdownMenuItem onClick={() => handleEditItem(item)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Item
                        </DropdownMenuItem>
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
        <div className="text-center py-6 sm:py-8 text-muted-foreground text-xs sm:text-sm">
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

      {/* Add Shipping Mark Group Dialog */}
      {showAddShippingMarkGroupDialog && (
        <AddShippingMarkGroupDialog
          open={showAddShippingMarkGroupDialog}
          onOpenChange={setShowAddShippingMarkGroupDialog}
          containerId={containerId || ""}
          containerType={container?.container_type}
          location={container?.location}
          onSuccess={() => {
            refreshData(); // Refresh data after adding items
          }}
        />
      )}

      {/* Edit Item Dialog */}
      {showEditItemDialog && itemToEdit && (
        <EditGoodsReceivedItemDialog
          open={showEditItemDialog}
          onOpenChange={(open) => {
            setShowEditItemDialog(open);
            if (!open) setItemToEdit(null);
          }}
          item={itemToEdit}
          containerType={container?.container_type}
          location={container?.location}
          onSuccess={() => {
            refreshData(); // Refresh data after editing item
          }}
        />
      )}

      {/* View Shipping Mark Group Dialog */}
      {showViewGroupDialog && viewGroupData && (
        <ViewShippingMarkGroupDialog
          open={showViewGroupDialog}
          onOpenChange={setShowViewGroupDialog}
          shippingMark={viewGroupData.shippingMark}
          items={viewGroupData.items}
          containerType={container?.container_type || 'sea'}
        />
      )}

      {/* Invoice Preview Dialog */}
      {showInvoicePreview && previewInvoiceData && (
        <Dialog open={showInvoicePreview} onOpenChange={setShowInvoicePreview}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>Invoice Preview</DialogTitle>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleDownloadPDF}
                  className="ml-4"
                >
                  Download PDF
                </Button>
              </div>
            </DialogHeader>
            
            <div className="bg-white p-8 rounded-lg border">
              {/* Logo */}
              <div className="flex justify-center mb-6">
                <img 
                  src="/primepre-logo-1.png" 
                  alt="PrimePre Logo" 
                  className="h-20 w-auto object-contain"
                  onError={(e) => {
                    console.error('Logo failed to load in preview');
                    e.currentTarget.style.display = 'none';
                  }}
                  onLoad={() => {
                    console.log('Logo loaded successfully in preview');
                  }}
                />
              </div>

              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">GOODS RECEIVED INVOICE</h1>
                <p className="text-gray-600">PrimePre Logistics System</p>
              </div>

              {/* Invoice Details Grid */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                {/* Left Side */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">Container ID:</span>
                    <span>{container?.container_id}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">Shipping Mark:</span>
                    <span>{previewInvoiceData.shippingMark}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">Container Type:</span>
                    <span>{container?.container_type?.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">Offloading Date:</span>
                    <span>{container?.arrival_date ? new Date(container.arrival_date).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>

                {/* Right Side */}
                <div className="text-right space-y-2">
                  <h2 className="text-lg font-bold">Invoice #{previewInvoiceData.invoiceNumber}</h2>
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">Date:</span>
                    <span>{new Date().toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">Total Amount:</span>
                    <span className="text-lg font-bold text-green-600">
                      GH₵ {previewInvoiceData.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Supply Tracking</th>
                      <th className="border border-gray-300 px-4 py-2 text-right font-semibold">Quantity</th>
                      <th className="border border-gray-300 px-4 py-2 text-right font-semibold">
                        {container?.container_type === 'air' ? 'Weight (kg)' : 'CBM'}
                      </th>
                      <th className="border border-gray-300 px-4 py-2 text-right font-semibold">Amount (GH₵)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewInvoiceData.items.map((item, index) => {
                      const dollarRate = parseFloat(container?.dollar_rate?.toString() || '0');
                      const cbmRate = parseFloat(container?.rates?.toString() || '0');
                      let amount = 0;
                      let measurementValue = 0;
                      
                      if (container?.container_type === 'air') {
                        const weight = parseFloat(item.weight?.toString() || '0') || 0;
                        amount = weight * dollarRate * cbmRate;
                        measurementValue = weight;
                      } else {
                        const cbm = parseFloat(item.cbm?.toString() || '0') || 0;
                        amount = cbm * dollarRate * cbmRate;
                        measurementValue = cbm;
                      }

                      return (
                        <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                          <td className="border border-gray-300 px-4 py-2">{item.supply_tracking}</td>
                          <td className="border border-gray-300 px-4 py-2 text-right">{item.quantity}</td>
                          <td className="border border-gray-300 px-4 py-2 text-right">
                            {measurementValue.toFixed(container?.container_type === 'air' ? 1 : 3)}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-right font-medium">
                            GH₵ {amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Total Row */}
                    <tr className="bg-gray-100 font-bold">
                      <td className="border border-gray-300 px-4 py-3">TOTAL</td>
                      <td className="border border-gray-300 px-4 py-3 text-right">
                        {previewInvoiceData.items.reduce((sum, item) => sum + (parseInt(item.quantity?.toString() || '0') || 0), 0)}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right">
                        {container?.container_type === 'air'
                          ? previewInvoiceData.items.reduce((sum, item) => sum + (parseFloat(item.weight?.toString() || '0') || 0), 0).toFixed(1)
                          : previewInvoiceData.items.reduce((sum, item) => sum + (parseFloat(item.cbm?.toString() || '0') || 0), 0).toFixed(3)
                        }
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right text-green-600">
                        GH₵ {previewInvoiceData.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="mt-8 text-center text-sm text-gray-500">
                Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}