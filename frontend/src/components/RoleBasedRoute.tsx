import React from 'react';
import { useAuthStore } from '@/stores/authStore';

interface RoleBasedRouteProps {
  adminComponent: React.ReactNode;
  customerComponent: React.ReactNode;
}

export function RoleBasedRoute({ adminComponent, customerComponent }: RoleBasedRouteProps) {
  const { user } = useAuthStore();

  // Debug logging
  console.log('🔍 RoleBasedRoute - AuthStore user:', {
    user,
    userRole: user?.user_role,
  });

  // Use authStore for consistency with sidebar
  const isAdminFromStore = user && user.user_role && ['ADMIN', 'MANAGER', 'STAFF', 'SUPER_ADMIN'].includes(user.user_role);
  const isCustomerFromStore = user?.user_role === 'CUSTOMER';

  console.log('🔍 RoleBasedRoute - Role check:', {
    isAdminFromStore,
    isCustomerFromStore
  });

  // Use the store-based logic to match the sidebar
  if (isAdminFromStore) {
    console.log('✅ Routing to ADMIN dashboard (using authStore)');
    return <>{adminComponent}</>;
  } else if (isCustomerFromStore) {
    console.log('✅ Routing to CUSTOMER dashboard (using authStore)');
    return <>{customerComponent}</>;
  }

  // Default fallback - show customer component for authenticated users
  console.log('⚠️ Fallback to customer dashboard');
  return <>{customerComponent}</>;
} 