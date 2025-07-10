import SidebarItem from "./SidebarItem";
import { FaTachometerAlt, FaBox, FaTruck, FaCalculator, FaMapMarkerAlt, FaStore, FaFileAlt, FaCog } from "react-icons/fa";
import LogoHeader from "../LogoHeader";

function Sidebar() {
  return (
    <div className="w-64 h-screen bg-blue-600 text-white fixed top-0 left-0 flex flex-col items-center py-6">
      <div className="mb-8 px-4 w-full">
        <div className="scale-90 transform text-center">
          <LogoHeader />
        </div>
      </div>

      <SidebarItem icon={<FaTachometerAlt />} label="Dashboard" active />
      <SidebarItem icon={<FaBox />} label="Goods Received" />
      <SidebarItem icon={<FaTruck />} label="Shipment" />
      <SidebarItem icon={<FaCalculator />} label="Estimate Cost" />
      <SidebarItem icon={<FaMapMarkerAlt />} label="Addresses" />
      <SidebarItem icon={<FaStore />} label="Store" />
      <SidebarItem icon={<FaFileAlt />} label="Reports" />
      <SidebarItem icon={<FaCog />} label="Settings" />
    </div>
  );
}

export default Sidebar;
