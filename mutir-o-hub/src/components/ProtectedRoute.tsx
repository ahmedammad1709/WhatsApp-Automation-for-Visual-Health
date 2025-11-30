import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface Props { children: ReactNode }

export default function ProtectedRoute({ children }: Props) {
  const location = useLocation();
  const isAuth = typeof window !== 'undefined' && sessionStorage.getItem('auth') === 'true';
  if (!isAuth) return <Navigate to="/login" state={{ from: location }} replace />;
  return children as JSX.Element;
}
