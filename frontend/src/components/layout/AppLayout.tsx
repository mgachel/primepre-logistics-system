import { useState, useEffect } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarCollapsed(true);
        setMobileMenuOpen(false);
      } else {
        setMobileMenuOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      {isMobile && mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden" 
          onClick={toggleSidebar}
        />
      )}
      
      <AppSidebar 
        isCollapsed={sidebarCollapsed} 
        onToggle={toggleSidebar}
        isMobile={isMobile}
        mobileMenuOpen={mobileMenuOpen}
      />
      <AppHeader 
        sidebarCollapsed={sidebarCollapsed} 
        onToggle={toggleSidebar}
        isMobile={isMobile}
        mobileMenuOpen={mobileMenuOpen}
      />
      
      <main
        className={cn(
          "pt-16 min-h-screen transition-all duration-300",
          isMobile 
            ? "ml-0 w-full" // Full width on mobile
            : sidebarCollapsed 
              ? "ml-sidebar-collapsed" 
              : "ml-sidebar"
        )}
      >
        <div className={cn(
          "p-3 sm:p-4 md:p-6",
          isMobile ? "max-w-full overflow-x-hidden" : ""
        )}>
          {children}
        </div>
      </main>
    </div>
  );
}