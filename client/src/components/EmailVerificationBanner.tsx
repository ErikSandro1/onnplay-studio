import { useState } from 'react';
import { Mail, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface EmailVerificationBannerProps {
  email: string;
  onDismiss?: () => void;
}

export function EmailVerificationBanner({ email, onDismiss }: EmailVerificationBannerProps) {
  const [isResending, setIsResending] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    // Check if user has permanently dismissed the banner
    return localStorage.getItem('email_verification_banner_dismissed') === 'true';
  });

  const handleResend = async () => {
    setIsResending(true);
    try {
      const response = await fetch('/api/auth/send-verification-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (response.ok) {
        toast.success('Email de verificação enviado!');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Falha ao enviar email');
      }
    } catch (error) {
      toast.error('Erro ao enviar email de verificação');
    } finally {
      setIsResending(false);
    }
  };

  const handleDismiss = () => {
    // Save dismissal to localStorage so it persists
    localStorage.setItem('email_verification_banner_dismissed', 'true');
    setIsDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  if (isDismissed) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 border border-orange-500/30 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <Mail className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-white mb-1">
            Verifique seu email
          </h3>
          <p className="text-sm text-gray-300 mb-3">
            Enviamos um link de verificação para <strong>{email}</strong>. 
            Por favor, verifique sua caixa de entrada e spam.
          </p>
          <button
            onClick={handleResend}
            disabled={isResending}
            className="text-sm font-medium text-orange-500 hover:text-orange-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isResending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando...
              </>
            ) : (
              'Reenviar email de verificação'
            )}
          </button>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
