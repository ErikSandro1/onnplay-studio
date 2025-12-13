import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../contexts/AuthContext';
import { useUsageLimits } from '../hooks/useUsageLimits';
import {
  Radio,
  User,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  Crown,
  Zap,
  Calendar,
  Clock,
  TrendingUp,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Subscription {
  id: string;
  plan: 'free' | 'pro' | 'enterprise';
  status: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

interface Usage {
  streaming_minutes: number;
  recording_minutes: number;
  ai_commands_count: number;
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user, token, logout, isLoading: authLoading } = useAuth();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { summary: usageSummary, isLoading: usageLoading } = useUsageLimits();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    } else if (user) {
      fetchData();
    }
  }, [user, authLoading, navigate]);

  const fetchData = async () => {
    try {
      // Fetch subscription
      const subResponse = await fetch(`${API_URL}/payments/subscription`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (subResponse.ok) {
        const subData = await subResponse.json();
        setSubscription(subData.subscription);
      }

      // Usage data is now fetched via useUsageLimits hook
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch(`${API_URL}/payments/create-portal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create portal session');
      }

      // Redirect to Stripe customer portal
      window.location.href = data.url;
    } catch (error: any) {
      toast.error(error.message || 'Erro ao abrir portal de pagamentos');
      setIsProcessing(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'pro':
        return <Zap className="w-5 h-5 text-orange-500" />;
      case 'enterprise':
        return <Crown className="w-5 h-5 text-yellow-500" />;
      default:
        return <Radio className="w-5 h-5 text-gray-400" />;
    }
  };

  const getPlanName = (plan: string) => {
    switch (plan) {
      case 'pro':
        return 'Pro';
      case 'enterprise':
        return 'Enterprise';
      default:
        return 'Free';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'pro':
        return 'from-orange-500/20 to-orange-600/20 border-orange-500';
      case 'enterprise':
        return 'from-yellow-500/20 to-yellow-600/20 border-yellow-500';
      default:
        return 'from-gray-500/20 to-gray-600/20 border-gray-500';
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
      </div>
    );
  }

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
              <p className="text-xs text-gray-400">Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/studio')}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-medium transition-colors"
            >
              Abrir Estúdio
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Olá, {user?.name}! 👋</h2>
          <p className="text-gray-400">
            Gerencie sua conta e acompanhe seu uso do OnnPlay Studio
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Account Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-2xl font-bold">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{user?.name}</h3>
                  <p className="text-sm text-gray-400">{user?.email}</p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => toast.info('Em breve!')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-left"
                >
                  <User className="w-5 h-5 text-gray-400" />
                  <span>Editar Perfil</span>
                </button>
                <button
                  onClick={() => toast.info('Em breve!')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-left"
                >
                  <Settings className="w-5 h-5 text-gray-400" />
                  <span>Configurações</span>
                </button>
              </div>
            </div>

            {/* Current Plan Card */}
            <div
              className={`bg-gradient-to-br ${getPlanColor(
                user?.plan || 'free'
              )} border-2 rounded-xl p-6`}
            >
              <div className="flex items-center gap-3 mb-4">
                {getPlanIcon(user?.plan || 'free')}
                <h3 className="text-xl font-bold">
                  Plano {getPlanName(user?.plan || 'free')}
                </h3>
              </div>

              {subscription && subscription.plan !== 'free' && (
                <div className="space-y-2 mb-6 text-sm">
                  <div className="flex items-center gap-2 text-gray-300">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Renova em{' '}
                      {new Date(
                        subscription.current_period_end
                      ).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  {subscription.cancel_at_period_end && (
                    <div className="px-3 py-2 bg-yellow-500/20 border border-yellow-500 rounded-lg text-yellow-500">
                      Cancelado - Acesso até o fim do período
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                {user?.plan === 'free' && (
                  <button
                    onClick={() => navigate('/pricing')}
                    className="w-full py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Fazer Upgrade
                  </button>
                )}
                {user?.plan !== 'free' && (
                  <button
                    onClick={handleManageSubscription}
                    disabled={isProcessing}
                    className="w-full py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Carregando...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        Gerenciar Assinatura
                        <ExternalLink className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={() => navigate('/pricing')}
                  className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Ver todos os planos
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Usage Stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* Usage Overview */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <BarChart3 className="w-6 h-6 text-orange-500" />
                <h3 className="text-xl font-bold">Uso deste mês</h3>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {/* Streaming Minutes */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-cyan-500" />
                    <span className="text-sm text-gray-400">Transmissão</span>
                  </div>
                  <div className="text-3xl font-bold mb-1">
                    {usageSummary?.usage.streamingMinutes || 0}
                    <span className="text-lg text-gray-400"> min</span>
                  </div>
                  {user?.plan === 'free' && usageSummary && (
                    <div className="mt-2">
                      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-500"
                          style={{
                            width: `${usageSummary.percentUsed.streaming}%`,
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {usageSummary.remaining.streamingMinutes} min restantes
                      </p>
                    </div>
                  )}
                </div>

                {/* Recording Minutes */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Radio className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-gray-400">Gravação</span>
                  </div>
                  <div className="text-3xl font-bold mb-1">
                    {usageSummary?.usage.recordingMinutes || 0}
                    <span className="text-lg text-gray-400"> min</span>
                  </div>
                  {user?.plan === 'free' ? (
                    <p className="text-xs text-gray-500 mt-2">
                      Disponível no plano Pro
                    </p>
                  ) : usageSummary?.limits.recordingMinutes === -1 ? (
                    <p className="text-xs text-green-500 mt-2">Ilimitado</p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-2">
                      {usageSummary?.remaining.recordingMinutes} min restantes
                    </p>
                  )}
                </div>

                {/* AI Commands */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-orange-500" />
                    <span className="text-sm text-gray-400">
                      Comandos AI
                    </span>
                  </div>
                  <div className="text-3xl font-bold mb-1">
                    {usageSummary?.usage.aiCommandsCount || 0}
                  </div>
                  {usageSummary?.limits.features.aiAssistant ? (
                    <p className="text-xs text-orange-500 mt-2">Ilimitado</p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-2">
                      Disponível no plano Pro
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <TrendingUp className="w-6 h-6 text-orange-500" />
                <h3 className="text-xl font-bold">Atividade Recente</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <Radio className="w-5 h-5 text-cyan-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Transmissão ao vivo</p>
                    <p className="text-sm text-gray-400">
                      YouTube • 45 minutos
                    </p>
                  </div>
                  <span className="text-sm text-gray-500">Há 2 dias</span>
                </div>

                <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Radio className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Gravação local</p>
                    <p className="text-sm text-gray-400">
                      Entrevista.mp4 • 30 minutos
                    </p>
                  </div>
                  <span className="text-sm text-gray-500">Há 5 dias</span>
                </div>

                <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-orange-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">AI Assistant usado</p>
                    <p className="text-sm text-gray-400">
                      127 comandos processados
                    </p>
                  </div>
                  <span className="text-sm text-gray-500">Este mês</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">Ações Rápidas</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <button
                  onClick={() => navigate('/studio')}
                  className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-lg transition-all"
                >
                  <Radio className="w-6 h-6" />
                  <div className="text-left">
                    <div className="font-semibold">Iniciar Transmissão</div>
                    <div className="text-sm opacity-90">
                      Abrir estúdio ao vivo
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/pricing')}
                  className="flex items-center gap-3 p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Crown className="w-6 h-6 text-yellow-500" />
                  <div className="text-left">
                    <div className="font-semibold">Fazer Upgrade</div>
                    <div className="text-sm text-gray-400">
                      Desbloquear recursos Pro
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
