import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  User, 
  Phone, 
  Mail, 
  Building, 
  FileText,
  Palette,
  Upload,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Settings2,
  Ship,
  Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { settingsService, WarehouseAddress, CreateWarehouseRequest, UpdateWarehouseRequest, ShippingMarkRule, CreateShippingMarkRuleRequest, UpdateShippingMarkRuleRequest } from "@/services/settingsService";
import { useAuthStore } from "@/stores/authStore";

// Helper function to convert database region names to display names
const getDisplayRegionName = (region: string): string => {
  const regionMap: Record<string, string> = {
    'GREATER_ACCRA': 'Greater Accra',
    'ASHANTI': 'Ashanti',
    'NORTHERN': 'Northern',
    'EASTERN': 'Eastern',
    'WESTERN': 'Western',
    'CENTRAL': 'Central',
    'VOLTA': 'Volta',
    'UPPER_EAST': 'Upper East',
    'UPPER_WEST': 'Upper West',
    'BRONG_AHAFO': 'Brong Ahafo',
    'WESTERN_NORTH': 'Western North',
    'AHAFO': 'Ahafo',
    'BONO': 'Bono',
    'BONO_EAST': 'Bono East',
    'OTI': 'Oti',
    'NORTH_EAST': 'North East',
    'SAVANNAH': 'Savannah'
  };
  return regionMap[region] || region;
};

interface Office {
  id: number;
  name: string;
  country: string;
  phone: string;
  address: string;
} 

// Use the WarehouseAddress from settingsService as the main interface
// Simplified Warehouse interface for the editing form
interface WarehouseFormData {
  id?: number;
  name: string;
  location: string;
  address: string;
  description: string;
  is_active?: boolean;
}

