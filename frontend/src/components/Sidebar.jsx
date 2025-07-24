import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import LogoHeader from './LogoHeader';

function Sidebar({ currentPage, onPageChange, isOpen, onToggle }) {
  const { user } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState({
    cargo: false,
    goodsReceived: false
  });

  const toggleMenu = (menuName) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuName]: !prev[menuName]
    }));
  };

  const SidebarItem = ({ icon, label, isActive = false, onClick, hasSubmenu = false, isExpanded = false }) => (
    <div 
      className={`flex items-center justify-between px-3 sm:px-4 py-3 cursor-pointer transition-colors duration-200 ${
        isActive ? 'bg-blue-500 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center space-x-3">
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <span className="text-sm font-medium truncate">{label}</span>
      </div>
      {hasSubmenu && (
        <svg 
          className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )}
    </div>
  );

  const SubMenuItem = ({ icon, label, isActive = false, onClick }) => (
    <div 
      className={`flex items-center space-x-3 px-3 sm:px-4 py-2 ml-6 sm:ml-8 cursor-pointer transition-colors duration-200 ${
        isActive ? 'bg-blue-500 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'
      }`}
      onClick={onClick}
    >
      <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <span className="text-sm truncate">{label}</span>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-30 
        w-64 sm:w-72 lg:w-80 bg-gray-800 min-h-screen flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 sm:py-6 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4 lg:hidden">
          <span className="text-white text-lg font-semibold">Menu</span>
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-white p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="bg-white rounded-lg p-3 sm:p-4">
          <LogoHeader />
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 py-4">
        <div className="space-y-1">
          {/* Dashboard */}
          <SidebarItem
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            }
            label="Dashboard"
            isActive={currentPage === 'dashboard'}
            onClick={() => onPageChange('dashboard')}
          />

          {/* Cargo */}
          <SidebarItem
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
            label="Cargo"
            hasSubmenu={true}
            isExpanded={expandedMenus.cargo}
            onClick={() => toggleMenu('cargo')}
          />
          
          {/* Cargo Submenus */}
          {expandedMenus.cargo && (
            <div className="bg-gray-750">
              <SubMenuItem
                icon={
                  <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
                    <path d="M4 17v1c0 .55.45 1 1 1h14c.55 0 1-.45 1-1v-1H4z"/>
                    <path d="M5.5 14h13l1.5-2h-16z"/>
                    <path d="M12 2l2 8-2 2-2-2z"/>
                    <path d="M4 12l2-6h12l2 6z"/>
                  </svg>
                }
                label="SEA"
                isActive={currentPage === 'cargo-sea'}
                onClick={() => onPageChange('cargo-sea')}
              />
              <SubMenuItem
                icon={
                  <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
                    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                  </svg>
                }
                label="AIR"
                isActive={currentPage === 'cargo-air'}
                onClick={() => onPageChange('cargo-air')}
              />
            </div>
          )}

          {/* Customers */}
          <SidebarItem
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            }
            label="Customers"
            isActive={currentPage === 'customers'}
            onClick={() => onPageChange('customers')}
          />

          {/* Goods Received */}
          <SidebarItem
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4m4-7h8m-4 0V3" />
              </svg>
            }
            label="Goods Received"
            hasSubmenu={true}
            isExpanded={expandedMenus.goodsReceived}
            onClick={() => toggleMenu('goodsReceived')}
          />

          {/* Goods Received Submenus */}
          {expandedMenus.goodsReceived && (
            <div className="bg-gray-750">
              <SubMenuItem
                icon={
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                }
                label="China warehouse"
                isActive={currentPage === 'goods-received-china'}
                onClick={() => onPageChange('goods-received-china')}
              />
              <SubMenuItem
                icon={
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                }
                label="Ghana warehouse"
                isActive={currentPage === 'goods-received-ghana'}
                onClick={() => onPageChange('goods-received-ghana')}
              />
            </div>
          )}

          {/* Rates */}
          <SidebarItem
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            }
            label="Rates"
            isActive={currentPage === 'rates'}
            onClick={() => onPageChange('rates')}
          />
        </div>
      </nav>

      {/* User Profile Section */}
      <div className="border-t border-gray-700 p-3 sm:p-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-600 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
            {user?.profile_picture ? (
              <img 
                src={user.profile_picture} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white text-xs sm:text-sm font-medium">
                {user?.first_name && user?.last_name 
                  ? `${user.first_name[0]}${user.last_name[0]}` 
                  : user?.first_name?.[0] || user?.phone?.[0] || 'U'}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs sm:text-sm font-medium truncate">
              {user?.first_name && user?.last_name 
                ? `${user.first_name} ${user.last_name}` 
                : user?.first_name || user?.phone || 'AGYEKUM NOVA'}
            </p>
            <p className="text-gray-400 text-xs truncate">
              {user?.user_role || user?.user_type || 'Project Manager'}
            </p>
          </div>
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      </div>
    </>
  );
}

export default Sidebar;
