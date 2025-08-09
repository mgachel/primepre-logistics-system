import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface RoleBasedRouteProps {
  adminComponent: React.ReactNode;
  customerComponent: React.ReactNode;
}

export function RoleBasedRoute({ adminComponent, customerComponent }: RoleBasedRouteProps) {
  const { user, isCustomer } = useAuth();

  // Check if user has admin-level access (ADMIN, MANAGER, STAFF, SUPER_ADMIN)
  const hasAdminAccess = user && ['ADMIN', 'MANAGER', 'STAFF', 'SUPER_ADMIN'].includes(user.user_role);

  if (hasAdminAccess) {
    return <>{adminComponent}</>;
  } else if (isCustomer()) {
    return <>{customerComponent}</>;
  }

  // Default fallback - show admin component (this shouldn't happen with proper auth)
  return <>{adminComponent}</>;
} 