import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Crown, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { UpgradeModal } from './UpgradeModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Subscription {
  id: string;
  status: string;
  plan: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export function SubscriptionManager() {
  const { user, token } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const response = await fetch(`${API_URL}/payments/subscription`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setActionLoading(true);
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
        throw new Error(data.error || 'Failed to open portal');
      }

      // Redirect to Stripe Customer Portal
      window.location.href = data.url;
    } catch (error: any) {
      toast.error(error.message || 'Erro ao abrir portal de gerenciamento');
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Tem certeza que deseja cancelar sua assinatura? Você ainda terá acesso até o final do período atual.')) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`${API_URL}/payments/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      toast.success('Assinatura cancelada com sucesso');
      fetchSubscription();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cancelar assinatura');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivateSubscription = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(`${API_URL}/payments/reactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reactivate subscription');
      }

      toast.success('Assinatura reativada com sucesso');
      fetchSubscription();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao reativar assinatura');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const planName = user?.plan === 'pro' ? 'PRO' : 'FREE';
  const isPro = user?.plan === 'pro';

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Assinatura
                {isPro && <Crown className="w-5 h-5 text-yellow-500" />}
              </CardTitle>
              <CardDescription>
                Gerencie seu plano e pagamentos
              </CardDescription>
            </div>
            <Badge
              variant={isPro ? 'default' : 'secondary'}
              className={isPro ? 'bg-gradient-to-r from-purple-600 to-pink-600' : ''}
            >
              {planName}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Current Plan Info */}
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Plano Atual
              </h4>
              <p className="text-2xl font-bold">{planName}</p>
              {isPro && subscription && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {subscription.cancelAtPeriodEnd ? (
                    <span className="text-orange-600 dark:text-orange-400">
                      Cancela em {new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}
                    </span>
                  ) : (
                    <span>
                      Renova em {new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Subscription Status */}
            {subscription && subscription.cancelAtPeriodEnd && (
              <div className="flex items-start gap-2 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-orange-800 dark:text-orange-200">
                  <p className="font-medium">Assinatura cancelada</p>
                  <p className="mt-1">
                    Você ainda terá acesso aos recursos PRO até o final do período atual.
                  </p>
                </div>
              </div>
            )}

            {/* Features */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Recursos Incluídos
              </h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                {isPro ? (
                  <>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      Transmissão ilimitada
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      Qualidade 1080p
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      Até 10 participantes
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      Gravação ilimitada
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      Suporte prioritário
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      5 horas de transmissão/mês
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      Qualidade 720p
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      Até 3 participantes
                    </li>
                    <li className="flex items-center gap-2 text-gray-400">
                      <span>✗</span>
                      Sem gravação
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-4 border-t">
            {!isPro ? (
              <Button
                onClick={() => setShowUpgradeModal(true)}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Crown className="w-4 h-4 mr-2" />
                Fazer Upgrade para PRO
              </Button>
            ) : (
              <>
                {subscription?.cancelAtPeriodEnd ? (
                  <Button
                    onClick={handleReactivateSubscription}
                    disabled={actionLoading}
                    className="w-full"
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Reativando...
                      </>
                    ) : (
                      'Reativar Assinatura'
                    )}
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={handleManageSubscription}
                      disabled={actionLoading}
                      variant="outline"
                      className="w-full"
                    >
                      {actionLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Abrindo...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Gerenciar Pagamento
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleCancelSubscription}
                      disabled={actionLoading}
                      variant="destructive"
                      className="w-full"
                    >
                      Cancelar Assinatura
                    </Button>
                  </>
                )}
              </>
            )}
          </div>

          {/* Help Text */}
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
            Precisa de ajuda?{' '}
            <a href="mailto:support@onnplay.com" className="text-purple-600 hover:underline">
              Entre em contato
            </a>
          </p>
        </CardContent>
      </Card>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </>
  );
}
