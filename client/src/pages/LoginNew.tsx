import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../contexts/AuthContext';
import { Radio, Tv, Users, Mic, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginNew() {
  const [, navigate] = useLocation();
  const { login, register, isAuthenticated, isLoading: authLoading } = useAuth();

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      // Check if there's a saved redirect location
      const redirectTo = sessionStorage.getItem('redirectAfterLogin');
      if (redirectTo) {
        sessionStorage.removeItem('redirectAfterLogin');
        navigate(redirectTo);
      } else {
        navigate('/studio');
      }
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLoginMode) {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      
      // Redirect to saved location or default to studio
      const redirectTo = sessionStorage.getItem('redirectAfterLogin');
      if (redirectTo) {
        sessionStorage.removeItem('redirectAfterLogin');
        navigate(redirectTo);
      } else {
        navigate('/studio');
      }
    } catch (error) {
      // Error already handled in AuthContext with toast
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen w-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex" style={{ background: '#0A0E1A' }}>
      {/* Left Side - Branding */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12" style={{ background: 'linear-gradient(to bottom right, #0A0E1A, #1E2842, #0A0E1A)' }}>
        <div className="max-w-lg">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-8">
            <img
              src="/logo-gold-clean-v2.png"
              alt="OnnPlay"
              className="h-40"
              style={{ filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.6))' }}
            />
            <div>
              <h1 className="text-3xl font-bold text-white">OnnPlay</h1>
              <p className="text-orange-500 font-semibold text-sm">STUDIO PRO</p>
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

      {/* Right Side - Login/Register Form */}
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

          {/* Login/Register Card */}
          <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">
                {isLoginMode ? 'Bem-vindo de volta' : 'Criar conta'}
              </h2>
              <p className="text-gray-400">
                {isLoginMode
                  ? 'Entre para acessar o estúdio de produção'
                  : 'Comece a transmitir profissionalmente'}
              </p>
            </div>

            {/* Toggle Buttons */}
            <div className="flex gap-2 mb-6 bg-gray-800 p-1 rounded-lg">
              <button
                onClick={() => setIsLoginMode(true)}
                className={`flex-1 py-2 rounded-md font-medium transition-all ${
                  isLoginMode
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setIsLoginMode(false)}
                className={`flex-1 py-2 rounded-md font-medium transition-all ${
                  !isLoginMode
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Criar Conta
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLoginMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-orange-500 focus:outline-none transition-colors"
                    placeholder="Seu nome"
                    required={!isLoginMode}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-orange-500 focus:outline-none transition-colors"
                  placeholder="seu@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-orange-500 focus:outline-none transition-colors"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
                {!isLoginMode && (
                  <p className="text-xs text-gray-500 mt-1">
                    Mínimo de 8 caracteres
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processando...
                  </>
                ) : isLoginMode ? (
                  'Entrar'
                ) : (
                  'Criar Conta'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-gray-800"></div>
              <span className="text-gray-500 text-sm">ou</span>
              <div className="flex-1 h-px bg-gray-800"></div>
            </div>

            {/* OAuth Buttons */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => toast.info('OAuth em breve!')}
                className="w-full py-3 bg-white hover:bg-gray-100 text-gray-900 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continuar com Google
              </button>

              <button
                type="button"
                onClick={() => toast.info('OAuth em breve!')}
                className="w-full py-3 bg-[#24292e] hover:bg-[#2f363d] text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                Continuar com GitHub
              </button>
            </div>

            {/* Footer Link */}
            <div className="mt-6 text-center text-sm text-gray-500">
              {isLoginMode ? (
                <p>
                  Não tem uma conta?{' '}
                  <button
                    onClick={() => setIsLoginMode(false)}
                    className="text-orange-500 hover:underline"
                  >
                    Criar conta grátis
                  </button>
                </p>
              ) : (
                <p>
                  Já tem uma conta?{' '}
                  <button
                    onClick={() => setIsLoginMode(true)}
                    className="text-orange-500 hover:underline"
                  >
                    Fazer login
                  </button>
                </p>
              )}
            </div>

            {/* Terms */}
            <p className="text-center text-gray-500 text-xs mt-6">
              Ao entrar, você concorda com nossos{' '}
              <a href="#" className="text-orange-500 hover:underline">
                Termos de Uso
              </a>{' '}
              e{' '}
              <a href="#" className="text-orange-500 hover:underline">
                Política de Privacidade
              </a>
            </p>
            
            {/* Support */}
            <div className="text-center mt-6 pt-6 border-t border-gray-800">
              <p className="text-gray-500 text-sm mb-2">Precisa de ajuda?</p>
              <a
                href="mailto:info@onnplay.com"
                className="text-orange-500 hover:text-orange-400 text-sm font-medium transition-colors"
              >
                📧 info@onnplay.com
              </a>
              <p className="text-gray-600 text-xs mt-2">Suporte via IA disponível 24/7</p>
            </div>
          </div>

          {/* View Pricing */}
          <div className="text-center mt-6">
            <button
              onClick={() => navigate('/pricing')}
              className="text-gray-500 hover:text-orange-500 text-sm transition-colors"
            >
              Ver planos e preços →
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-gray-600 text-sm mt-8">
            OnnPlay Studio v14.0 • Powered by Manus
          </p>
        </div>
      </div>
    </div>
  );
}
