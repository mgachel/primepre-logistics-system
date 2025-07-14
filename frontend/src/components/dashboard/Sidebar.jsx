import SidebarItem, { SidebarSubItem } from "./SidebarItem";
import { useLocation } from 'react-router-dom';
import { 
  FaTachometerAlt, 
  FaBox, 
  FaTruck, 
  FaCalculator, 
  FaMapMarkerAlt, 
  FaStore, 
  FaFileAlt, 
  FaCog,
  FaShip,
  FaPlane,
  FaContainerIcon,
  FaList,
  FaUsers
} from "react-icons/fa";
import { Package, BarChart3, Container, Ship, Plane } from 'lucide-react';
import LogoHeader from "../LogoHeader";

function Sidebar() {
  const location = useLocation();

  // Check if any cargo route is active
  const isCargoActive = location.pathname.startsWith('/cargo');

  return (
    <div className="w-64 h-screen bg-blue-600 text-white fixed top-0 left-0 flex flex-col items-center py-6 overflow-y-auto">
      <div className="mb-8 px-4 w-full">
        <div className="scale-90 transform text-center">
          <LogoHeader />
        </div>
      </div>

      <SidebarItem 
        icon={<FaTachometerAlt />} 
        label="Dashboard" 
        href="/dashboard"
        active={location.pathname === '/dashboard'}
      />
      
      <SidebarItem 
        icon={<FaBox />} 
        label="Goods Received" 
        href="/goods" 
        active={location.pathname.startsWith('/goods')}
      />
      
      <SidebarItem 
        icon={<Ship />} 
        label="Cargo Management" 
        isDropdown={true}
        active={isCargoActive}
      >
        <SidebarSubItem
          icon={<BarChart3 />}
          label="Cargo Dashboard"
          href="/cargo/dashboard"
          active={location.pathname === '/cargo/dashboard'}
        />
        <SidebarSubItem
          icon={<Container />}
          label="Container Management"
          href="/cargo/containers"
          active={location.pathname.startsWith('/cargo/containers')}
        />
        <SidebarSubItem
          icon={<Package />}
          label="Cargo Items"
          href="/cargo/items"
          active={location.pathname.startsWith('/cargo/items')}
        />
        <SidebarSubItem
          icon={<Ship />}
          label="Sea Cargo"
          href="/cargo/sea"
          active={location.pathname === '/cargo/sea'}
        />
        <SidebarSubItem
          icon={<Plane />}
          label="Air Cargo"
          href="/cargo/air"
          active={location.pathname === '/cargo/air'}
        />
        <SidebarSubItem
          icon={<FaUsers />}
          label="Client Summaries"
          href="/cargo/client-summaries"
          active={location.pathname === '/cargo/client-summaries'}
        />
      </SidebarItem>

      <SidebarItem 
        icon={<FaTruck />} 
        label="Shipment" 
        href="/shipment"
        active={location.pathname.startsWith('/shipment')}
      />
      
      <SidebarItem 
        icon={<FaCalculator />} 
        label="Estimate Cost" 
        href="/estimate"
        active={location.pathname.startsWith('/estimate')}
      />
      
      <SidebarItem 
        icon={<FaMapMarkerAlt />} 
        label="Addresses" 
        href="/addresses"
        active={location.pathname.startsWith('/addresses')}
      />
      
      <SidebarItem 
        icon={<FaStore />} 
        label="Store" 
        href="/store"
        active={location.pathname.startsWith('/store')}
      />
      
      <SidebarItem 
        icon={<FaFileAlt />} 
        label="Reports" 
        href="/reports"
        active={location.pathname.startsWith('/reports')}
      />
      
      <SidebarItem 
        icon={<FaCog />} 
        label="Settings" 
        href="/settings"
        active={location.pathname.startsWith('/settings')}
      />
    </div>
  );
}

export default Sidebar;
