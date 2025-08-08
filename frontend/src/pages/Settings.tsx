import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Phone, Mail, Building, MessageSquare, Package, CreditCard } from "lucide-react";

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Update meta data on pdfs and view data on your package
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="invoice">Invoice Meta</TabsTrigger>
          <TabsTrigger value="shipping">Shipping Routes</TabsTrigger>
          <TabsTrigger value="company">Company Office</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-6 mt-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">General Settings</h2>
            <p className="text-muted-foreground">
              Manage your account information and preferences
            </p>
          </div>

          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Your account details and company information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" value="WAVEMOVA" readOnly />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <div className="flex items-center gap-2">
                    <Input id="role" value="MANAGER" readOnly />
                    <Badge variant="secondary">MANAGER</Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Number
                  </Label>
                  <Input id="phone" value="0500006635" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </Label>
                  <Input id="email" value="jedzata@gmail.com" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="company" className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Company Name
                  </Label>
                  <Input id="company" value="Prime Pre Limited" />
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Account Status</h4>
                    <p className="text-sm text-muted-foreground">Your account is active and verified</p>
                  </div>
                  <Badge className="bg-success text-success-foreground">Active</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SMS Management
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                SMS Management
              </CardTitle>
              <CardDescription>
                Manage your SMS credits and sender ID
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="sender-id">Sender ID</Label>
                <Input id="sender-id" value="Primepre" />
              </div>

              <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CreditCard className="h-4 w-4" />
                  SMS Credits
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Available Credits</span>
                    <span className="font-semibold">4,974</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Bonus Credits</span>
                    <span className="font-semibold">0</span>
                  </div>
                </div>

                <Button className="w-full">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Buy SMS Credits
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">4,974</div>
                  <div className="text-sm text-muted-foreground">Total Available</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">Active</div>
                  <div className="text-sm text-muted-foreground">Service Status</div>
                </div>
              </div>
            </CardContent>
          </Card> */}

          {/* Unknown Packages */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-warning" />
                Unknown Packages
              </CardTitle>
              <CardDescription>
                Configure settings for packages without assigned clients
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="font-medium text-sm">Default Client Assignment</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  When packages arrive without a clear client assignment, they will be automatically assigned to the selected client account below.
                </p>
                
                <div className="space-y-2">
                  <Label htmlFor="default-client">Default Client Account</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Search and select a client account..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client1">Prime Pre Limited</SelectItem>
                      <SelectItem value="client2">Wavemova Logistics</SelectItem>
                      <SelectItem value="client3">Ocean Freight Co.</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="invoice" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Meta Settings</CardTitle>
              <CardDescription>Configure invoice metadata and templates</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Invoice meta settings will be configured here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="shipping" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Shipping Routes</CardTitle>
              <CardDescription>Manage shipping routes and destinations</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Shipping routes configuration will be available here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="company" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Office</CardTitle>
              <CardDescription>Company office settings and locations</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Company office settings will be configured here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}