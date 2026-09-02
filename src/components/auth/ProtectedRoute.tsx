import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireSupervisor?: boolean;
  roles?: Array<'parent' | 'teacher' | 'admin' | 'student'>;
}

export default function ProtectedRoute({ children, requireSupervisor = false, roles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, account } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold">Verifying credentials...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireSupervisor && account?.role === 'student') {
    return <Navigate to="/home" replace />;
  }

  if (roles && (!account || !roles.includes(account.role))) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
