import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../contexts/AuthContext';
import { Check, X, Radio, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface PlanFeature {
  name: string;
  free: boolean | string;
  pro: boolean | string;
}

const features: PlanFeature[] = [
  {
    name: 'Tempo de transmissão',
    free: '2h/mês',
    pro: 'Ilimitado',
  },
  {
    name: 'Qualidade máxima',
    free: '720p',
    pro: '1080p Full HD/4K',
  },
  {
    name: 'Participantes simultâneos',
    free: '3',
    pro: '20',
  },
  {
    name: 'Gravação local',
    free: false,
    pro: true,
  },
  {
    name: 'AI Studio Assistant',
    free: false,
    pro: true,
  },
  {
    name: 'Streaming multi-plataforma',
    free: true,
    pro: true,
  },
  {
    name: 'Mixer de áudio profissional',
    free: true,
    pro: true,
  },
  {
    name: 'Controle PTZ de câmeras',
    free: false,
    pro: true,
  },
  {
    name: 'Overlay de comentários',
    free: false,
    pro: true,
  },
  {
    name: 'Transições personalizadas',
    free: 'Básicas',
    pro: 'Todas',
  },
  {
    name: 'Suporte',
    free: 'Comunidade',
    pro: 'Email',
  },
  {
    name: 'Armazenamento na nuvem',
    free: false,
    pro: '100GB',
  },
];

export default function Pricing() {
  const [, navigate] = useLocation();
  const { isAuthenticated, user, token } = useAuth();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleSelectPlan = async (plan: 'free' | 'pro' | 'enterprise') => {
    if (!isAuthenticated) {
      toast.info('Faça login para selecionar um plano');
      navigate('/login');
      return;
    }

    if (plan === 'free') {
      toast.info('Você já está no plano Free!');
      return;
    }

    setIsLoading(plan);

    try {
      const response = await fetch(`${API_URL}/payments/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout');
      }

      // Redirect to Stripe checkout
      window.location.href = data.url;
    } catch (error: any) {
      toast.error(error.message || 'Erro ao processar pagamento');
      setIsLoading(null);
    }
  };

  const renderFeatureValue = (value: boolean | string) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="w-5 h-5 text-green-500 mx-auto" />
      ) : (
        <X className="w-5 h-5 text-gray-600 mx-auto" />
      );
    }
    return <span className="text-sm text-gray-300">{value}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">OnnPlay Studio</h1>
              <p className="text-xs text-gray-400">Planos e Preços</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-gray-400">
                  Olá, {user?.name}
                </span>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Dashboard
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="px-4 py-2 text-gray-400 hover:text-white text-sm font-medium transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-medium transition-colors"
                >
                  Começar Grátis
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-5xl font-bold mb-4">
          Escolha o plano ideal para você
        </h2>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Comece gratuitamente e faça upgrade quando precisar de mais recursos
          profissionais
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Free Plan */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <Radio className="w-8 h-8 text-gray-400" />
              <h3 className="text-2xl font-bold">Free</h3>
            </div>
            <div className="mb-6">
              <div className="text-4xl font-bold">$0</div>
              <div className="text-gray-400">Para sempre</div>
            </div>
            <button
              onClick={() => handleSelectPlan('free')}
              disabled={user?.plan === 'free'}
              className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {user?.plan === 'free' ? 'Plano Atual' : 'Começar Grátis'}
            </button>
            <div className="mt-8 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span>2 horas de transmissão/mês</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span>Qualidade até 720p</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span>Até 3 participantes</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span>Streaming multi-plataforma</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <X className="w-4 h-4" />
                <span>Sem AI Assistant</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <X className="w-4 h-4" />
                <span>Sem gravação</span>
              </div>
            </div>
          </div>

          {/* Pro Plan */}
          <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border-2 border-orange-500 rounded-2xl p-8 relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-orange-500 text-black text-sm font-bold rounded-full">
              MAIS POPULAR
            </div>
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-8 h-8 text-orange-500" />
              <h3 className="text-2xl font-bold">Pro</h3>
            </div>
            <div className="mb-6">
              <div className="text-4xl font-bold">$39</div>
              <div className="text-gray-400">por mês</div>
              <div className="text-sm text-orange-400 mt-1">ou $29/mês no plano anual</div>
            </div>
            <button
              onClick={() => handleSelectPlan('pro')}
              disabled={isLoading === 'pro' || user?.plan === 'pro'}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading === 'pro' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processando...
                </>
              ) : user?.plan === 'pro' ? (
                'Plano Atual'
              ) : (
                'Assinar Pro'
              )}
            </button>
            <div className="mt-8 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span className="font-semibold">Transmissão ilimitada</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span className="font-semibold">Qualidade 1080p Full HD/4K</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span className="font-semibold">Até 20 participantes</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span className="font-semibold">AI Studio Assistant</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span>Gravação local ilimitada</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span>Controle PTZ de câmeras</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span>Suporte por email</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Feature Comparison Table */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        <h3 className="text-3xl font-bold text-center mb-12">
          Comparação completa de recursos
        </h3>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="text-left p-4 font-semibold">Recurso</th>
                <th className="text-center p-4 font-semibold">Free</th>
                <th className="text-center p-4 font-semibold text-orange-500">
                  Pro
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature, index) => (
                <tr
                  key={index}
                  className="border-t border-gray-800 hover:bg-gray-800/50 transition-colors"
                >
                  <td className="p-4 text-gray-300">{feature.name}</td>
                  <td className="p-4 text-center">
                    {renderFeatureValue(feature.free)}
                  </td>
                  <td className="p-4 text-center">
                    {renderFeatureValue(feature.pro)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <h3 className="text-3xl font-bold text-center mb-12">
          Perguntas Frequentes
        </h3>
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h4 className="font-semibold mb-2">
              Posso cancelar minha assinatura a qualquer momento?
            </h4>
            <p className="text-gray-400">
              Sim! Você pode cancelar sua assinatura a qualquer momento pelo
              dashboard. Você continuará tendo acesso até o final do período
              pago.
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h4 className="font-semibold mb-2">
              Como funciona o limite de 1 hora no plano Free?
            </h4>
            <p className="text-gray-400">
              O limite é renovado mensalmente. Você pode transmitir até 1 hora
              por mês no total, dividido em quantas sessões quiser.
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h4 className="font-semibold mb-2">
              O que é o AI Studio Assistant?
            </h4>
            <p className="text-gray-400">
              É um assistente de IA que entende comandos em linguagem natural
              para controlar o estúdio. Por exemplo: "Zoom 2x na CAM 1", "Muda
              para layout PIP", etc.
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h4 className="font-semibold mb-2">
              Posso fazer upgrade ou downgrade do meu plano?
            </h4>
            <p className="text-gray-400">
              Sim! Você pode mudar de plano a qualquer momento. O upgrade é
              imediato e o downgrade ocorre no final do período de cobrança
              atual.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>© 2024 OnnPlay Studio. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
}
