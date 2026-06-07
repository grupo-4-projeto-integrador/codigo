import React, { ReactNode } from 'react';
import { useAuth, Role } from '../contexts/AuthContext';

interface RequireRoleProps {
  roles: Role[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequireRole({ roles, children, fallback = null }: RequireRoleProps) {
  const { role } = useAuth();
  
  if (!role || !roles.includes(role)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}