// Use the ShippingMarkRule from settingsService as the main interface

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const isCustomer = user?.user_role === 'CUSTOMER' || user?.is_admin_user === false;

  // Admin green used for admin-only accents on this page
  const ADMIN_GREEN = "#00703D";
  const [activeTab, setActiveTab] = useState("general");
  
  // Helper function to format region display names
  const formatRegionName = (region: string) => {
    const regionMap: Record<string, string> = {
      'GREATER_ACCRA': 'Greater Accra',
      'ASHANTI': 'Ashanti',
      'NORTHERN': 'Northern',
      'EASTERN': 'Eastern',
      'WESTERN': 'Western',
      'CENTRAL': 'Central',
      'VOLTA': 'Volta',
      'UPPER_EAST': 'Upper East',
      'UPPER_WEST': 'Upper West',
      'BRONG_AHAFO': 'Brong Ahafo',
      'WESTERN_NORTH': 'Western North',
      'AHAFO': 'Ahafo',
      'BONO': 'Bono',
      'BONO_EAST': 'Bono East',
      'OTI': 'Oti',
      'NORTH_EAST': 'North East',
      'SAVANNAH': 'Savannah'
    };
    return regionMap[region] || region;
  };
  
  // Edit dialog states
  const [isOfficeDialogOpen, setIsOfficeDialogOpen] = useState(false);
  const [isWarehouseDialogOpen, setIsWarehouseDialogOpen] = useState(false);
  const [isRegionalRuleDialogOpen, setIsRegionalRuleDialogOpen] = useState(false);
  const [editingOffice, setEditingOffice] = useState<Office | null>(null);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseFormData | null>(null);

  // Load warehouses on component mount
  useEffect(() => {
    const loadWarehouses = async () => {
      try {
        setWarehousesLoading(true);
        const response = await settingsService.getWarehouseAddresses();
        if (response.success) {
          // Ensure response.data is an array before setting state
          const warehousesData = Array.isArray(response.data) ? response.data : [];
          setWarehouses(warehousesData);
        } else {
          // Set empty array on failure to maintain array type
          setWarehouses([]);
          toast({
            title: "Error",
            description: response.message,
            variant: "destructive",
          });
        }
      } catch (error) {
        // Set empty array on error to maintain array type
        setWarehouses([]);
        toast({
          title: "Error",
          description: "Failed to load warehouses",
          variant: "destructive",
        });
      } finally {
        setWarehousesLoading(false);
      }
    };

    loadWarehouses();
  }, [toast]);

  // Load regional rules on component mount
  useEffect(() => {
    const loadRegionalRules = async () => {
      try {
        console.log('Loading regional rules...');
        setRegionalRulesLoading(true);
        const response = await settingsService.getShippingMarkRules();
        console.log('Regional rules response:', response);
        if (response.success) {
          console.log('Regional rules data:', response.data);
          setRegionalRules(response.data);
        } else {
          console.error('Regional rules failed:', response.message);
          setRegionalRules([]);
          toast({
            title: "Error",
            description: response.message,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Regional rules error:', error);
        setRegionalRules([]);
        toast({
          title: "Error",
          description: "Failed to load regional rules",
          variant: "destructive",
        });
      } finally {
        setRegionalRulesLoading(false);
      }
    };

    loadRegionalRules();
  }, [toast]);

  // Mock data - replace with actual API calls
  const [generalSettings, setGeneralSettings] = useState({
    firstName: "Admin",
    lastName: "User",
    email: "admin@primepre.com",
    phone: "+233 50 000 6635",
    region: "greater-accra",
    company: "Cephas Cargo and logistics",
    role: "Super Admin",
    warehouseAccess: ["China Warehouse", "Ghana Warehouse"],
    accountStatus: "Active",
    permissions: {
      createUsers: true,
      manageInventory: true,
      viewAnalytics: true,
      manageAdmins: true
    }
  });

  const [invoiceSettings, setInvoiceSettings] = useState({
    themeColor: "#1e40af",
    invoiceNumberFormat: "INV-{YYYY}-{MM}-{###}",
    invoiceNotes: "Thank you for Cephas Cargo and logistics for your logistics needs."
  });

  const [offices, setOffices] = useState<Office[]>([
    {
      id: 1,
      name: "Ghana Head Office",
      country: "Ghana",
      phone: "+233 50 000 6635",
      address: "123 Independence Avenue, Accra"
    }
  ]);

  const [warehouses, setWarehouses] = useState<WarehouseAddress[]>([]);
  const [warehousesLoading, setWarehousesLoading] = useState(true);

  const [shippingMarkRules, setShippingMarkRules] = useState({
    defaultPrefix: "DC",
    defaultFormat: "DC + CLIENT_NAME"
  });

  const [regionalRules, setRegionalRules] = useState<ShippingMarkRule[]>([]);
  const [regionalRulesLoading, setRegionalRulesLoading] = useState(true);
  const [editingRegionalRule, setEditingRegionalRule] = useState<ShippingMarkRule | null>(null);

  const handleSaveGeneral = () => {
    toast({
      title: "Settings Saved",
      description: "General settings have been updated successfully.",
    });
  };

  const handleSaveInvoice = () => {
    toast({
      title: "Invoice Settings Saved",
      description: "Invoice configuration has been updated successfully.",
    });
  };

  const handleAddOffice = () => {
    setEditingOffice({
      id: 0,
      name: "",
      country: "Ghana",
      phone: "",
      address: ""
    });
    setIsOfficeDialogOpen(true);
  };

  const handleEditOffice = (office: Office) => {
    setEditingOffice({ ...office });
    setIsOfficeDialogOpen(true);
  };

  const handleDeleteOffice = (id: number) => {
    setOffices(offices.filter(office => office.id !== id));
    toast({
      title: "Office Deleted",
      description: "Company office has been removed successfully.",
    });
  };

  const handleSaveOffice = () => {
    if (!editingOffice) return;
    
    if (editingOffice.id === 0) {
      // Adding new office
      const newOffice = {
        ...editingOffice,
        id: Math.max(...offices.map(o => o.id), 0) + 1
      };
      setOffices([...offices, newOffice]);
      toast({
        title: "Office Added",
        description: "New company office has been added successfully.",
      });
    } else {
      // Editing existing office
      setOffices(offices.map(office => 
        office.id === editingOffice.id ? editingOffice : office
      ));
      toast({
        title: "Office Updated",
        description: "Company office has been updated successfully.",
      });
    }
    
    setIsOfficeDialogOpen(false);
    setEditingOffice(null);
  };

  const handleAddWarehouse = () => {
    setEditingWarehouse({
      id: undefined,
      name: "",
      location: "",
      address: "",
      description: "",
      is_active: true
    });
    setIsWarehouseDialogOpen(true);
  };

  const handleEditWarehouse = (warehouse: WarehouseAddress) => {
    setEditingWarehouse({
      id: warehouse.id,
      name: warehouse.name,
      location: warehouse.location,
      address: warehouse.address,
      description: warehouse.description,
      is_active: warehouse.is_active
    });
    setIsWarehouseDialogOpen(true);
  };

  const handleDeleteWarehouse = async (id: number) => {
    try {
      const response = await settingsService.deleteWarehouseAddress(id);
      if (response.success) {
        setWarehouses((prevWarehouses) => 
          Array.isArray(prevWarehouses) 
            ? prevWarehouses.filter(warehouse => warehouse.id !== id)
            : []
        );
        toast({
          title: "Warehouse Deleted",
          description: "Warehouse has been removed successfully.",
        });
      } else {
        toast({
          title: "Error",
          description: response.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete warehouse",
        variant: "destructive",
      });
    }
  };

  const handleSaveWarehouse = async () => {
    if (!editingWarehouse) return;
    
    // Validate required fields
    if (!editingWarehouse.name?.trim()) {
      toast({
        title: "Validation Error",
        description: "Warehouse name is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!editingWarehouse.location?.trim()) {
      toast({
        title: "Validation Error", 
        description: "Warehouse location is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!editingWarehouse.address?.trim()) {
      toast({
        title: "Validation Error", 
        description: "Warehouse address is required",
        variant: "destructive",
      });
      return;
    }

    if (!editingWarehouse.description?.trim()) {
      toast({
        title: "Validation Error",
        description: "Warehouse description is required",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Determine if we're creating or editing based on ID presence
      const isEditing = editingWarehouse.id !== undefined;
      
      if (isEditing) {
        // Editing existing warehouse
        const updateData: UpdateWarehouseRequest = {
          name: editingWarehouse.name.trim(),
          location: editingWarehouse.location.trim(),
          address: editingWarehouse.address.trim(),
          description: editingWarehouse.description.trim(),
          is_active: editingWarehouse.is_active ?? true
        };
        
        console.log('Updating warehouse with data:', updateData);
        const response = await settingsService.updateWarehouseAddress(editingWarehouse.id!, updateData);
        
        if (response.success) {
          // Update the warehouse in the list
          setWarehouses((prevWarehouses) => 
            Array.isArray(prevWarehouses) 
              ? prevWarehouses.map(warehouse => 
                  warehouse.id === editingWarehouse.id ? response.data : warehouse
                )
              : [response.data]
          );
          toast({
            title: "Warehouse Updated",
            description: "Warehouse has been updated successfully.",
          });
        } else {
          toast({
            title: "Error",
            description: response.message || "Failed to update warehouse",
            variant: "destructive",
          });
          return;
        }
      } else {
        // Creating new warehouse
        const createData: CreateWarehouseRequest = {
          name: editingWarehouse.name.trim(),
          location: editingWarehouse.location.trim(),
          address: editingWarehouse.address.trim(),
          description: editingWarehouse.description.trim(),
          is_active: editingWarehouse.is_active ?? true
        };
        
        console.log('Creating warehouse with data:', createData);
        const response = await settingsService.createWarehouseAddress(createData);
        
        if (response.success) {
          // Add the new warehouse to the list
          setWarehouses((prevWarehouses) => 
            Array.isArray(prevWarehouses) 
              ? [...prevWarehouses, response.data]
              : [response.data]
          );
          toast({
            title: "Warehouse Added",
            description: "New warehouse has been added successfully.",
          });
        } else {
          console.error('API Error:', response.message);
          toast({
            title: "Error",
            description: response.message || "Failed to create warehouse",
            variant: "destructive",
          });
          return;
        }
      }
    } catch (error) {
      console.error('Caught error:', error);
      toast({
        title: "Error",
        description: "Failed to save warehouse",
        variant: "destructive",
      });
      return;
    }
    
    setIsWarehouseDialogOpen(false);
    setEditingWarehouse(null);
  };

  const handleAddRegionalRule = () => {
    // Generate next prefix value (can be character or number)
    const existingPrefixes = regionalRules.map(r => r.prefix_value);
    let nextPrefix = '1';
    
    // Try numbers first
    for (let i = 1; i <= 99; i++) {
      if (!existingPrefixes.includes(i.toString())) {
        nextPrefix = i.toString();
        break;
      }
    }
    
    // If all numbers are taken, use letters
    if (existingPrefixes.includes(nextPrefix)) {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      for (let i = 0; i < letters.length; i++) {
        if (!existingPrefixes.includes(letters[i])) {
          nextPrefix = letters[i];
          break;
        }
      }
    }
    setEditingRegionalRule({
      id: 0,
      rule_name: "",
      description: "",
      country: "Ghana",
      region: "",
      prefix_value: nextPrefix,
      format_template: "DC{prefix}{name}",
      priority: 1,
      is_active: true,
      is_default: false,
      created_at: "",
      updated_at: "",
      created_by: null
    });
    setIsRegionalRuleDialogOpen(true);
  };

  const handleEditRegionalRule = (rule: ShippingMarkRule) => {
    setEditingRegionalRule({ ...rule });
    setIsRegionalRuleDialogOpen(true);
  };

  const handleDeleteRegionalRule = async (id: number) => {
    try {
      const response = await settingsService.deleteShippingMarkRule(id);
      if (response.success) {
        setRegionalRules(regionalRules.filter(rule => rule.id !== id));
        toast({
          title: "Regional Rule Deleted",
          description: "Regional shipping mark rule has been removed successfully.",
        });
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to delete regional rule",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting regional rule:", error);
      toast({
        title: "Error",
        description: "Failed to delete regional rule",
        variant: "destructive",
      });
    }
  };

  const handleSaveRegionalRule = async () => {
    if (!editingRegionalRule) return;
    
    try {
      if (editingRegionalRule.id === 0) {
        // Adding new rule
        const createData: CreateShippingMarkRuleRequest = {
          rule_name: `${editingRegionalRule.region}_GHANA_RULE`,
          description: `Shipping mark rule for ${editingRegionalRule.region} region`,
          country: editingRegionalRule.country,
          region: editingRegionalRule.region,
          prefix_value: editingRegionalRule.prefix_value,
          format_template: "DC{prefix}{name}",
          is_active: editingRegionalRule.is_active,
          priority: editingRegionalRule.priority,
          is_default: false
        };
        
        const response = await settingsService.createShippingMarkRule(createData);
        if (response.success) {
          setRegionalRules([...regionalRules, response.data]);
          toast({
            title: "Regional Rule Added",
            description: "New regional shipping mark rule has been added successfully.",
          });
        } else {
          toast({
            title: "Error",
            description: response.message || "Failed to create regional rule",
            variant: "destructive",
          });
          return;
        }
      } else {
        // Editing existing rule
        const updateData: UpdateShippingMarkRuleRequest = {
          rule_name: editingRegionalRule.rule_name,
          description: editingRegionalRule.description,
          country: editingRegionalRule.country,
          region: editingRegionalRule.region,
          prefix_value: editingRegionalRule.prefix_value,
          format_template: editingRegionalRule.format_template,
          is_active: editingRegionalRule.is_active,
          priority: editingRegionalRule.priority,
          is_default: editingRegionalRule.is_default
        };
        
        const response = await settingsService.updateShippingMarkRule(editingRegionalRule.id, updateData);
        if (response.success) {
          setRegionalRules(regionalRules.map(rule => 
            rule.id === editingRegionalRule.id ? response.data : rule
          ));
          toast({
            title: "Regional Rule Updated",
            description: "Regional shipping mark rule has been updated successfully.",
          });
        } else {
          toast({
            title: "Error",
            description: response.message || "Failed to update regional rule",
            variant: "destructive",
          });
          return;
        }
      }
    } catch (error) {
      console.error("Error saving regional rule:", error);
      toast({
        title: "Error",
        description: "Failed to save regional rule",
        variant: "destructive",
      });
      return;
    }
    
    setIsRegionalRuleDialogOpen(false);
    setEditingRegionalRule(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="px-4 sm:px-0">
        <h1 className="text-xl lg:text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm lg:text-base mt-1">
          Manage system configuration and company settings
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full px-4 sm:px-0">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 gap-1">
            <TabsTrigger value="general" className="text-xs lg:text-sm">General</TabsTrigger>
            {/*
            <TabsTrigger value="invoice" className="text-xs lg:text-sm">Invoice</TabsTrigger>
            <TabsTrigger value="offices" className="text-xs lg:text-sm">Offices</TabsTrigger>
            <TabsTrigger value="warehouses" className="text-xs lg:text-sm">Warehouses</TabsTrigger>
              */}
            <TabsTrigger value="shipping-marks" className="text-xs lg:text-sm col-span-2 lg:col-span-1">Shipping Marks</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="general" className="space-y-6 mt-6 px-4 sm:px-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className={`h-5 w-5 ${isCustomer ? 'text-primary' : `text-[${ADMIN_GREEN}]`}`} />
                Profile Information
              </CardTitle>
              <CardDescription>
                Your admin account details and company information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium">First Name</Label>
                  <Input 
                    id="firstName" 
                    value={generalSettings.firstName}
                    onChange={(e) => setGeneralSettings({...generalSettings, firstName: e.target.value})}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-medium">Last Name</Label>
                  <Input 
                    id="lastName" 
                    value={generalSettings.lastName}
                    onChange={(e) => setGeneralSettings({...generalSettings, lastName: e.target.value})}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </Label>
                  <Input 
                    id="email" 
                    value={generalSettings.email}
                    onChange={(e) => setGeneralSettings({...generalSettings, email: e.target.value})}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2 text-sm font-medium">
                    <Phone className="h-4 w-4" />
                    Phone Number
                  </Label>
                  <Input 
                    id="phone" 
                    value={generalSettings.phone}
                    onChange={(e) => setGeneralSettings({...generalSettings, phone: e.target.value})}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region" className="text-sm font-medium">Region</Label>
                  <Select value={generalSettings.region} onValueChange={(value) => setGeneralSettings({...generalSettings, region: value})}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="greater-accra">Greater Accra</SelectItem>
                      <SelectItem value="northern">Northern Region</SelectItem>
                      <SelectItem value="western">Western Region</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company" className="flex items-center gap-2 text-sm font-medium">
                    <Building className="h-4 w-4" />
                    Company Name
                  </Label>
                  <Input 
                    id="company" 
                    value={generalSettings.company}
                    onChange={(e) => setGeneralSettings({...generalSettings, company: e.target.value})}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">User Role</Label>
                  <div className="flex items-center gap-2">
                    <Input id="role" value={generalSettings.role} readOnly />
                    <Badge variant="default" className={isCustomer ? undefined : `bg-[${ADMIN_GREEN}] text-white`}>{generalSettings.role}</Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warehouseAccess">Warehouse Access</Label>
                  <div className="flex items-center gap-2">
                    {generalSettings.warehouseAccess.map((warehouse, index) => (
                      <Badge key={index} variant="secondary" className={isCustomer ? undefined : `bg-[${ADMIN_GREEN}] text-white`}>{warehouse}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Account Status</h4>
                    <p className="text-sm text-muted-foreground">Your account is active and verified</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">{generalSettings.accountStatus}</Badge>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">Permissions</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="createUsers" checked={generalSettings.permissions.createUsers} disabled />
                    <Label htmlFor="createUsers">Can Create Users</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="manageInventory" checked={generalSettings.permissions.manageInventory} disabled />
                    <Label htmlFor="manageInventory">Can Manage Inventory</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="viewAnalytics" checked={generalSettings.permissions.viewAnalytics} disabled />
                    <Label htmlFor="viewAnalytics">Can View Analytics</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="manageAdmins" checked={generalSettings.permissions.manageAdmins} disabled />
                    <Label htmlFor="manageAdmins">Can Manage Admins</Label>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button onClick={handleSaveGeneral} className={`flex items-center justify-center gap-2 w-full sm:w-auto ${isCustomer ? '' : `bg-[${ADMIN_GREEN}] text-white hover:bg-[${ADMIN_GREEN}]/90`} `}>
                  <Save className="h-4 w-4" />
                  Update Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="invoice" className="space-y-6 mt-6 px-4 sm:px-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className={`h-5 w-5 ${isCustomer ? 'text-primary' : `text-[${ADMIN_GREEN}]`}`} />
                Invoice Configuration
              </CardTitle>
              <CardDescription>
                Customize your invoice appearance and metadata
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="companyLogo" className="text-sm font-medium">Company Logo</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 lg:p-6 text-center">
                    <Upload className="h-6 w-6 lg:h-8 lg:w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs lg:text-sm text-muted-foreground">Drag & drop logo here or click to browse</p>
                    <Button variant="outline" size="sm" className={`${isCustomer ? 'mt-2 w-full sm:w-auto' : `mt-2 w-full sm:w-auto bg-[${ADMIN_GREEN}] text-white hover:bg-[${ADMIN_GREEN}]/90`}`}>Browse Files</Button>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="themeColor" className="flex items-center gap-2 text-sm font-medium">
                      <Palette className="h-4 w-4" />
                      Theme Color
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        id="themeColor" 
                        value={invoiceSettings.themeColor} 
                        type="color" 
                        className="w-12 h-8 lg:w-16 lg:h-10 flex-shrink-0"
                        onChange={(e) => setInvoiceSettings({...invoiceSettings, themeColor: e.target.value})}
                      />
                      <Input value={invoiceSettings.themeColor} readOnly className="flex-1" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoiceNumberFormat">Invoice Number Format</Label>
                    <Select 
                      value={invoiceSettings.invoiceNumberFormat} 
                      onValueChange={(value) => setInvoiceSettings({...invoiceSettings, invoiceNumberFormat: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INV-YYYY-MM-###">INV-&#123;YYYY&#125;-&#123;MM&#125;-&#123;###&#125;</SelectItem>
                        <SelectItem value="DC-YYYYMMDD-###">DC-&#123;YYYY&#125;&#123;MM&#125;&#123;DD&#125;-&#123;###&#125;</SelectItem>
                        <SelectItem value="YYYY-INV-###">&#123;YYYY&#125;-INV-&#123;###&#125;</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="invoiceNotes">Invoice Notes</Label>
                <Textarea 
                  id="invoiceNotes" 
                  placeholder="Enter default notes to appear on invoices..."
                  value={invoiceSettings.invoiceNotes}
                  onChange={(e) => setInvoiceSettings({...invoiceSettings, invoiceNotes: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">Template Preview</h4>
                <div className="border rounded-lg p-4 bg-muted/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-24 h-12 ${isCustomer ? 'bg-primary/20' : `bg-[${ADMIN_GREEN}]/20`} rounded flex items-center justify-center`}>
                      <span className="text-xs">LOGO</span>
                    </div>
                    <div className="text-right">
                      <h3 className="font-semibold text-lg">INVOICE</h3>
                      <p className="text-sm text-muted-foreground">INV-2024-01-001</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><strong>From:</strong> Cephas Cargo and logistics</p>
                    <p><strong>To:</strong> Sample Client</p>
                    <p><strong>Date:</strong> 15 Sep 2025</p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button onClick={handleSaveInvoice} className={`flex items-center gap-2 ${isCustomer ? '' : `bg-[${ADMIN_GREEN}] text-white hover:bg-[${ADMIN_GREEN}]/90`}`}>
                  <Save className="h-4 w-4" />
                  Save Invoice Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="offices" className="space-y-6 mt-6 px-4 sm:px-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Company Offices</h2>
              <p className="text-muted-foreground">
                Manage your company office locations and contact information
              </p>
            </div>
            <Button onClick={handleAddOffice} className={`flex items-center gap-2 ${isCustomer ? '' : `bg-[${ADMIN_GREEN}] text-white hover:bg-[${ADMIN_GREEN}]/90`}`}>
              <Plus className="h-4 w-4" />
              Add Office
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
            {offices.map((office) => (
              <Card key={office.id} className="group hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 ${isCustomer ? 'bg-primary/10' : `bg-[${ADMIN_GREEN}]/10`} rounded-lg flex items-center justify-center`}>
                        <Building className={`h-6 w-6 ${isCustomer ? 'text-primary' : `text-[${ADMIN_GREEN}]`}`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{office.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{office.country}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => handleEditOffice(office)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteOffice(office.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span>{office.phone}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
                    <span className="text-muted-foreground">{office.address}</span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    View on Map
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="warehouses" className="space-y-6 mt-6 px-4 sm:px-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Warehouse Addresses</h2>
              <p className="text-muted-foreground">
                Configure warehouse locations and shipping routes
              </p>
            </div>
            <Button onClick={handleAddWarehouse} className={`flex items-center gap-2 ${isCustomer ? '' : `bg-[${ADMIN_GREEN}] text-white hover:bg-[${ADMIN_GREEN}]/90`}`}>
              <Plus className="h-4 w-4" />
              Add Warehouse
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {warehousesLoading ? (
              <div className="col-span-1 lg:col-span-2 text-center py-8">
                <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isCustomer ? 'border-primary' : `border-[${ADMIN_GREEN}]`} mx-auto`}></div>
                <p className="text-muted-foreground text-sm lg:text-base mt-2">Loading warehouses...</p>
              </div>
            ) : !Array.isArray(warehouses) || warehouses.length === 0 ? (
              <div className="col-span-1 lg:col-span-2 text-center py-8">
                <Ship className="h-10 w-10 lg:h-12 lg:w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No warehouses found. Add your first warehouse to get started.</p>
              </div>
            ) : (
              warehouses.map((warehouse) => (
                <Card key={warehouse.id} className="group hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                          <Ship className="h-6 w-6 text-orange-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{warehouse.name}</CardTitle>
                          <Badge variant="default" className="mt-1">{warehouse.location}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => handleEditWarehouse(warehouse)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteWarehouse(warehouse.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{warehouse.description}</p>
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
                      <span className="text-muted-foreground">{warehouse.address}</span>
                    </div>
                    {warehouse.contact_phone && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Contact:</span>
                        <span>{warehouse.contact_phone}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="shipping-marks" className="space-y-6 mt-6 px-4 sm:px-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className={`h-5 w-5 ${isCustomer ? 'text-primary' : `text-[${ADMIN_GREEN}]`}`} />
                Shipping Mark Rules
              </CardTitle>
              <CardDescription>
                Define how shipping marks are generated based on location and client information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className={`${isCustomer ? 'bg-blue-50 border border-blue-200' : `bg-[${ADMIN_GREEN}]/10 border border-[${ADMIN_GREEN}]/20`} rounded-lg p-4`}>
                <h4 className="font-medium mb-2">Default Format</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Shipping Mark = <strong>Prefix</strong> + <strong>Space</strong> + <strong>Random Name Combination</strong>
                </p>
                <div className="bg-white rounded border p-3">
                  <code className="text-sm">
                    Example: <span className={`${isCustomer ? 'text-blue-600' : `text-[${ADMIN_GREEN}]`}`}>{shippingMarkRules.defaultPrefix}</span><span className="text-gray-400"> </span><span className="text-green-600">JODO</span> = <strong>{shippingMarkRules.defaultPrefix} JODO</strong>
                  </code>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Name combinations are randomly generated from first and last names (e.g., John Doe → JODO, JOHD, JDOE, etc.)
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultPrefix">Default Prefix</Label>
                  <Input 
                    id="defaultPrefix" 
                    value={shippingMarkRules.defaultPrefix}
                    onChange={(e) => setShippingMarkRules({...shippingMarkRules, defaultPrefix: e.target.value})}
                    className="w-32"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h4 className="font-medium">Regional Rules</h4>
                <Button size="sm" className={`flex items-center gap-2 ${isCustomer ? '' : `bg-[${ADMIN_GREEN}] text-white hover:bg-[${ADMIN_GREEN}]/90`}`} onClick={handleAddRegionalRule}>
                  <Plus className="h-3 w-3" />
                  Add Rule
                </Button>
              </div>

              {(() => {
                console.log('Rendering regional rules section');
                console.log('regionalRulesLoading:', regionalRulesLoading);
                console.log('regionalRules:', regionalRules);
                console.log('regionalRules.length:', regionalRules.length);
                return null;
              })()}

              {regionalRulesLoading ? (
                <div className="border rounded-lg">
                  <div className="p-4">
                    <p className="text-sm text-muted-foreground">
                      Loading regional rules...
                    </p>
                  </div>
                </div>
              ) : (Array.isArray(regionalRules) && regionalRules.length > 0) ? (
                <div className="space-y-3">
                  {regionalRules.map((rule) => (
                    <div key={rule.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Rule {rule.id}</span>
                          {!rule.is_active && (
                            <Badge variant="secondary" className="text-xs">Inactive</Badge>
                          )}
                        </div>
                        <div className="flex gap-1 lg:gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditRegionalRule(rule)}
                            className="px-2 lg:px-3"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteRegionalRule(rule.id)}
                            className="px-2 lg:px-3"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Country</span>
                          <div className="flex items-center gap-2 mt-1">
                            <img src="/api/placeholder/16/12" alt="Ghana" className="w-4 h-3" />
                            <span>{rule.country}</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">State/Region</span>
                          <div className="mt-1">{formatRegionName(rule.region)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Prefix Value</span>
                          <div className="mt-1">{rule.prefix_value}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border rounded-lg">
                  <div className="p-4">
                    <p className="text-sm text-muted-foreground">
                      No regional rules configured yet. Add rules to customize shipping mark generation based on location.
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-4">
                <Button className={`flex items-center gap-2 ${isCustomer ? '' : `bg-[${ADMIN_GREEN}] text-white hover:bg-[${ADMIN_GREEN}]/90`}`}>
                  <Save className="h-4 w-4" />
                  Save Formatting Rules
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Office Edit Dialog */}
      <Dialog open={isOfficeDialogOpen} onOpenChange={setIsOfficeDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingOffice?.id === 0 ? "Add New Office" : "Edit Office"}
            </DialogTitle>
            <DialogDescription>
              {editingOffice?.id === 0 
                ? "Add a new company office location"
                : "Update office information and contact details"
              }
            </DialogDescription>
          </DialogHeader>
          {editingOffice && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="officeName">Office Name</Label>
                <Input
                  id="officeName"
                  value={editingOffice.name}
                  onChange={(e) => setEditingOffice({...editingOffice, name: e.target.value})}
                  placeholder="e.g., Ghana Head Office"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="officeCountry">Country</Label>
                <Select 
                  value={editingOffice.country} 
                  onValueChange={(value) => setEditingOffice({...editingOffice, country: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ghana">Ghana</SelectItem>
                    <SelectItem value="China">China</SelectItem>
                    <SelectItem value="Nigeria">Nigeria</SelectItem>
                    <SelectItem value="UK">United Kingdom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="officePhone">Phone Number</Label>
                <Input
                  id="officePhone"
                  value={editingOffice.phone}
                  onChange={(e) => setEditingOffice({...editingOffice, phone: e.target.value})}
                  placeholder="e.g., +233 50 000 6635"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="officeAddress">Address</Label>
                <Textarea
                  id="officeAddress"
                  value={editingOffice.address}
                  onChange={(e) => setEditingOffice({...editingOffice, address: e.target.value})}
                  placeholder="Enter full office address"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOfficeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveOffice}>
              {editingOffice?.id === 0 ? "Add Office" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Warehouse Edit Dialog */}
      <Dialog open={isWarehouseDialogOpen} onOpenChange={setIsWarehouseDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingWarehouse?.id === undefined ? "Add New Warehouse" : "Edit Warehouse"}
            </DialogTitle>
            <DialogDescription>
              {editingWarehouse?.id === undefined 
                ? "Add a new warehouse location"
                : "Update warehouse information and details"
              }
            </DialogDescription>
          </DialogHeader>
          {editingWarehouse && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="warehouseName">Warehouse Name</Label>
                <Input
                  id="warehouseName"
                  value={editingWarehouse.name}
                  onChange={(e) => setEditingWarehouse({...editingWarehouse, name: e.target.value})}
                  placeholder="e.g., Ghana Main Warehouse"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="warehouseLocation">Location</Label>
                <Input
                  id="warehouseLocation"
                  value={editingWarehouse.location}
                  onChange={(e) => setEditingWarehouse({...editingWarehouse, location: e.target.value})}
                  placeholder="e.g., Accra, Ghana"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="warehouseAddress">Address</Label>
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground mb-2">
                    Use buttons below to insert dynamic placeholders. Clients will see their personalized information instead of the placeholders.
                  </div>
                  <div className="flex gap-1 lg:gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={`text-xs h-7 px-2 ${isCustomer ? 'bg-blue-500 text-white hover:bg-blue-600' : `bg-[${ADMIN_GREEN}] text-white hover:bg-[${ADMIN_GREEN}]/90`} flex-shrink-0`}
                      onClick={() => {
                        const textarea = document.getElementById('warehouseAddress') as HTMLTextAreaElement;
                        const cursorPos = textarea.selectionStart;
                        const textBefore = editingWarehouse.address.substring(0, cursorPos);
                        const textAfter = editingWarehouse.address.substring(cursorPos);
                        const newAddress = textBefore + '{{SHIPPING_MARK}}' + textAfter;
                        setEditingWarehouse({...editingWarehouse, address: newAddress});
                      }}
                    >
                      SHIPPING_MARK
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={`text-xs h-7 px-2 ${isCustomer ? 'bg-blue-500 text-white hover:bg-blue-600' : `bg-[${ADMIN_GREEN}] text-white hover:bg-[${ADMIN_GREEN}]/90`}`}
                      onClick={() => {
                        const textarea = document.getElementById('warehouseAddress') as HTMLTextAreaElement;
                        const cursorPos = textarea.selectionStart;
                        const textBefore = editingWarehouse.address.substring(0, cursorPos);
                        const textAfter = editingWarehouse.address.substring(cursorPos);
                        const newAddress = textBefore + '{{PHONE_NUMBER}}' + textAfter;
                        setEditingWarehouse({...editingWarehouse, address: newAddress});
                      }}
                    >
                      PHONE_NUMBER
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={`text-xs h-7 px-2 ${isCustomer ? 'bg-blue-500 text-white hover:bg-blue-600' : `bg-[${ADMIN_GREEN}] text-white hover:bg-[${ADMIN_GREEN}]/90`}`}
                      onClick={() => {
                        const textarea = document.getElementById('warehouseAddress') as HTMLTextAreaElement;
                        const cursorPos = textarea.selectionStart;
                        const textBefore = editingWarehouse.address.substring(0, cursorPos);
                        const textAfter = editingWarehouse.address.substring(cursorPos);
                        const newAddress = textBefore + '{{NAME}}' + textAfter;
                        setEditingWarehouse({...editingWarehouse, address: newAddress});
                      }}
                    >
                      NAME
                    </Button>
                  </div>
                  <Textarea
                    id="warehouseAddress"
                    value={editingWarehouse.address}
                    onChange={(e) => setEditingWarehouse({...editingWarehouse, address: e.target.value})}
                    placeholder="Example: Building 123, {{NAME}} Collection Center, Contact: {{PHONE_NUMBER}}, Mark: {{SHIPPING_MARK}}, Accra, Ghana"
                    rows={4}
                    className="font-mono"
                  />
                  {(editingWarehouse.address?.includes('{{') || editingWarehouse.address?.includes('}}')) && (
                    <div className={`text-xs ${isCustomer ? 'text-blue-600' : `text-[${ADMIN_GREEN}]`} mt-1 flex items-center gap-1`}>
                      <div className={`h-2 w-2 rounded-full ${isCustomer ? 'bg-blue-500' : `bg-[${ADMIN_GREEN}]`}`}></div>
                      Placeholders detected - clients will see personalized addresses
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="warehouseDescription">Description</Label>
                <Textarea
                  id="warehouseDescription"
                  value={editingWarehouse.description}
                  onChange={(e) => setEditingWarehouse({...editingWarehouse, description: e.target.value})}
                  placeholder="Brief description of warehouse services"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWarehouseDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveWarehouse}>
              {editingWarehouse?.id === undefined ? "Add Warehouse" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regional Rule Edit Dialog */}
      <Dialog open={isRegionalRuleDialogOpen} onOpenChange={setIsRegionalRuleDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRegionalRule?.id === 0 ? "Add Regional Rule" : "Edit Regional Rule"}
            </DialogTitle>
            <DialogDescription>
              Configure shipping mark formatting for specific regions.
            </DialogDescription>
          </DialogHeader>
          {editingRegionalRule && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ruleCountry">Country</Label>
                <Select 
                  value={editingRegionalRule.country} 
                  onValueChange={(value) => setEditingRegionalRule({...editingRegionalRule, country: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ghana">🇬🇭 Ghana</SelectItem>
                    <SelectItem value="Nigeria">🇳🇬 Nigeria</SelectItem>
                    <SelectItem value="China">🇨🇳 China</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ruleRegion">State/Region</Label>
                <Select 
                  value={editingRegionalRule.region} 
                  onValueChange={(value) => setEditingRegionalRule({...editingRegionalRule, region: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {editingRegionalRule.country === "Ghana" && (
                      <>
                        <SelectItem value="GREATER_ACCRA">Greater Accra</SelectItem>
                        <SelectItem value="ASHANTI">Ashanti</SelectItem>
                        <SelectItem value="NORTHERN">Northern</SelectItem>
                        <SelectItem value="EASTERN">Eastern</SelectItem>
                        <SelectItem value="WESTERN">Western</SelectItem>
                        <SelectItem value="CENTRAL">Central</SelectItem>
                        <SelectItem value="VOLTA">Volta</SelectItem>
                        <SelectItem value="UPPER_EAST">Upper East</SelectItem>
                        <SelectItem value="UPPER_WEST">Upper West</SelectItem>
                        <SelectItem value="BRONG_AHAFO">Brong Ahafo</SelectItem>
                        <SelectItem value="WESTERN_NORTH">Western North</SelectItem>
                        <SelectItem value="AHAFO">Ahafo</SelectItem>
                        <SelectItem value="BONO">Bono</SelectItem>
                        <SelectItem value="BONO_EAST">Bono East</SelectItem>
                        <SelectItem value="OTI">Oti</SelectItem>
                        <SelectItem value="NORTH_EAST">North East</SelectItem>
                        <SelectItem value="SAVANNAH">Savannah</SelectItem>
                      </>
                    )}
                    {editingRegionalRule.country === "Nigeria" && (
                      <>
                        <SelectItem value="Lagos">Lagos</SelectItem>
                        <SelectItem value="Abuja">Abuja</SelectItem>
                        <SelectItem value="Kano">Kano</SelectItem>
                        <SelectItem value="Rivers">Rivers</SelectItem>
                      </>
                    )}
                    {editingRegionalRule.country === "China" && (
                      <>
                        <SelectItem value="Guangdong">Guangdong</SelectItem>
                        <SelectItem value="Shanghai">Shanghai</SelectItem>
                        <SelectItem value="Beijing">Beijing</SelectItem>
                        <SelectItem value="Zhejiang">Zhejiang</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rulePrefixValue">Prefix Value</Label>
                <Input
                  id="rulePrefixValue"
                  type="text"
                  maxLength={3}
                  value={editingRegionalRule.prefix_value}
                  onChange={(e) => setEditingRegionalRule({...editingRegionalRule, prefix_value: e.target.value})}
                  placeholder="e.g., 1, 2, A, GA, NR"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ruleIsActive"
                    checked={editingRegionalRule.is_active}
                    onCheckedChange={(checked) => setEditingRegionalRule({...editingRegionalRule, is_active: !!checked})}
                  />
                  <Label htmlFor="ruleIsActive">Active</Label>
                </div>
              </div>
              <div className="text-xs text-muted-foreground p-3 bg-muted rounded-lg">
                <strong>How it works:</strong> The system will use "DC{`{prefix value}`} {`{name}`}" as the shipping mark format. 
                For example, if Prefix Value is "1", shipping marks will be "DC1 JODO" (with space).
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRegionalRuleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRegionalRule}>
              {editingRegionalRule?.id === 0 ? "Add Rule" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 