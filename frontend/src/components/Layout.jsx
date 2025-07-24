import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import Footer from "./Footer";
import Sidebar from "./Sidebar";

function Layout({ children, currentPage, onPageChange }) {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const handlePageChange = (page) => {
    onPageChange(page);
    // Close sidebar on mobile when navigating
    setSidebarOpen(false);
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

  const handleLogout = async () => {
    try {
      setLoading(true);
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
        currentPage={currentPage} 
        onPageChange={handlePageChange}
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                {/* Mobile menu button */}
                <button
                  onClick={toggleSidebar}
                  className="lg:hidden mr-3 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
                  {getPageTitle()}
                </h1>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-4">
                <span className="text-xs sm:text-sm text-gray-700">
                  Welcome, {user?.first_name || user?.phone || 'User'}
                </span>
                <button
                  onClick={handleLogout}
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? 'Logging out...' : 'Logout'}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </main>

        <Footer />
      </div>
    </div>
  );
}

export default Layout;
