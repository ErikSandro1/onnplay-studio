import { useState } from 'react';
import { X, Check, Loader2, CreditCard, Receipt } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan?: string;
}

export function UpgradeModal({ isOpen, onClose, currentPlan = 'FREE' }: UpgradeModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPaymentType, setSelectedPaymentType] = useState<'automatic' | 'manual' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePaymentTypeSelect = (type: 'automatic' | 'manual') => {
    setSelectedPaymentType(type);
  };

  const handleUpgrade = async () => {
    if (!selectedPaymentType) {
      setError('Por favor, selecione um método de pagamento');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Você precisa estar autenticado para fazer upgrade');
      }

      if (selectedPaymentType === 'automatic') {
        // Automatic payment with card (Stripe Checkout)
        const response = await fetch('/api/payments/create-checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            plan: 'pro',
          }),
        });

        if (!response.ok) {
          throw new Error('Erro ao criar sessão de checkout');
        }

        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error('URL de checkout não recebida');
        }
      } else {
        // Manual payment with invoice (PIX, Boleto, etc.)
        const response = await fetch('/api/payments/create-invoice-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            plan: 'pro',
            billingPeriod: selectedPlan,
          }),
        });

        if (!response.ok) {
          throw new Error('Erro ao criar assinatura');
        }

        const data = await response.json();
        alert(data.message || 'Assinatura criada! Você receberá uma fatura por email.');
        onClose();
        window.location.reload();
      }
    } catch (err: any) {
      console.error('Erro ao fazer upgrade:', err);
      setError(err.message || 'Erro ao processar pagamento');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Fazer Upgrade</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {/* Payment Type Selection */}
          {!selectedPaymentType && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Escolha o método de pagamento:
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Automatic Payment Option */}
                <button
                  onClick={() => handlePaymentTypeSelect('automatic')}
                  className="p-6 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left group"
                >
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                      <CreditCard className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">
                        💳 Cartão de Crédito
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">
                        Cobrança automática mensal
                      </p>
                      <ul className="text-sm text-gray-500 space-y-1">
                        <li>✓ Renovação automática</li>
                        <li>✓ Sem preocupação com vencimento</li>
                        <li>✓ Acesso imediato</li>
                      </ul>
                    </div>
                  </div>
                </button>

                {/* Manual Payment Option */}
                <button
                  onClick={() => handlePaymentTypeSelect('manual')}
                  className="p-6 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all text-left group"
                >
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                      <Receipt className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">
                        🔄 PIX / Boleto / Outros
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">
                        Pagamento manual mensal
                      </p>
                      <ul className="text-sm text-gray-500 space-y-1">
                        <li>✓ PIX, Boleto, Transferência</li>
                        <li>✓ Fatura enviada por email</li>
                        <li>✓ 7 dias para pagar</li>
                      </ul>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Show plan selection after payment type is chosen */}
          {selectedPaymentType && (
            <>
              <div className="mb-6">
                <button
                  onClick={() => setSelectedPaymentType(null)}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  ← Voltar para escolha de método
                </button>
              </div>

              {/* Plan Selection */}
              <div className="flex gap-4 mb-8">
                <button
                  onClick={() => setSelectedPlan('monthly')}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                    selectedPlan === 'monthly'
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-sm text-gray-600 mb-1">Mensal</div>
                  <div className="text-2xl font-bold text-gray-900">US$ 39</div>
                  <div className="text-sm text-gray-500">por mês</div>
                </button>

                <button
                  onClick={() => setSelectedPlan('yearly')}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                    selectedPlan === 'yearly'
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-sm text-gray-600 mb-1">Anual</div>
                  <div className="text-2xl font-bold text-gray-900">US$ 390</div>
                  <div className="text-sm text-gray-500">por ano</div>
                  <div className="text-xs text-green-600 font-medium mt-1">
                    Economize 16%
                  </div>
                </button>
              </div>

              {/* Features */}
              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">Recursos incluídos:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    'Streaming ilimitado em 1080p',
                    'Até 10 participantes simultâneos',
                    'Assistente de IA integrado',
                    'Gravação de transmissões',
                    'Suporte por email',
                    'Sem anúncios',
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpgrade}
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    'Fazer Upgrade'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
