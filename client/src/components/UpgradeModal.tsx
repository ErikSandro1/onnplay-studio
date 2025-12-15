import { useState } from 'react';
import { X, Check, Loader2 } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan?: string;
}

export function UpgradeModal({ isOpen, onClose, currentPlan = 'FREE' }: UpgradeModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get authentication token from localStorage
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Você precisa estar autenticado para fazer upgrade');
      }

      const priceId = selectedPlan === 'monthly' 
        ? 'price_1SeKoeRpAyWqLoUoSLrcO125' // Monthly
        : 'price_1SeKoeRpAyWqLoUodXiLf0DB'; // Yearly

      const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          plan: 'pro',
          priceId: priceId, // Send the selected price ID
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
    } catch (err: any) {
      console.error('Erro ao fazer upgrade:', err);
      setError(err.message || 'Erro ao processar pagamento');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            Upgrade para OnnPlay Studio PRO
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Plan Toggle */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex rounded-lg border border-gray-200 p-1">
              <button
                onClick={() => setSelectedPlan('monthly')}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  selectedPlan === 'monthly'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setSelectedPlan('yearly')}
                className={`px-6 py-2 rounded-md font-medium transition-colors relative ${
                  selectedPlan === 'yearly'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Anual
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                  -25%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* FREE Plan */}
            <div className="border-2 border-gray-200 rounded-lg p-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">FREE</h3>
                <div className="text-3xl font-bold text-gray-900">
                  $0<span className="text-lg text-gray-500">/mês</span>
                </div>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600">2 horas de transmissão/mês</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600">Qualidade 720p</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600">Até 3 participantes</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-gray-300 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-400 line-through">Gravação de transmissões</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-gray-300 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-400 line-through">Suporte prioritário</span>
                </li>
              </ul>
            </div>

            {/* PRO Plan */}
            <div className="border-2 border-purple-600 rounded-lg p-6 relative bg-purple-50">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-purple-600 text-white text-sm font-bold px-4 py-1 rounded-full">
                  RECOMENDADO
                </span>
              </div>
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">PRO</h3>
                {selectedPlan === 'monthly' ? (
                  <div className="text-3xl font-bold text-gray-900">
                    $39<span className="text-lg text-gray-500">/mês</span>
                  </div>
                ) : (
                  <div>
                    <div className="text-3xl font-bold text-gray-900">
                      $29<span className="text-lg text-gray-500">/mês</span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      $348 cobrado anualmente
                    </div>
                  </div>
                )}
              </div>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-purple-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-900 font-medium">Transmissão ilimitada</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-purple-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-900 font-medium">Qualidade 1080p Full HD/4K</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-purple-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-900 font-medium">Até 20 participantes</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-purple-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-900 font-medium">Gravação de transmissões</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-purple-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-900 font-medium">Suporte prioritário</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-purple-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-900 font-medium">100GB Cloud Storage</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-purple-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-900 font-medium">Sem marca d'água</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-purple-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-900 font-medium">AI Assistant</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  Fazer Upgrade - {selectedPlan === 'monthly' ? '$39/mês' : '$348/ano'}
                </>
              )}
            </button>
          </div>

          {/* Footer Note */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Pagamento seguro processado pelo Stripe. Cancele a qualquer momento.
          </p>
        </div>
      </div>
    </div>
  );
}
