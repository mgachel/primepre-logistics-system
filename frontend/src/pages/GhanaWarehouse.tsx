import { useState } from "react";
import { Package, Search, Filter, Upload, Plus, Download } from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { NewGoodsDialog } from "@/components/dialogs/NewGoodsDialog";

export default function GhanaWarehouse() {
  const [showNewGoodsDialog, setShowNewGoodsDialog] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Ghana Warehouse</h1>
          <p className="text-muted-foreground">Manage goods available in Ghana warehouses</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.xlsx,.xls,.csv';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) {
                console.log('Uploading Ghana warehouse file:', file.name);
              }
            };
            input.click();
          }}>
            <Upload className="h-4 w-4" />
            Import Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            const csvContent = "Product,SKU,Category,Quantity,Status\nSample Product,SKU001,Electronics,100,Available";
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ghana-warehouse-data.csv';
            a.click();
            window.URL.revokeObjectURL(url);
          }}>
            <Download className="h-4 w-4" />
            Export Data
          </Button>
          <Button size="sm" onClick={() => setShowNewGoodsDialog(true)}>
            <Plus className="h-4 w-4" />
            Add Goods
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Total Items"
          value="0"
          icon={Package}
          className="border-primary/20 bg-primary/5"
        />
        <MetricCard
          title="Available Stock"
          value="0"
          className="border-green-500/20 bg-green-500/5"
        />
        <MetricCard
          title="Reserved Items"
          value="0"
          className="border-yellow-500/20 bg-yellow-500/5"
        />
        <MetricCard
          title="Low Stock Alert"
          value="0"
          className="border-destructive/20 bg-destructive/5"
        />
      </div>

      {/* Goods Management Section */}
      <div className="logistics-card p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Ghana Warehouse Inventory</h3>
            <p className="text-muted-foreground">Track and manage all goods available in Ghana warehouses</p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by product name, SKU, or category" 
                className="pl-10"
              />
            </div>
            <Select>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
                <SelectItem value="low-stock">Low Stock</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Category..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="electronics">Electronics</SelectItem>
                <SelectItem value="clothing">Clothing</SelectItem>
                <SelectItem value="home">Home & Garden</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input 
                      type="checkbox" 
                      className="rounded"
                      aria-label="Select all warehouse items"
                      title="Select all warehouse items"
                    />
                  </TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead>Warehouse Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No goods data available. Start by importing from Excel or adding items manually.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <NewGoodsDialog 
        open={showNewGoodsDialog} 
        onOpenChange={setShowNewGoodsDialog}
        warehouse="ghana"
      />
    </div>
  );
}