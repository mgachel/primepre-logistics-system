import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import LogoHeader from "./LogoHeader";

function Sidebar({ currentPage, onPageChange, isOpen, onToggle }) {
  const { user } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState({
    cargo: false,
    goodsReceived: false,
  });

  const toggleMenu = (menuName) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuName]: !prev[menuName],
    }));
  };

  const SidebarItem = ({
    icon,
    label,
    isActive = false,
    onClick,
    hasSubmenu = false,
    isExpanded = false,
  }) => (
    <div
      className={`flex items-center justify-between px-2 sm:px-3 lg:px-4 py-2.5 sm:py-3 cursor-pointer transition-colors duration-200 ${
        isActive
          ? "bg-blue-500 text-white"
          : "text-gray-300 hover:bg-gray-700 hover:text-white"
      }`}
      onClick={onClick}
    >
      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
        <div className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <span className="text-xs sm:text-sm font-medium truncate">{label}</span>
      </div>
      {hasSubmenu && (
        <svg
          className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-200 flex-shrink-0 ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      )}
    </div>
  );

  const SubMenuItem = ({ icon, label, isActive = false, onClick }) => (
    <div
      className={`flex items-center space-x-2 sm:space-x-3 px-2 sm:px-3 lg:px-4 py-2 ml-4 sm:ml-6 lg:ml-8 cursor-pointer transition-colors duration-200 ${
        isActive
          ? "bg-blue-500 text-white"
          : "text-gray-400 hover:bg-gray-700 hover:text-white"
      }`}
      onClick={onClick}
    >
      <div className="w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <span className="text-xs sm:text-sm truncate">{label}</span>
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
      <div
        className={`
        lg:sticky lg:top-0 lg:h-screen lg:flex-shrink-0
        w-56 sm:w-64 lg:w-72 xl:w-80 bg-gray-800 min-h-screen flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${
          isOpen
            ? "fixed inset-y-0 left-0 z-30 translate-x-0"
            : "fixed inset-y-0 left-0 z-30 -translate-x-full lg:static lg:translate-x-0"
        }
      `}
      >
        {/* Header */}
        <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6 border-b border-gray-700">
          <div className="flex items-center justify-between mb-3 lg:hidden">
            <span className="text-white text-base sm:text-lg font-semibold">
              Menu
            </span>
            <button
              onClick={onToggle}
              className="text-gray-400 hover:text-white p-2"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="bg-white rounded-lg p-2 sm:p-3 lg:p-4">
            <LogoHeader />
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 py-2 sm:py-4 overflow-y-auto">
          <div className="space-y-0.5 sm:space-y-1">
            {/* Dashboard */}
            <SidebarItem
              icon={
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              }
              label="Dashboard"
              isActive={currentPage === "dashboard"}
              onClick={() => onPageChange("dashboard")}
            />

            {/* Cargo */}
            <SidebarItem
              icon={
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              }
              label="Cargo"
              hasSubmenu={true}
              isExpanded={expandedMenus.cargo}
              onClick={() => toggleMenu("cargo")}
            />

            {/* Cargo Submenus */}
            {expandedMenus.cargo && (
              <div className="bg-gray-750">
                <SubMenuItem
                  icon={
                    <svg
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      className="w-4 h-4"
                    >
                      <path d="M4 17v1c0 .55.45 1 1 1h14c.55 0 1-.45 1-1v-1H4z" />
                      <path d="M5.5 14h13l1.5-2h-16z" />
                      <path d="M12 2l2 8-2 2-2-2z" />
                      <path d="M4 12l2-6h12l2 6z" />
                    </svg>
                  }
                  label="SEA"
                  isActive={currentPage === "cargo-sea"}
                  onClick={() => onPageChange("cargo-sea")}
                />
                <SubMenuItem
                  icon={
                    <svg
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      className="w-4 h-4"
                    >
                      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                    </svg>
                  }
                  label="AIR"
                  isActive={currentPage === "cargo-air"}
                  onClick={() => onPageChange("cargo-air")}
                />
              </div>
            )}

            {/* Customers */}
            <SidebarItem
              icon={
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <circle
                    cx="12"
                    cy="8"
                    r="4"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4 20c0-4 4-7 8-7s8 3 8 7"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
              label="Customers"
              isActive={currentPage === "customers"}
              onClick={() => onPageChange("customers")}
            />

            {/* Goods Received */}
            <SidebarItem
              icon={
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4m4-7h8m-4 0V3"
                  />
                </svg>
              }
              label="Goods Received"
              hasSubmenu={true}
              isExpanded={expandedMenus.goodsReceived}
              onClick={() => toggleMenu("goodsReceived")}
            />

            {/* Goods Received Submenus */}
            {expandedMenus.goodsReceived && (
              <div className="bg-gray-750">
                <SubMenuItem
                  icon={
                    // China flag SVG
                    <svg
                      viewBox="0 0 24 24"
                      className="w-4 h-4"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect width="24" height="24" fill="#DE2910" />
                      <polygon
                        points="4,4 5.2,7.2 8.6,7.2 5.8,9.2 7,12.4 4,10.2 1,12.4 2.2,9.2 0.4,7.2 3.8,7.2"
                        fill="#FFDE00"
                        transform="scale(1.2) translate(1,0)"
                      />
                      <circle cx="8.5" cy="5.5" r="0.7" fill="#FFDE00" />
                      <circle cx="7.2" cy="7.5" r="0.5" fill="#FFDE00" />
                      <circle cx="9.8" cy="7.5" r="0.5" fill="#FFDE00" />
                      <circle cx="7.8" cy="9.2" r="0.5" fill="#FFDE00" />
                      <circle cx="9.2" cy="9.2" r="0.5" fill="#FFDE00" />
                    </svg>
                  }
                  label="China warehouse"
                  isActive={currentPage === "goods-received-china"}
                  onClick={() => onPageChange("goods-received-china")}
                />
                <SubMenuItem
                  icon={
                    // Ghana flag SVG
                    <svg
                      viewBox="0 0 24 24"
                      className="w-4 h-4"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect width="24" height="8" y="0" fill="#EF2B2D" />
                      <rect width="24" height="8" y="8" fill="#FCD116" />
                      <rect width="24" height="8" y="16" fill="#009E49" />
                      <polygon
                        points="12,9 13,13 17,13 14,15 15,19 12,17 9,19 10,15 7,13 11,13"
                        fill="#000"
                      />
                    </svg>
                  }
                  label="Ghana warehouse"
                  isActive={currentPage === "goods-received-ghana"}
                  onClick={() => onPageChange("goods-received-ghana")}
                />
              </div>
            )}

            {/* Rates */}
            <SidebarItem
              icon={
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              }
              label="Rates"
              isActive={currentPage === "rates"}
              onClick={() => onPageChange("rates")}
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
                    : user?.first_name?.[0] || user?.phone?.[0] || "U"}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs sm:text-sm font-medium truncate">
                {user?.first_name && user?.last_name
                  ? `${user.first_name} ${user.last_name}`
                  : user?.first_name || user?.phone || "AGYEKUM NOVA"}
              </p>
              <p className="text-gray-400 text-xs truncate">
                {user?.user_role || user?.user_type || "Project Manager"}
              </p>
            </div>
            <svg
              className="w-4 h-4 text-gray-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>
    </>
  );
}

export default Sidebar;
