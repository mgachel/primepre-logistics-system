import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import LogoHeader from "../components/LogoHeader";
import Footer from "../components/Footer";
import Sidebar from "../components/Sidebar";

function Dashboard() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
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
        return 'China Warehouse - Goods Received';
      case 'goods-received-ghana':
        return 'Ghana Warehouse - Goods Received';
      case 'rates':
        return 'Shipping Rates';
      default:
        return 'Dashboard';
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
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

  const renderPageContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <>
            <div className="mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Welcome to Your Dashboard</h2>
              <p className="text-sm sm:text-base text-gray-600">
                This is your logistics management dashboard. More features will be added soon.
              </p>
            </div>

            {/* Dashboard Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {/* Profile Card */}
              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">Profile</h3>
                    <p className="text-sm text-gray-500">Manage your account</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <p className="text-sm"><span className="font-medium">Name:</span> {user?.first_name} {user?.last_name}</p>
                  <p className="text-sm"><span className="font-medium">Phone:</span> {user?.phone}</p>
                  <p className="text-sm"><span className="font-medium">Email:</span> {user?.email}</p>
                  <p className="text-sm"><span className="font-medium">Region:</span> {user?.region}</p>
                  <p className="text-sm"><span className="font-medium">Type:</span> {user?.user_type}</p>
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
                    <p className="text-sm text-gray-500">Coming soon</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-600">
                    Logistics management features will be available here.
                  </p>
                </div>
              </div>

              {/* System Status Card */}
              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">System Status</h3>
                    <p className="text-sm text-gray-500">All systems operational</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-600">Authentication: Online</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
              </div>
              <div className="px-4 sm:px-6 py-4">
                <div className="text-sm text-gray-500 text-center py-8">
                  No recent activity to display. Start using the system to see your activity here.
                </div>
              </div>
            </div>
          </>
        );
      
      case 'cargo-sea':
        return (
          <div className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Sea Cargo Management</h2>
            <p className="text-sm sm:text-base text-gray-600">
              Manage your sea freight shipments here. This page will be created later.
            </p>
          </div>
        );
      
      case 'cargo-air':
        return (
          <div className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Air Cargo Management</h2>
            <p className="text-sm sm:text-base text-gray-600">
              Manage your air freight shipments here. This page will be created later.
            </p>
          </div>
        );
      
      case 'customers':
        return (
          <div className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Customer Management</h2>
            <p className="text-sm sm:text-base text-gray-600">
              Manage your customers here. This page will be created later.
            </p>
          </div>
        );
      
      case 'goods-received-china':
        return (
          <div className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">China Warehouse - Goods Received</h2>
            <p className="text-sm sm:text-base text-gray-600">
              Track goods received at the China warehouse. This page will be created later.
            </p>
          </div>
        );
      
      case 'goods-received-ghana':
        return (
          <div className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Ghana Warehouse - Goods Received</h2>
            <p className="text-sm sm:text-base text-gray-600">
              Track goods received at the Ghana warehouse. This page will be created later.
            </p>
          </div>
        );
      
      case 'rates':
        return (
          <div className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Shipping Rates</h2>
            <p className="text-sm sm:text-base text-gray-600">
              View and manage shipping rates here. This page will be created later.
            </p>
          </div>
        );
      
      default:
        return (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h2>
            <p className="text-gray-600">
              The requested page could not be found.
            </p>
          </div>
        );
    }
  };

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
        {renderPageContent()}
      </main>

      <Footer />
      </div>
    </div>
  );
}

export default Dashboard;
