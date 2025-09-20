import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Plus,
  Ship,
  Plane,
  DollarSign,
  AlertCircle,
  Loader2,
  Edit,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import {
  ratesService,
  Rate,
  CreateRateRequest,
  RateStats,
} from "@/services/ratesService";

const ShippingRates = () => {
  const [selectedCategory, setSelectedCategory] = useState<
    "SEA_RATES" | "AIR_RATES"
  >("SEA_RATES");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [rates, setRates] = useState<Rate[]>([]);
  const [stats, setStats] = useState<RateStats | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState<CreateRateRequest>({
    category: "NORMAL_GOODS",
    rate_type: "SEA_RATES",
    title: "",
    description: "",
    origin_country: "",
    destination_country: "",
    office_name: "",
    amount: 0,
  });

  // Fetch rates data
  const fetchRates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [ratesResponse, statsResponse] = await Promise.all([
        ratesService.getRates({
          rate_type: selectedCategory,
          search: searchQuery || undefined,
          ordering: "-created_at",
        }),
        ratesService.getRateStats({ rate_type: selectedCategory }),
      ]);

      if (ratesResponse.success && ratesResponse.data) {
        setRates(ratesResponse.data.results || []);
      } else {
        throw new Error(ratesResponse.message || "Failed to fetch rates");
      }

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load rates");
      toast({
        title: "Error",
        description: "Failed to load shipping rates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery, toast]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.title ||
      !formData.origin_country ||
      !formData.destination_country ||
      !formData.office_name ||
      formData.amount <= 0
    ) {
      toast({
        title: "Error",
        description: "Please fill in all required fields with valid values",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      const response = await ratesService.createRate({
        ...formData,
        rate_type: selectedCategory,
      });

      if (response.success) {
        toast({
          title: "Success",
          description: `Rate "${formData.title}" created successfully`,
        });

        // Reset form
        setFormData({
          category: "NORMAL_GOODS",
          rate_type: selectedCategory,
          title: "",
          description: "",
          origin_country: "",
          destination_country: "",
          office_name: "",
          amount: 0,
        });

        setShowAddForm(false);
        fetchRates(); // Refresh the list
      } else {
        throw new Error(response.message || "Failed to create rate");
      }
    } catch (error) {
      console.error("Error creating rate:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create rate",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle create rate
  const handleCreateRate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setCreating(true);
      const response = await ratesService.createRate(formData);

      if (response.success) {
        toast({
          title: "Success",
          description: "Rate created successfully",
        });

        // Reset form
        setFormData({
          category: "NORMAL_GOODS",
          rate_type: "SEA_RATES",
          title: "",
          description: "",
          origin_country: "",
          destination_country: "",
          office_name: "",
          amount: 0,
        });

        setShowAddForm(false);
        fetchRates();
      } else {
        throw new Error(response.message || "Failed to create rate");
      }
    } catch (error) {
      console.error("Error creating rate:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create rate",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  // Handle rate deletion
  const handleDeleteRate = async (rateId: number, title: string) => {
    if (
      !confirm(
        `Are you sure you want to delete the rate "${title}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await ratesService.deleteRate(rateId);

      if (response.success) {
        toast({
          title: "Success",
          description: `Rate "${title}" deleted successfully`,
        });
        fetchRates(); // Refresh the list
      } else {
        throw new Error(response.message || "Failed to delete rate");
      }
    } catch (error) {
      console.error("Error deleting rate:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete rate",
        variant: "destructive",
      });
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "NORMAL_GOODS":
        return "bg-blue-100 text-blue-800";
      case "SPECIAL_GOODS":
        return "bg-purple-100 text-purple-800";
      case "SMALL_GOODS":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar */}
      <div className="w-80 border-r bg-card p-6 space-y-6 overflow-y-auto">
        {/* Shipping Rates Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Ship className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Shipping Rates</h3>
            {stats && (
              <Badge variant="secondary" className="text-xs">
                {stats.total}
              </Badge>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search rates..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Button
            className="w-full border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary"
            variant="outline"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Rate
          </Button>
        </div>

        {/* Category Selection */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
            Rate Type
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={selectedCategory === "SEA_RATES" ? "default" : "outline"}
              size="sm"
              className="flex items-center gap-2"
              onClick={() => setSelectedCategory("SEA_RATES")}
            >
              <Ship className="h-4 w-4" />
              Sea
            </Button>
            <Button
              variant={selectedCategory === "AIR_RATES" ? "default" : "outline"}
              size="sm"
              className="flex items-center gap-2"
              onClick={() => setSelectedCategory("AIR_RATES")}
            >
              <Plane className="h-4 w-4" />
              Air
            </Button>
          </div>
        </div>

        {/* Stats Summary */}
        {stats && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
              Statistics
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Rates:</span>
                <span className="font-medium">{stats.total}</span>
              </div>
              {stats.amount.min !== null && (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Min Amount:</span>
                    <span className="font-medium">${stats.amount.min}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Max Amount:</span>
                    <span className="font-medium">${stats.amount.max}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Avg Amount:</span>
                    <span className="font-medium">
                      ${Math.round(stats.amount.avg)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Current Rates List */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {selectedCategory === "SEA_RATES" ? (
              <Ship className="h-4 w-4 text-blue-600" />
            ) : (
              <Plane className="h-4 w-4 text-green-600" />
            )}
            <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
              {selectedCategory === "SEA_RATES" ? "Sea Rates" : "Air Rates"}
            </h4>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : rates.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">No rates found</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {rates.slice(0, 10).map((rate) => (
                <div
                  key={rate.id}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {selectedCategory === "SEA_RATES" ? (
                        <Ship className="h-3 w-3 text-blue-600 flex-shrink-0" />
                      ) : (
                        <Plane className="h-3 w-3 text-green-600 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">
                          {rate.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {rate.category_display}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {rate.route}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">${rate.amount}</span>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleDeleteRate(rate.id, rate.title)}
                      >
                        <Trash2 className="h-3 w-3 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {rates.length > 10 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  ... and {rates.length - 10} more
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-auto">
        {showAddForm ? (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <ArrowLeft
                className="h-5 w-5 cursor-pointer"
                onClick={() => setShowAddForm(false)}
              />
              <h2 className="text-2xl font-bold">Add New Shipping Rate</h2>
            </div>

            <form onSubmit={handleCreateRate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="title" className="text-sm font-medium">
                    Rate Title
                  </Label>
                  <Input
                    id="title"
                    type="text"
                    placeholder="e.g., Sea Regular Rate"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="amount" className="text-sm font-medium">
                    Amount ($)
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="rate_type" className="text-sm font-medium">
                    Rate Type
                  </Label>
                  <select
                    id="rate_type"
                    title="Select rate type"
                    className="w-full p-2 border border-border rounded-md"
                    value={formData.rate_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rate_type: e.target.value as "SEA_RATES" | "AIR_RATES",
                      })
                    }
                    required
                  >
                    <option value="">Select Rate Type</option>
                    <option value="SEA_RATES">Sea Rates</option>
                    <option value="AIR_RATES">Air Rates</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="category" className="text-sm font-medium">
                    Category
                  </Label>
                  <select
                    id="category"
                    title="Select goods category"
                    className="w-full p-2 border border-border rounded-md"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value as
                          | "NORMAL_GOODS"
                          | "SPECIAL_GOODS"
                          | "SMALL_GOODS",
                      })
                    }
                    required
                  >
                    <option value="">Select Category</option>
                    <option value="NORMAL_GOODS">Normal Goods</option>
                    <option value="SPECIAL_GOODS">Special Goods</option>
                    <option value="SMALL_GOODS">Small Goods</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="origin" className="text-sm font-medium">
                    Origin
                  </Label>
                  <Input
                    id="origin"
                    type="text"
                    placeholder="e.g., China"
                    value={formData.origin_country}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        origin_country: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="destination" className="text-sm font-medium">
                    Destination
                  </Label>
                  <Input
                    id="destination"
                    type="text"
                    placeholder="e.g., Ghana"
                    value={formData.destination_country}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        destination_country: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="office" className="text-sm font-medium">
                    Office
                  </Label>
                  <Input
                    id="office"
                    type="text"
                    placeholder="e.g., Tema Office"
                    value={formData.office_name}
                    onChange={(e) =>
                      setFormData({ ...formData, office_name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Description (Optional)
                  </Label>
                  <textarea
                    id="description"
                    className="w-full p-2 border border-border rounded-md min-h-[80px]"
                    placeholder="Additional details about this rate..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    "Create Rate"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  Shipping Rates Management
                </h2>
                <p className="text-muted-foreground">
                  Manage your shipping rates for sea and air cargo
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Rate
                </Button>
              </div>
            </div>

            {/* Rates Table */}
            <div className="bg-card rounded-lg border">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">
                    {selectedCategory === "SEA_RATES"
                      ? "Sea Rates"
                      : "Air Rates"}
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search rates..."
                        className="pl-10 w-64"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                {loading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading rates...</span>
                  </div>
                ) : rates.length === 0 ? (
                  <div className="text-center p-8">
                    <Ship className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">No rates found</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchQuery
                        ? "No rates match your search criteria."
                        : "Get started by adding your first shipping rate."}
                    </p>
                    <Button onClick={() => setShowAddForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Rate
                    </Button>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-4 font-medium">
                          Rate Details
                        </th>
                        <th className="text-left p-4 font-medium">Route</th>
                        <th className="text-left p-4 font-medium">Category</th>
                        <th className="text-left p-4 font-medium">Office</th>
                        <th className="text-right p-4 font-medium">Amount</th>
                        <th className="text-center p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rates.map((rate) => (
                        <tr
                          key={rate.id}
                          className="border-b hover:bg-muted/30"
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {rate.rate_type === "SEA_RATES" ? (
                                <Ship className="h-4 w-4 text-blue-600" />
                              ) : (
                                <Plane className="h-4 w-4 text-green-600" />
                              )}
                              <div>
                                <p className="font-medium">{rate.title}</p>
                                {rate.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {rate.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <p className="text-sm">{rate.route}</p>
                          </td>
                          <td className="p-4">
                            <Badge variant="secondary" className="text-xs">
                              {rate.category_display}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <p className="text-sm">{rate.office_name}</p>
                          </td>
                          <td className="p-4 text-right">
                            <span className="font-medium">${rate.amount}</span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleDeleteRate(rate.id, rate.title)
                                }
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShippingRates;
