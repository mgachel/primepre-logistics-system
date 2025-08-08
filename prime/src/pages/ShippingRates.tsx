import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, Ship, Plane, DollarSign } from "lucide-react";

const ShippingRates = () => {
  const [selectedCategory, setSelectedCategory] = useState("sea");
  const [selectedGoods, setSelectedGoods] = useState<string[]>([]);

  const handleGoodsToggle = (goodsType: string) => {
    setSelectedGoods(prev => 
      prev.includes(goodsType) 
        ? prev.filter(type => type !== goodsType)
        : [...prev, goodsType]
    );
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar */}
      <div className="w-80 border-r bg-card p-6 space-y-6">
        {/* Shipping Rates Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Ship className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Shipping Rates</h3>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search rates..." 
              className="pl-10"
            />
          </div>

          <div className="border-2 border-dashed border-primary/30 rounded-lg p-4 text-center space-y-2 bg-primary/5">
            <Plus className="h-5 w-5 text-primary mx-auto" />
            <div>
              <p className="font-medium text-primary">Add New Rate</p>
              <p className="text-sm text-muted-foreground">Create a shipping rate</p>
            </div>
          </div>
        </div>

        {/* Exchange Rates */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">Exchange Rates</h4>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-md">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-green-100 flex items-center justify-center">
                  <DollarSign className="h-3 w-3 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">USD</p>
                  <p className="text-xs text-muted-foreground">China → Ghana</p>
                </div>
              </div>
              <span className="font-medium">$12.5</span>
            </div>
          </div>
        </div>

        {/* Sea Rates */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Ship className="h-4 w-4 text-blue-600" />
            <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">Sea Rates</h4>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-md">
              <div className="flex items-center gap-2">
                <Ship className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="font-medium text-sm">Sea Regular Rate</p>
                  <p className="text-xs text-muted-foreground">HEAVY EQUIPMENTS, LIQUIDS</p>
                  <p className="text-xs text-muted-foreground">China → Ghana</p>
                </div>
              </div>
              <span className="font-medium">$260</span>
            </div>
            
            <div className="flex items-center justify-between p-2 rounded-md">
              <div className="flex items-center gap-2">
                <Ship className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="font-medium text-sm">Sea Special</p>
                  <p className="text-xs text-muted-foreground">HEAVY EQUIPMENT, LIQU...</p>
                  <p className="text-xs text-muted-foreground">China → Ghana</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">Special</Badge>
                <span className="font-medium">$300</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-background to-primary/5 p-8 border-b">
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2">Shipping Rates</h1>
            <p className="text-muted-foreground">Add and update shipping rates</p>
          </div>
          <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-primary/20 to-transparent transform skew-x-12 origin-top-right"></div>
        </div>

        {/* Form Content */}
        <div className="p-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add New Rate
              </CardTitle>
              <p className="text-sm text-muted-foreground">Create a new shipping rate by filling out the form below</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Rate Category */}
              <div className="space-y-3">
                <h3 className="font-medium">Rate Category</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant={selectedCategory === "sea" ? "default" : "outline"}
                    className="h-16 flex-col gap-2"
                    onClick={() => setSelectedCategory("sea")}
                  >
                    <Ship className="h-5 w-5" />
                    Sea Shipping
                  </Button>
                  <Button
                    variant={selectedCategory === "air" ? "default" : "outline"}
                    className="h-16 flex-col gap-2"
                    onClick={() => setSelectedCategory("air")}
                  >
                    <Plane className="h-5 w-5" />
                    Air Shipping
                  </Button>
                </div>
              </div>

              {/* Goods Type */}
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="normal"
                        checked={selectedGoods.includes("normal")}
                        onCheckedChange={() => handleGoodsToggle("normal")}
                      />
                      <label htmlFor="normal" className="font-medium">Normal Goods</label>
                    </div>
                    <p className="text-sm text-muted-foreground">Standard sea shipping</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="special"
                        checked={selectedGoods.includes("special")}
                        onCheckedChange={() => handleGoodsToggle("special")}
                      />
                      <label htmlFor="special" className="font-medium">Special Goods</label>
                    </div>
                    <p className="text-sm text-muted-foreground">Fragile or special items</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="small"
                        checked={selectedGoods.includes("small")}
                        onCheckedChange={() => handleGoodsToggle("small")}
                      />
                      <label htmlFor="small" className="font-medium">Small Goods</label>
                    </div>
                    <p className="text-sm text-muted-foreground">Compact items</p>
                  </div>
                </div>
              </div>

              {/* Rate Details */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rate Title *</label>
                  <Input placeholder="Enter rate title" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea placeholder="Optional description" className="resize-none" />
                </div>
              </div>

              {/* Country Selection */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">From Country</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select origin country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="china">China</SelectItem>
                      <SelectItem value="usa">United States</SelectItem>
                      <SelectItem value="uk">United Kingdom</SelectItem>
                      <SelectItem value="germany">Germany</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">To Country</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ghana">Ghana</SelectItem>
                      <SelectItem value="nigeria">Nigeria</SelectItem>
                      <SelectItem value="kenya">Kenya</SelectItem>
                      <SelectItem value="south-africa">South Africa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* For Offices */}
              <div className="space-y-2">
                <label className="text-sm font-medium">For Offices</label>
                <div className="text-sm text-muted-foreground">Configure office-specific settings for this rate</div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-6">
                <Button variant="outline">Cancel</Button>
                <Button>Create Rate</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ShippingRates;