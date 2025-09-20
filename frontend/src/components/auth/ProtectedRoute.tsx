// src/components/auth/ProtectedRoute.tsx
import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export const ProtectedRoute = ({ 
  children, 
  requireAuth = true, 
  redirectTo = '/login' 
}: ProtectedRouteProps) => {
  const { isAuthenticated, user } = useAuthStore();
  const { getDashboardUrl } = useAuth();
  const location = useLocation();

  console.log('🛡️ ProtectedRoute check:', {
    requireAuth,
    isAuthenticated,
    userRole: user?.user_role,
    location: location.pathname
  });

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    console.log('🚫 ProtectedRoute: User not authenticated, redirecting to login');
    // Save the current location to redirect back after login
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // If user is authenticated but accessing auth pages, redirect to appropriate dashboard
  if (!requireAuth && isAuthenticated) {
    console.log('✅ ProtectedRoute: User authenticated, redirecting from auth page');
    const dashboardUrl = getDashboardUrl();
    console.log(`🔄 ProtectedRoute: Redirecting to dashboard: ${dashboardUrl}`);
    return <Navigate to={dashboardUrl} replace />;
  }

  console.log('✅ ProtectedRoute: Access granted');
  return <>{children}</>;
};

// Helper component for guest-only routes (login, signup, etc.)
export const GuestRoute = ({ children }: { children: ReactNode }) => {
  return (
    <ProtectedRoute requireAuth={false}>
      {children}
    </ProtectedRoute>
  );
};