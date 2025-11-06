import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { User, ChevronDown } from 'lucide-react';
import { GlobalSearch } from '@/components/GlobalSearch';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

interface AppHeaderProps {
  sidebarCollapsed: boolean;
  onToggle: () => void;
  isMobile: boolean;
  mobileMenuOpen: boolean;
}

export function AppHeader({ sidebarCollapsed, onToggle, isMobile, mobileMenuOpen }: AppHeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  // Define primary color based on user role
  const primaryColor = user?.user_role?.toUpperCase() === "CUSTOMER" ? "#4FC3F7" : "#00703D"; // Light blue for customers, green for others

  const handleLogout = async () => {
    // Perform logout (clears auth state/storage), then navigate to login page
    await logout();
    navigate('/login');
  };

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-20 h-16 bg-background border-b border-border transition-all duration-300",
        isMobile ? "left-0 w-full" : sidebarCollapsed ? "left-sidebar-collapsed" : "left-sidebar"
      )}
    >
      <div className="flex h-full items-center justify-between px-3 sm:px-4 md:px-6">
        {/* Sidebar toggle replaced with Start button */}
        <button
          onClick={onToggle}
          style={{ backgroundColor: primaryColor }}
          className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-md text-primary-foreground hover:opacity-80 transition-colors text-sm sm:text-base font-semibold whitespace-nowrap"
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
        >
          Start
        </button>

        {/* Search or Logo */}
        {user?.user_role?.toUpperCase() === "CUSTOMER" ? (
          <div
            className={cn(
              "flex-1 flex justify-center",
              isMobile ? "ml-2 mr-2" : "mx-4 max-w-2xl"
            )}
          >
            <img
              src="/client search logo.png"
              alt="Client Search Logo"
              className="h-10"
            />
          </div>
        ) : (
          <div
            className={cn(
              "flex-1 flex",
              isMobile ? "ml-2 mr-2" : "mx-4 max-w-2xl"
            )}
          >
            <GlobalSearch variant="inline" />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3"
                aria-label="User menu"
                title="Open user menu"
              >
                <div
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: primaryColor }}
                >
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary-foreground" />
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-xs sm:text-sm font-medium">
                    {user?.user_role?.toUpperCase() === 'CUSTOMER' 
                      ? (user?.shipping_mark || user?.full_name || `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || 'Customer')
                      : (user?.user_role?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) || 'Staff')
                    }
                  </div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">
                    {user?.user_role?.toUpperCase() === 'CUSTOMER' 
                      ? (user?.full_name || `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || 'Customer')
                      : (user?.full_name || `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || user?.email || 'Staff Member')
                    }
                  </div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 sm:w-56">
              <DropdownMenuLabel className="text-xs sm:text-sm">My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')} className="text-xs sm:text-sm">Profile Settings</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/support')} className="text-xs sm:text-sm">Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive text-xs sm:text-sm" onClick={handleLogout}>
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}