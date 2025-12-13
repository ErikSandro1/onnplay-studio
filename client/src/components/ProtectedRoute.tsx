import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useLocation } from 'wouter';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Save current location to redirect back after login
      sessionStorage.setItem('redirectAfterLogin', location);
      // Redirect to login
      navigate('/login-new');
    }
  }, [isLoading, isAuthenticated, location, navigate]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
          <p className="text-gray-400 text-sm">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - will redirect
  if (!isAuthenticated) {
    return (
      <div className="h-screen w-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
          <p className="text-gray-400 text-sm">Redirecionando para login...</p>
        </div>
      </div>
    );
  }

  // User is authenticated, render protected content
  return <>{children}</>;
}
