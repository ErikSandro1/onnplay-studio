import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { CheckCircle, Loader2, Crown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

export default function CheckoutSuccess() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Get session_id from URL
    const params = new URLSearchParams(window.location.search);
    const session = params.get('session_id');
    
    if (session) {
      setSessionId(session);
      // Wait a bit for webhook to process
      setTimeout(() => {
        setLoading(false);
      }, 2000);
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <Loader2 className="w-16 h-16 text-purple-600 animate-spin" />
              <h2 className="text-2xl font-bold text-gray-900">
                Processando seu pagamento...
              </h2>
              <p className="text-gray-600">
                Aguarde enquanto confirmamos sua assinatura.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900">
            Bem-vindo ao PRO! 🎉
          </CardTitle>
          <CardDescription className="text-lg">
            Sua assinatura foi ativada com sucesso
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Success Message */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800 text-center">
              Parabéns! Agora você tem acesso a todos os recursos PRO do OnnPlay Studio.
            </p>
          </div>

          {/* Features Unlocked */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <Crown className="w-5 h-5 text-purple-600 mr-2" />
              Recursos Desbloqueados:
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span>Transmissão ilimitada</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span>Qualidade 1080p</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span>Até 10 participantes simultâneos</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span>Gravação de transmissões</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span>Suporte prioritário</span>
              </li>
            </ul>
          </div>

          {/* Session ID */}
          {sessionId && (
            <div className="text-xs text-gray-500 text-center">
              ID da Sessão: {sessionId.substring(0, 20)}...
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-4">
            <Button
              onClick={() => setLocation('/dashboard')}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Ir para o Dashboard
            </Button>
            <Button
              onClick={() => setLocation('/broadcast')}
              variant="outline"
              className="w-full"
            >
              Começar a Transmitir
            </Button>
          </div>

          {/* Support */}
          <p className="text-xs text-gray-500 text-center pt-4">
            Precisa de ajuda? Entre em contato com nosso{' '}
            <a href="mailto:support@onnplay.com" className="text-purple-600 hover:underline">
              suporte
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
