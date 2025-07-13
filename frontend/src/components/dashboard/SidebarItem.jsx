import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ChevronDown } from 'lucide-react';

function SidebarItem({ icon, label, active = false, href, children, isDropdown = false, onClick }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    if (isDropdown) {
      setIsOpen(!isOpen);
    }
    if (onClick) {
      onClick();
    }
  };

  const baseClasses = `w-full flex items-center gap-4 px-6 py-3 cursor-pointer hover:bg-blue-700 transition-colors ${active ? "bg-blue-700" : ""}`;

  if (isDropdown) {
    return (
      <div className="w-full">
        <div
          className={baseClasses}
          onClick={handleClick}
        >
          <div className="text-lg">{icon}</div>
          <span className="text-sm font-medium flex-1">{label}</span>
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
        {isOpen && children && (
          <div className="bg-blue-800">
            {children}
          </div>
        )}
      </div>
    );
  }

  if (href) {
    return (
      <Link to={href} className={baseClasses}>
        <div className="text-lg">{icon}</div>
        <span className="text-sm font-medium">{label}</span>
      </Link>
    );
  }

  return (
    <div
      className={baseClasses}
      onClick={handleClick}
    >
      <div className="text-lg">{icon}</div>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

// Sub-item component for dropdown items
export function SidebarSubItem({ icon, label, href, active = false }) {
  return (
    <Link
      to={href}
      className={`w-full flex items-center gap-3 px-12 py-2 cursor-pointer hover:bg-blue-900 transition-colors text-sm ${
        active ? "bg-blue-900 text-white" : "text-blue-100"
      }`}
    >
      {icon && <div className="text-sm">{icon}</div>}
      <span className="font-medium">{label}</span>
    </Link>
  );
}

export default SidebarItem;
