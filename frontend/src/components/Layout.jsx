import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Footer from "./Footer";
import Sidebar from "./Sidebar";
import Header from "./Header";

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const getCurrentPage = () => {
    const path = location.pathname;
    if (path.includes("/dashboard/overview")) return "dashboard";
    if (path.includes("/dashboard/cargo-sea")) return "cargo-sea";
    if (path.includes("/dashboard/cargo-air")) return "cargo-air";
    if (path.includes("/dashboard/customers")) return "customers";
    if (path.includes("/dashboard/goods-received-china"))
      return "goods-received-china";
    if (path.includes("/dashboard/goods-received-ghana"))
      return "goods-received-ghana";
    if (path.includes("/dashboard/rates")) return "rates";
    return "dashboard";
  };

  const currentPage = getCurrentPage();

  const getPageTitle = () => {
    switch (currentPage) {
      case "dashboard":
        return "Dashboard";
      case "cargo-sea":
        return "Sea Cargo Management";
      case "cargo-air":
        return "Air Cargo Management";
      case "customers":
        return "Customer Management";
      case "goods-received-china":
        return "China Warehouse";
      case "goods-received-ghana":
        return "Ghana Warehouse";
      case "rates":
        return "Shipping Rates";
      default:
        return "Dashboard";
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Close sidebar on large screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        // lg breakpoint
        setSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Check initial size

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Static Sidebar */}
      <div className="hidden lg:block">
        <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      </div>

      {/* Main Content Area with its own scroll */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Header */}
        <Header onToggleSidebar={toggleSidebar} pageTitle={getPageTitle()} />

        {/* Main Content */}
        <main className="flex-1 w-full mx-auto py-2 sm:py-4 lg:py-6 px-2 sm:px-4 lg:px-6 xl:px-8 max-w-full">
          {children}
        </main>

        <Footer />
      </div>
    </div>
  );
}

export default Layout;
