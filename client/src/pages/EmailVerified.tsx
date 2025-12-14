import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function EmailVerified() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<'success' | 'error' | 'loading'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error = params.get('error');

    if (success === 'true') {
      setStatus('success');
      // Redirect to studio after 3 seconds
      setTimeout(() => {
        navigate('/studio');
      }, 3000);
    } else {
      setStatus('error');
      setErrorMessage(error ? decodeURIComponent(error) : 'Falha na verificação');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #0A0E1A 0%, #1E2842 100%)' }}>
      <div className="w-full max-w-md">
        <div className="bg-[#1E2842] rounded-2xl shadow-2xl p-8 border border-[#2A3F5F]">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF6B00 0%, #FF8533 100%)' }}>
                <span className="text-2xl">📻</span>
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>OnnPlay</h1>
                <p className="text-xs font-semibold" style={{ color: '#FF6B00' }}>STUDIO PRO</p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="text-center">
            {status === 'loading' && (
              <>
                <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin" style={{ color: '#FF6B00' }} />
                <h2 className="text-2xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
                  Verificando...
                </h2>
                <p style={{ color: '#B8C5D6' }}>
                  Aguarde enquanto verificamos seu email
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#10B981' }} />
                <h2 className="text-2xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
                  Email Verificado!
                </h2>
                <p style={{ color: '#B8C5D6' }} className="mb-4">
                  Seu email foi verificado com sucesso.
                </p>
                <p style={{ color: '#94A3B8' }} className="text-sm">
                  Redirecionando para o studio...
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <XCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#EF4444' }} />
                <h2 className="text-2xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
                  Erro na Verificação
                </h2>
                <p style={{ color: '#B8C5D6' }} className="mb-6">
                  {errorMessage}
                </p>
                <button
                  onClick={() => navigate('/studio')}
                  className="w-full py-3 rounded-lg font-semibold transition-all duration-200 hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #FF6B00 0%, #FF8533 100%)', color: '#FFFFFF' }}
                >
                  Ir para o Studio
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
