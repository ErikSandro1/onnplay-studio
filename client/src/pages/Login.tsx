import { getLoginUrl } from '@/const';
import { useAuth } from '@/_core/hooks/useAuth';
import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Loader2, Radio, Tv, Users, Mic } from 'lucide-react';

export default function Login() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/');
    }
  }, [loading, isAuthenticated, navigate]);

  const handleLogin = () => {
    window.location.href = getLoginUrl();
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-gray-950 flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-gray-900 via-gray-950 to-black items-center justify-center p-12">
        <div className="max-w-lg">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <Radio className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">OnnPlay</h1>
              <p className="text-orange-500 font-semibold">STUDIO PRO</p>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                <Tv className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Transmissão Profissional</h3>
                <p className="text-gray-400 text-sm">
                  Transmita para múltiplas plataformas simultaneamente com qualidade broadcast.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Videochamadas Integradas</h3>
                <p className="text-gray-400 text-sm">
                  Convide participantes e gerencie entrevistas ao vivo com Daily.co.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Mic className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Mixer de Áudio Avançado</h3>
                <p className="text-gray-400 text-sm">
                  Controle completo de áudio com EQ, compressor e efeitos em tempo real.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <Radio className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">OnnPlay</h1>
              <p className="text-orange-500 text-sm font-semibold">STUDIO PRO</p>
            </div>
          </div>

          {/* Login Card */}
          <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Bem-vindo de volta</h2>
              <p className="text-gray-400">Entre para acessar o estúdio de produção</p>
            </div>

            {/* Login Button */}
            <button
              onClick={handleLogin}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg shadow-orange-500/25"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
              </svg>
              Entrar com Manus
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-gray-800"></div>
              <span className="text-gray-500 text-sm">ou</span>
              <div className="flex-1 h-px bg-gray-800"></div>
            </div>

            {/* Demo Access */}
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-xl transition-colors border border-gray-700"
            >
              Acessar Demo (Sem Login)
            </button>

            {/* Terms */}
            <p className="text-center text-gray-500 text-xs mt-6">
              Ao entrar, você concorda com nossos{' '}
              <a href="#" className="text-orange-500 hover:underline">Termos de Uso</a>
              {' '}e{' '}
              <a href="#" className="text-orange-500 hover:underline">Política de Privacidade</a>
            </p>
          </div>

          {/* Footer */}
          <p className="text-center text-gray-600 text-sm mt-8">
            OnnPlay Studio v13.0 • Powered by Manus
          </p>
        </div>
      </div>
    </div>
  );
}
