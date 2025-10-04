import { 
  LayoutDashboard, 
  Users, 
  Ship, 
  Plane, 
  AlertTriangle, 
  Package, 
  MapPin, 
  Calculator, 
  Settings, 
  UserCog,
  Menu,
  X,
  ChevronDown,
  FileText,
  StickyNote,
  Bell,
  Warehouse
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuthStore } from "@/stores/authStore";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isMobile: boolean;
  mobileMenuOpen: boolean;
}

// Admin/Super Admin Navigation
const adminNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Client Announcements", href: "/admin/daily-updates", icon: Bell },
  { name: "Clients", href: "/clients", icon: Users },
  {
    name: "Cargo",
    children: [
      { name: "Sea Cargo", href: "/cargos/sea", icon: Ship },
      { name: "Air Cargo", href: "/cargos/air", icon: Plane },
    ],
  },
  {
    name: "Daily Updates",
    children: [
      { name: "China (All)", href: "/goods/china", icon: Package },
      { name: "China Sea", href: "/goods/china/sea", icon: Ship },
      { name: "China Air", href: "/goods/china/air", icon: Plane },
    ],
  },
  {
    name: "Local Warehouse",
    children: [
      { name: "Ghana Sea", href: "/goods/ghana/sea", icon: Ship },
      { name: "Ghana Air", href: "/goods/ghana/air", icon: Plane },
    ],
  },
  { name: "Claims", href: "/cargos/claims", icon: AlertTriangle },
  { name: "Rates", href: "/rates", icon: Calculator },
  { name: "Admins", href: "/my-admins", icon: UserCog },
  { name: "Notes", href: "/notes", icon: StickyNote },
  { name: "Settings", href: "/settings", icon: Settings },
];

// Customer Navigation
const customerNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  {
    name: "Local Warehouse",
    children: [
      { name: "Ghana Sea", href: "/goods/ghana/sea", icon: Ship },
      { name: "Ghana Air", href: "/goods/ghana/air", icon: Plane },
    ],
  },
  {
    name: "Daily Updates",
    children: [
      { name: "Air Goods Received", href: "/daily-updates/air-goods", icon: Plane },
      { name: "Sea Goods Received", href: "/daily-updates/sea-goods", icon: Ship },
    ],
  },
  {
    name: "Shipments",
    children: [
      { name: "Air Containers", href: "/shipments/air-containers", icon: Plane },
      { name: "Sea Containers", href: "/shipments/sea-containers", icon: Ship },
    ],
  },
  { name: "My Claims", href: "/my-claims", icon: FileText },
  { name: "My Notes", href: "/my-notes", icon: StickyNote },
  { name: "Rates", href: "/my-rates", icon: Calculator },
  { name: "Addresses", href: "/my-addresses", icon: MapPin },
  { name: "Profile", href: "/my-profile", icon: UserCog },
];

export function AppSidebar({ isCollapsed, onToggle, isMobile, mobileMenuOpen }: SidebarProps) {
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const { user } = useAuthStore();

  // Helper functions for role checking
  const isAdmin = () => user && user.user_role && ['ADMIN', 'MANAGER', 'STAFF', 'SUPER_ADMIN'].includes(user.user_role);
  const isCustomer = () => user && user.user_role === 'CUSTOMER';

  // Get navigation based on user role
  const getNavigation = () => {
    if (isAdmin()) {
      return adminNavigation;
    } else if (isCustomer()) {
      return customerNavigation;
    }
    // Default to admin navigation for fallback
    return adminNavigation;
  };

  const navigation = getNavigation();

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  const isGroupActive = (children: Array<{ href: string }>) => {
    return children.some((child) => isActive(child.href));
  };

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  return (
    <div
      className={cn(
        "fixed left-0 top-0 h-full bg-gray-200 border-r border-border transition-all duration-300",
        isMobile 
          ? mobileMenuOpen ? "w-sidebar z-50" : "-translate-x-full z-30"
          : isCollapsed ? "w-sidebar-collapsed z-30" : "w-sidebar z-30",
        "md:z-30"
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        <div className="flex items-center space-x-2">
          {(!isCollapsed || isMobile) && (
            <img src="/primepre-logo-1.png" alt="PRIMEPRE" className="h-8" />
          )}
        </div>
        {!isMobile ? (
          <button
            onClick={onToggle}
            className="p-2 rounded-md hover:bg-muted transition-colors"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <Menu className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </button>
        ) : (
          <button
            onClick={onToggle}
            className="p-2 rounded-md hover:bg-muted transition-colors"
            aria-label="Close sidebar"
            title="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          if (item.children) {
            const groupActive = isGroupActive(item.children);
            const isOpen = openGroups[item.name] || groupActive;
            
            return (
              <Collapsible key={item.name} open={isOpen} onOpenChange={() => toggleGroup(item.name)}>
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-muted",
                      groupActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                    aria-label={`Toggle ${item.name} section`}
                    title={`Toggle ${item.name} section`}
                  >
                    <span className="flex items-center">
                      {item.name === "Local Warehouse" || item.name === "Daily Updates" ? (
                        <Warehouse className="h-4 w-4 shrink-0" />
                      ) : (
                        <Package className="h-4 w-4 shrink-0" />
                      )}
                      {(!isCollapsed || isMobile) && <span className="ml-3">{item.name}</span>}
                    </span>
                    {(!isCollapsed || isMobile) && (
                      <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.href}
                      to={child.href}
                      onClick={() => isMobile && onToggle()}
                      className={cn(
                        "flex items-center px-3 py-2 ml-6 text-sm font-medium rounded-md transition-colors",
                        isActive(child.href)
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      <child.icon className="h-4 w-4 shrink-0" />
                      {(!isCollapsed || isMobile) && <span className="ml-3">{child.name}</span>}
                    </NavLink>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            );
          }

          return (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={() => isMobile && onToggle()}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive(item.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {(!isCollapsed || isMobile) && <span className="ml-3">{item.name}</span>}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}