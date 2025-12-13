import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useLocation } from 'wouter';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'user' | 'admin' | 'operator' | 'moderator';
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // Redirect to login
      window.location.href = getLoginUrl();
    }
  }, [loading, isAuthenticated]);

  // Show loading state while checking auth
  if (loading) {
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

  // Check role if required
  if (requiredRole && user?.role !== requiredRole && user?.role !== 'admin') {
    return (
      <div className="h-screen w-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center p-8">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="text-3xl">🚫</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Acesso Negado</h1>
          <p className="text-gray-400 max-w-md">
            Você não tem permissão para acessar esta página. 
            É necessário ter o papel de <strong className="text-orange-500">{requiredRole}</strong> ou superior.
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
          >
            Voltar ao Studio
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
