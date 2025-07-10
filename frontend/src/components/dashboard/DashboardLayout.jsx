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

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
  }, []);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const navigation = [
    {
      name: 'Overview',
      href: '/dashboard',
      icon: BarChart3,
      current: location.pathname === '/dashboard'
    },
    {
      name: 'China Warehouse',
      href: '/dashboard/china',
      icon: Building2,
      current: location.pathname.startsWith('/dashboard/china')
    },
    {
      name: 'Ghana Warehouse', 
      href: '/dashboard/ghana',
      icon: Building2,
      current: location.pathname.startsWith('/dashboard/ghana')
    },
    {
      name: 'Ready for Shipping',
      href: '/dashboard/ready-shipping',
      icon: Ship,
      current: location.pathname === '/dashboard/ready-shipping'
    },
    {
      name: 'Flagged Items',
      href: '/dashboard/flagged',
      icon: AlertTriangle,
      current: location.pathname === '/dashboard/flagged'
    },
    {
      name: 'Overdue Items',
      href: '/dashboard/overdue',
      icon: Clock,
      current: location.pathname === '/dashboard/overdue'
    }
  ];

  const classNames = (...classes) => {
    return classes.filter(Boolean).join(' ');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl">
          <div className="flex h-20 items-center justify-between px-4 border-b border-gray-200">
            <div className="scale-90 transform-origin-center w-full">
              <LogoHeader />
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600 ml-2 flex-shrink-0"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={classNames(
                  item.current
                    ? 'bg-blue-50 border-r-4 border-blue-600 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-l-md'
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon
                  className={classNames(
                    item.current ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500',
                    'mr-3 h-6 w-6'
                  )}
                />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-1 flex-col bg-white shadow-lg">
          <div className="flex h-20 items-center px-4 border-b border-gray-200">
            <div className="scale-90 transform-origin-center w-full">
              <LogoHeader />
            </div>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={classNames(
                  item.current
                    ? 'bg-blue-50 border-r-4 border-blue-600 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-l-md'
                )}
              >
                <item.icon
                  className={classNames(
                    item.current ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500',
                    'mr-3 h-6 w-6'
                  )}
                />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <div className="sticky top-0 z-40 flex h-16 items-center justify-between bg-white px-4 shadow-sm lg:px-6">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-600 lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="ml-4 text-2xl font-semibold text-gray-900 lg:ml-0">
              {title || 'Dashboard'}
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {user && (
              <div className="hidden md:flex md:items-center md:space-x-2">
                <User className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-700">
                  {user.first_name} {user.last_name}
                </span>
                {user.shipping_mark && (
                  <span className="text-xs text-gray-500">
                    ({user.shipping_mark})
                  </span>
                )}
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="px-4 py-6 lg:px-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
