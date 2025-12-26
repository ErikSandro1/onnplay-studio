import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Crown, Loader2, ExternalLink, AlertCircle, Download, FileText, ArrowUpCircle, ArrowDownCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { UpgradeModal } from './UpgradeModal';
import { ChangePlanModal } from './ChangePlanModal';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3000/api');

interface Subscription {
  id: string;
  status: string;
  plan: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface PaymentHistory {
  id: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
  invoice_pdf: string | null;
  hosted_invoice_url: string | null;
}

export function SubscriptionManager() {
  const { user, token } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showChangePlan, setShowChangePlan] = useState(false);

  useEffect(() => {
    fetchSubscription();
    fetchPaymentHistory();
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

  const fetchPaymentHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/payments/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPaymentHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
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

  const handleChangePlan = async (newPlan: 'pro' | 'enterprise') => {
    if (!confirm(`Tem certeza que deseja trocar para o plano ${newPlan.toUpperCase()}?`)) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`${API_URL}/payments/change-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: newPlan }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change plan');
      }

      toast.success('Plano alterado com sucesso');
      fetchSubscription();
      setShowChangePlan(false);
      // Reload to update user context
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao trocar plano');
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

          {/* Additional Actions */}
          {isPro && (
            <div className="space-y-2 pt-4 border-t">
              <Button
                onClick={() => setShowChangePlan(true)}
                variant="ghost"
                className="w-full justify-start"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Trocar Plano
              </Button>
              <Button
                onClick={() => setShowHistory(!showHistory)}
                variant="ghost"
                className="w-full justify-start"
              >
                <FileText className="w-4 h-4 mr-2" />
                {showHistory ? 'Ocultar' : 'Ver'} Histórico de Pagamentos
              </Button>
            </div>
          )}

          {/* Help Text */}
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
            Precisa de ajuda?{' '}
            <a href="mailto:support@onnplay.com" className="text-purple-600 hover:underline">
              Entre em contato
            </a>
          </p>
        </CardContent>
      </Card>

      {/* Payment History */}
      {isPro && showHistory && paymentHistory.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Histórico de Pagamentos</CardTitle>
            <CardDescription>
              Seus últimos pagamentos e faturas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paymentHistory.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">
                      ${(payment.amount / 100).toFixed(2)} {payment.currency.toUpperCase()}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(payment.date).toLocaleDateString('pt-BR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={payment.status === 'paid' ? 'default' : 'secondary'}
                    >
                      {payment.status === 'paid' ? 'Pago' : payment.status}
                    </Badge>
                    {payment.invoice_pdf && (
                      <a
                        href={payment.invoice_pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />

      <ChangePlanModal
        isOpen={showChangePlan}
        onClose={() => setShowChangePlan(false)}
        currentPlan={user?.plan || 'free'}
        onChangePlan={handleChangePlan}
      />
    </>
  );
}
