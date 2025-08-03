import { useState, useEffect } from "react";
import Footer from "./Footer";
import Sidebar from "./Sidebar";
import Header from "./Header";

function Layout({ children, currentPage, onPageChange }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handlePageChange = (page) => {
    onPageChange(page);
    // Close sidebar on mobile when navigating
    setSidebarOpen(false);
  };

  const getPageTitle = () => {
    switch (currentPage) {
      case 'dashboard':
        return 'Dashboard';
      case 'cargo-sea':
        return 'Sea Cargo Management';
      case 'cargo-air':
        return 'Air Cargo Management';
      case 'customers':
        return 'Customer Management';
      case 'goods-received-china':
        return 'China Warehouse';
      case 'goods-received-ghana':
        return 'Ghana Warehouse';
      case 'rates':
        return 'Shipping Rates';
      default:
        return 'Dashboard';
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Close sidebar on large screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) { // lg breakpoint
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Check initial size

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Static Sidebar */}
      <div className="hidden lg:block">
        <Sidebar 
          currentPage={currentPage} 
          onPageChange={handlePageChange}
          isOpen={sidebarOpen}
          onToggle={toggleSidebar}
        />
      </div>

      {/* Main Content Area with its own scroll */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Header */}
        <Header 
          onToggleSidebar={toggleSidebar}
          pageTitle={getPageTitle()}
        />

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
