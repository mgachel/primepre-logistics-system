export interface WarehouseAddress {
  id: number;
  name: string;
  type: 'SEA' | 'AIR' | 'GENERAL';
  country: string;
  address: string;
  phone?: string;
  email?: string;
  operatingHours?: string;
  description?: string;
  route?: string;
}

class AddressesService {
  async getWarehouseAddresses(): Promise<WarehouseAddress[]> {
    try {
      // In a real app, this would fetch from admin settings API
      // For now, return the mock data as if it came from the backend
      return [
        {
          id: 1,
          name: "Ghana Main Warehouse",
          type: "SEA",
          country: "Ghana",
          address: "Industrial Area, Tema Port, P.O. Box 123, Tema, Ghana",
          phone: "+233 30 202 1234",
          email: "ghana@primepre.com",
          operatingHours: "Mon-Fri: 8:00 AM - 6:00 PM, Sat: 8:00 AM - 2:00 PM",
          description: "Primary receiving facility for sea cargo from China",
          route: "China → Ghana (Sea Freight)"
        },
        {
          id: 2,
          name: "Kotoka Airport Warehouse",
          type: "AIR",
          country: "Ghana", 
          address: "Kotoka International Airport, Cargo Village, Accra, Ghana",
          phone: "+233 30 277 6543",
          email: "air-ghana@primepre.com",
          operatingHours: "24/7 (Advance booking required for weekends)",
          description: "Air cargo receiving and processing facility",
          route: "China → Ghana (Air Freight)"
        },
        {
          id: 3,
          name: "China Consolidation Center",
          type: "GENERAL",
          country: "China",
          address: "Building 15, Yiwu International Trade Mart, Yiwu City, Zhejiang Province, China",
          phone: "+86 579 8552 7890",
          email: "china@primepre.com", 
          operatingHours: "Mon-Sat: 9:00 AM - 8:00 PM (China Time)",
          description: "Consolidation and packaging facility for outbound shipments",
          route: "Collection Point → Ghana"
        },
        {
          id: 4,
          name: "Kumasi Regional Office",
          type: "GENERAL",
          country: "Ghana",
          address: "Ashanti New Town, Near Kumasi Central Market, Kumasi, Ghana",
          phone: "+233 32 204 5678",
          email: "kumasi@primepre.com",
          operatingHours: "Mon-Fri: 8:00 AM - 5:00 PM",
          description: "Regional pickup and customer service center",
          route: "Local Distribution Hub"
        }
      ];
    } catch (error) {
      console.error('Error fetching warehouse addresses:', error);
      throw error;
    }
  }
}

export const addressesService = new AddressesService();