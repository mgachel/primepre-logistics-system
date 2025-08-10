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
import { Bell, User, ChevronDown } from 'lucide-react';
import { GlobalSearch } from '@/components/GlobalSearch';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface AppHeaderProps {
  sidebarCollapsed: boolean;
  onToggle: () => void;
  isMobile: boolean;
  mobileMenuOpen: boolean;
}

export function AppHeader({ sidebarCollapsed, onToggle, isMobile, mobileMenuOpen }: AppHeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-20 h-16 bg-background border-b border-border transition-all duration-300",
        isMobile ? "left-0" : sidebarCollapsed ? "left-sidebar-collapsed" : "left-sidebar"
      )}
    >
      <div className="flex h-full items-center justify-between px-6">
        {/* Mobile hamburger menu */}
        {isMobile && (
          <button
            onClick={onToggle}
            className="p-2 rounded-md hover:bg-muted transition-colors md:hidden"
            aria-label="Toggle mobile menu"
            title="Toggle mobile menu"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        )}

        {/* Desktop sidebar toggle */}
        {!isMobile && (
          <button
            onClick={onToggle}
            className="p-2 rounded-md hover:bg-muted transition-colors"
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        )}

        {/* Search */}
        <div className={cn("flex-1", isMobile ? "ml-2" : "max-w-md")}> 
          <div className="flex items-center">
            <GlobalSearch />
            <span className="ml-2 hidden md:inline text-xs text-muted-foreground">Search tracking IDs, clients, containers, routes</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="relative" 
            onClick={() => navigate('/notifications')}
            aria-label="Notifications"
            title="View notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full"></span>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center space-x-2"
                aria-label="User menu"
                title="Open user menu"
              >
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-sm font-medium">{user?.full_name || `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || 'User'}</div>
                  <div className="text-xs text-muted-foreground">{user?.email || 'user@example.com'}</div>
                </div>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')}>Profile Settings</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/notifications')}>Notifications</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/support')}>Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}