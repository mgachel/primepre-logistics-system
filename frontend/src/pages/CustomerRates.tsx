import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Ship,
  Plane,
  DollarSign,
  AlertCircle,
  Loader2,
  Calculator,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import {
  ratesService,
  Rate,
  RateStats,
} from "@/services/ratesService";

const CustomerRates: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<
    "SEA_RATES" | "AIR_RATES" | "ALL"
  >("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [rates, setRates] = useState<Rate[]>([]);
  const [stats, setStats] = useState<RateStats | null>(null);
  const { toast } = useToast();
  const { user } = useAuthStore();
  const isCustomer = user?.user_role === 'CUSTOMER' || user?.is_admin_user === false;

  // Admin green used on admin-only accents for this page. Change ADMIN_GREEN to adjust color.
  const ADMIN_GREEN = "#00703D";

  // Fetch rates data
  const fetchRates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = {
        search: searchQuery || undefined,
        rate_type: selectedCategory === "ALL" ? undefined : selectedCategory,
        ordering: "-created_at",
      };

      const [ratesResponse, statsResponse] = await Promise.all([
        ratesService.getRates(filters),
        ratesService.getRateStats(filters),
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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "NORMAL_GOODS":
        return isCustomer ? "bg-blue-100 text-blue-800" : `bg-[${ADMIN_GREEN}] text-white`;
      case "SPECIAL_GOODS":
        return "bg-purple-100 text-purple-800";
      case "SMALL_GOODS":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeIcon = (rateType: string) => {
    return rateType === "SEA_RATES" ? (
      <Ship className={`h-4 w-4 ${isCustomer ? 'text-blue-600' : `text-[${ADMIN_GREEN}]`}`} />
    ) : (
      <Plane className="h-4 w-4 text-green-600" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Your Rates</h1>
          <p className="text-muted-foreground text-sm lg:text-base">
            View current shipping rates for your account
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={isCustomer ? "p-2 bg-blue-100 rounded-full" : `p-2 bg-[${ADMIN_GREEN}] rounded-full`}>
                  <DollarSign className={`h-5 w-5 ${isCustomer ? 'text-blue-600' : `text-[${ADMIN_GREEN}]`}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Rates</p>
                  <p className="font-semibold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Average Rate</p>
                  <p className="font-semibold">
                    ${stats.amount?.avg ? Math.round(stats.amount.avg) : 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-full">
                  <DollarSign className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Min Rate</p>
                  <p className="font-semibold">
                    ${stats.amount?.min || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <DollarSign className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Max Rate</p>
                  <p className="font-semibold">
                    ${stats.amount?.max || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search rates by title, route, or office..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Category Filter */}
        <Select value={selectedCategory} onValueChange={(value: "SEA_RATES" | "AIR_RATES" | "ALL") => setSelectedCategory(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="SEA_RATES">Sea Rates</SelectItem>
            <SelectItem value="AIR_RATES">Air Rates</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error State */}
      {error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Rates List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {selectedCategory === "SEA_RATES" ? (
              <Ship className={`h-5 w-5 ${isCustomer ? 'text-blue-600' : `text-[${ADMIN_GREEN}]`}`} />
            ) : selectedCategory === "AIR_RATES" ? (
              <Plane className="h-5 w-5 text-green-600" />
            ) : (
              <Calculator className="h-5 w-5" />
            )}
            {selectedCategory === "ALL" ? "All Shipping Rates" : 
             selectedCategory === "SEA_RATES" ? "Sea Cargo Rates" : "Air Cargo Rates"}
            {rates.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {rates.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading rates...</span>
            </div>
          ) : rates.length === 0 ? (
            <div className="text-center p-8">
              <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No rates found</h3>
              <p className="text-muted-foreground">
                {searchQuery
                  ? "No rates match your search criteria."
                  : "No shipping rates are currently available."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Rate Details</th>
                    <th className="text-left p-4 font-medium">Route</th>
                    <th className="text-left p-4 font-medium">Category</th>
                    <th className="text-left p-4 font-medium">Office</th>
                    <th className="text-right p-4 font-medium">Amount</th>
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
                          {getTypeIcon(rate.rate_type)}
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
                        <p className="text-xs text-muted-foreground">
                          {rate.origin_country} → {rate.destination_country}
                        </p>
                      </td>
                      <td className="p-4">
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${getCategoryColor(rate.category)}`}
                        >
                          {rate.category_display}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <p className="text-sm">{rate.office_name}</p>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-semibold text-lg">${rate.amount}</span>
                        <p className="text-xs text-muted-foreground">
                          {rate.rate_type === "SEA_RATES" ? "per CBM" : "per KG"}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rate Categories Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rate Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={isCustomer ? "bg-blue-100 text-blue-800" : `bg-[${ADMIN_GREEN}] text-white`}>Normal Goods</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Standard shipping rates for regular cargo items
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-purple-100 text-purple-800">Special Goods</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Premium rates for fragile, hazardous, or special handling items
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-green-100 text-green-800">Small Goods</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Discounted rates for small packages and documents
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerRates;