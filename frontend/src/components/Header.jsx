import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

function Header({ onToggleSidebar, pageTitle }) {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);

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
    <header className="bg-white shadow-sm border-b sticky top-0 z-10">
      <div className="w-full mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Left side - Mobile menu + Title */}
          <div className="flex items-center flex-1 min-w-0">
            {/* Mobile menu button */}
            <button
              onClick={onToggleSidebar}
              className="lg:hidden mr-2 sm:mr-3 p-1.5 sm:p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 flex-shrink-0"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-sm sm:text-lg lg:text-xl font-semibold text-gray-900 truncate">
              {pageTitle}
            </h1>
          </div>

          {/* Center - Hello User (hidden on small screens) */}
          <div className="hidden md:flex flex-1 justify-center max-w-md">
            <h2 className="text-lg lg:text-xl xl:text-2xl font-bold text-gray-900 text-center truncate">
              Hello, {user?.first_name || user?.phone || 'John'} 👋
            </h2>
          </div>

          {/* Right side - Search + User Profile + Logout */}
          <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-3 flex-shrink-0">
            {/* Search Bar */}
            <div className="relative hidden lg:block">
              <input
                type="text"
                placeholder="Search"
                className="pl-8 pr-3 py-1.5 lg:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-32 xl:w-48 text-sm"
              />
              <svg className="absolute left-2.5 top-2 lg:top-2.5 h-4 w-4 lg:h-5 lg:w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Mobile Search Icon */}
            <button className="lg:hidden p-1.5 sm:p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* User Profile Picture */}
            <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-gray-600 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
              {user?.profile_picture ? (
                <img 
                  src={user.profile_picture} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-xs lg:text-sm font-medium">
                  {user?.first_name && user?.last_name 
                    ? `${user.first_name[0]}${user.last_name[0]}` 
                    : user?.first_name?.[0] || user?.phone?.[0] || 'J'}
                </span>
              )}
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors disabled:opacity-50 flex-shrink-0"
            >
              <span className="hidden sm:inline">{loading ? 'Logging out...' : 'Logout'}</span>
              <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
