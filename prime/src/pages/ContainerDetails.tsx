import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Package, MapPin, Calendar, DollarSign, User, Phone, Mail } from 'lucide-react';

export default function ContainerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Mock data - in real app, fetch based on ID
  const container = {
    id: id || 'TC001',
    trackingNumber: 'MSKU7823456',
    type: 'Sea Cargo',
    status: 'in-transit',
    origin: 'Shanghai, China',
    destination: 'Tema, Ghana',
    departure: '2024-07-20',
    arrival: '2024-08-15',
    weight: '2,450 kg',
    volume: '45.2 CBM',
    value: '$125,750',
    client: {
      name: 'Global Traders Ltd',
      email: 'contact@globaltraders.com',
      phone: '+233 24 123 4567',
      address: 'Accra, Ghana'
    },
    contents: [
      { item: 'Electronics', quantity: '150 units', weight: '800 kg' },
      { item: 'Textiles', quantity: '500 pieces', weight: '1,200 kg' },
      { item: 'Machinery Parts', quantity: '25 units', weight: '450 kg' }
    ],
    documents: [
      { name: 'Bill of Lading', status: 'Verified', date: '2024-07-20' },
      { name: 'Commercial Invoice', status: 'Verified', date: '2024-07-20' },
      { name: 'Packing List', status: 'Verified', date: '2024-07-20' },
      { name: 'Insurance Certificate', status: 'Pending', date: '2024-07-21' }
    ]
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'in-transit': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'delayed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Container Details</h1>
          <p className="text-muted-foreground">
            Tracking ID: {container.trackingNumber}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Shipment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Type</p>
                  <p className="text-lg">{container.type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge className={getStatusColor(container.status)}>
                    {container.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Weight</p>
                  <p className="text-lg">{container.weight}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Volume</p>
                  <p className="text-lg">{container.volume}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Value</p>
                  <p className="text-lg font-semibold text-green-600">{container.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Route Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Route & Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Origin</p>
                  <p className="text-lg">{container.origin}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Departed: {container.departure}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Destination</p>
                  <p className="text-lg">{container.destination}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">ETA: {container.arrival}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cargo Contents */}
          <Card>
            <CardHeader>
              <CardTitle>Cargo Contents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {container.contents.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{item.item}</p>
                      <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium">{item.weight}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {container.documents.map((doc, index) => (
                  <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      <p className="text-sm text-muted-foreground">Date: {doc.date}</p>
                    </div>
                    <Badge className={getStatusColor(doc.status)}>
                      {doc.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Client Information */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Client Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-semibold text-lg">{container.client.name}</p>
                <p className="text-sm text-muted-foreground">{container.client.address}</p>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{container.client.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{container.client.phone}</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Update
                </Button>
                <Button variant="outline" size="sm" className="w-full">
                  <Phone className="h-4 w-4 mr-2" />
                  Call Client
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}