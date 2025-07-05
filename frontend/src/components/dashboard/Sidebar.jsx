import SidebarItem from "./SidebarItem";
import { FaTachometerAlt, FaBox, FaTruck, FaCalculator, FaMapMarkerAlt, FaStore, FaFileAlt, FaCog } from "react-icons/fa";

function Sidebar() {
  return (
    <div className="w-64 h-screen bg-blue-600 text-white fixed top-0 left-0 flex flex-col items-center py-6">
      <div className="mb-8">
        {/* Replace with your logo image */}
        <div className="w-12 h-12 bg-white rounded-full mb-2"></div>
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
