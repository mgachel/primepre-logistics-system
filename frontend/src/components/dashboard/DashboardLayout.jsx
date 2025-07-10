import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  Package, 
  BarChart3, 
  AlertTriangle, 
  Truck, 
  Clock, 
  Menu, 
  X, 
  LogOut,
  User,
  Building2,
  Ship,
  Plane
} from 'lucide-react';
import authService from '../../services/authService';
import LogoHeader from '../LogoHeader';

const DashboardLayout = ({ children, title }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    
    // Demo notifications - in a real app, fetch these from an API
    setNotifications([
      { id: 1, type: 'info', message: 'New shipment received', time: '10m ago' },
      { id: 2, type: 'warning', message: 'Items flagged for review', time: '2h ago' },
      { id: 3, type: 'success', message: 'Order #4759 delivered', time: '5h ago' }
    ]);
  }, []);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  // Enhanced navigation with better organization
  const navigation = [
    {
      category: 'Dashboard',
      items: [
        {
          name: 'Overview',
          href: '/dashboard',
          icon: BarChart3,
          current: location.pathname === '/dashboard',
          description: 'System statistics and analytics'
        }
      ]
    },
    {
      category: 'Inventory Management',
      items: [
        {
          name: 'China Warehouse',
          href: '/dashboard/china',
          icon: Building2,
          current: location.pathname.startsWith('/dashboard/china'),
          description: 'China warehouse inventory'
        },
        {
          name: 'Ghana Warehouse', 
          href: '/dashboard/ghana',
          icon: Building2,
          current: location.pathname.startsWith('/dashboard/ghana'),
          description: 'Ghana warehouse inventory'
        }
      ]
    },
    {
      category: 'Logistics Operations',
      items: [
        {
          name: 'Ready for Shipping',
          href: '/dashboard/ready-shipping',
          icon: Ship,
          current: location.pathname === '/dashboard/ready-shipping',
          description: 'Items ready to be shipped'
        },
        {
          name: 'Flagged Items',
          href: '/dashboard/flagged',
          icon: AlertTriangle,
          current: location.pathname === '/dashboard/flagged',
          description: 'Items requiring attention'
        },
        {
          name: 'Overdue Items',
          href: '/dashboard/overdue',
          icon: Clock,
          current: location.pathname === '/dashboard/overdue',
          description: 'Items past their deadlines'
        }
      ]
    }
  ];

  const classNames = (...classes) => {
    return classes.filter(Boolean).join(' ');
  };
  
  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      // Implement search functionality here
      console.log('Searching for:', searchQuery);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      <div 
        className={`fixed inset-0 z-40 bg-gray-900 bg-opacity-50 transition-opacity ease-linear duration-300 ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`} 
        onClick={() => setSidebarOpen(false)} 
      />
      
      {/* Mobile sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col transform bg-white transition-transform ease-in-out duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:hidden`}
      >
        <div className="flex h-16 items-center justify-between px-3 border-b border-gray-100">
          <div className="flex items-center flex-grow">
            <div className="w-full max-w-[140px]">
              <LogoHeader />
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-gray-500 hover:text-gray-700 transition-colors ml-2"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-4">
            {navigation.map((section) => (
              <div key={section.category}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
                  {section.category}
                </h3>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={classNames(
                        item.current ? 'sidebar-active' : 'sidebar-inactive',
                        'sidebar-item'
                      )}
                      onClick={() => setSidebarOpen(false)}
                      title={item.description}
                    >
                      <item.icon
                        className={classNames(
                          item.current ? 'text-white' : 'text-gray-500',
                          'mr-3 h-5 w-5 flex-shrink-0'
                        )}
                        aria-hidden="true"
                      />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="border-t border-gray-100 p-4">
          <div className="flex items-center space-x-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-primary-50 flex items-center justify-center">
              <User className="h-5 w-5 text-primary-600" />
            </div>
            {user && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.first_name} {user.last_name}
                </p>
                {user.shipping_mark && (
                  <p className="text-xs text-gray-500 truncate">
                    {user.shipping_mark}
                  </p>
                )}
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center py-2 px-4 border border-gray-200 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-10 lg:flex lg:w-72 lg:flex-col">
        <div className="flex flex-col flex-grow border-r border-gray-100 bg-white overflow-y-auto">
          <div className="flex h-16 flex-shrink-0 items-center justify-center px-4 border-b border-gray-100 pt-1">
            <div className="w-full max-w-[140px]">
              <LogoHeader />
            </div>
          </div>
          
          <div className="flex-1 flex flex-col p-4 space-y-5">
            {navigation.map((section) => (
              <div key={section.category}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-3">
                  {section.category}
                </h3>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={classNames(
                        item.current ? 'sidebar-active' : 'sidebar-inactive',
                        'sidebar-item group'
                      )}
                      title={item.description}
                    >
                      <item.icon
                        className={classNames(
                          item.current ? 'text-white' : 'text-gray-500 group-hover:text-primary-600',
                          'mr-3 h-5 w-5 flex-shrink-0 transition-colors'
                        )}
                        aria-hidden="true"
                      />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          <div className="border-t border-gray-100 p-4 mt-auto">
            {user && (
              <div className="flex items-center space-x-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-primary-50 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.first_name} {user.last_name}
                  </p>
                  {user.shipping_mark && (
                    <p className="text-xs text-gray-500 truncate">
                      {user.shipping_mark}
                    </p>
                  )}
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center py-2 px-4 border border-gray-200 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top header */}
        <header className="sticky top-0 z-30 flex h-16 items-center bg-white shadow-sm border-b border-gray-100">
          <div className="flex flex-1 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="text-gray-500 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 lg:hidden"
                aria-label="Open sidebar"
              >
                <Menu className="h-6 w-6" />
              </button>
              <h1 className="ml-4 text-lg font-semibold text-gray-900 lg:ml-0">
                {title || 'Dashboard'}
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Search box */}
              <div className="hidden md:block">
                <div className="relative">
                  <input
                    type="search"
                    placeholder="Search..."
                    className="form-control pl-10 w-72"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearch}
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Notifications */}
              <div className="relative">
                <button 
                  className="flex items-center justify-center h-9 w-9 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  onClick={() => setShowNotifications(!showNotifications)}
                  aria-label="View notifications"
                >
                  <div className="relative">
                    <svg className="h-6 w-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                    </svg>
                    {notifications.length > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
                        {notifications.length}
                      </span>
                    )}
                  </div>
                </button>
                
                {/* Notifications dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 z-10 mt-2 w-80 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="border-b border-gray-100 px-4 py-2">
                      <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="px-4 py-6 text-center text-sm text-gray-500">
                          No new notifications
                        </p>
                      ) : (
                        notifications.map((notification) => (
                          <a
                            key={notification.id}
                            href="#"
                            className="block px-4 py-3 hover:bg-gray-50"
                          >
                            <div className="flex items-start">
                              <div className="flex-shrink-0">
                                {notification.type === 'info' && (
                                  <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                                  </svg>
                                )}
                                {notification.type === 'warning' && (
                                  <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fillRule="evenodd" d="M8.485 3.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 3.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                  </svg>
                                )}
                                {notification.type === 'success' && (
                                  <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <div className="ml-3 w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900">{notification.message}</p>
                                <p className="mt-1 text-xs text-gray-500">{notification.time}</p>
                              </div>
                            </div>
                          </a>
                        ))
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <a href="#" className="block border-t border-gray-100 bg-gray-50 px-4 py-3 text-center text-sm font-medium text-gray-900 hover:bg-gray-100">
                        View all
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            {/* Page header section */}
            <div className="md:flex md:items-center md:justify-between mb-8 border-b border-gray-100 pb-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-semibold text-gray-900 leading-7">{title || 'Dashboard'}</h2>
                <p className="mt-1 text-sm text-gray-500 flex items-center">
                  <svg className="mr-1.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div className="mt-4 flex md:mt-0 md:ml-4 gap-3">
                <button className="btn-secondary inline-flex items-center">
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                  </svg>
                  Export
                </button>
                <button className="btn-primary inline-flex items-center">
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  New Item
                </button>
              </div>
            </div>
            
            {/* Main content */}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
