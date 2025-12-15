import { useState } from 'react';
import { X, Crown, Zap, Check, Loader2 } from 'lucide-react';

interface ChangePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: string;
  onChangePlan: (plan: 'pro' | 'enterprise') => Promise<void>;
}

const PLANS = {
  pro: {
    name: 'PRO',
    price: 39,
    features: [
      'Transmissão ilimitada',
      'Qualidade 1080p Full HD/4K',
      'Até 20 participantes',
      'Gravação de transmissões',
      'Suporte prioritário',
      '100GB Cloud Storage',
      'Sem marca d\'água',
      'AI Assistant',
    ],
  },
  enterprise: {
    name: 'ENTERPRISE',
    price: 99,
    features: [
      'Tudo do PRO +',
      'Transmissão ilimitada',
      'Qualidade 4K Ultra HD',
      'Até 100 participantes',
      'Gravação ilimitada',
      'Suporte 24/7 dedicado',
      '1TB Cloud Storage',
      'API personalizada',
      'White label',
    ],
  },
};

export function ChangePlanModal({ isOpen, onClose, currentPlan, onChangePlan }: ChangePlanModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'enterprise'>('pro');

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (selectedPlan === currentPlan) {
      onClose();
      return;
    }

    setLoading(true);
    try {
      await onChangePlan(selectedPlan);
    } finally {
      setLoading(false);
    }
  };

  const isUpgrade = selectedPlan === 'enterprise' && currentPlan === 'pro';
  const isDowngrade = selectedPlan === 'pro' && currentPlan === 'enterprise';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h2 className="text-2xl font-bold text-white">Trocar Plano</h2>
            <p className="text-sm text-gray-400 mt-1">
              Escolha o plano que melhor se adequa às suas necessidades
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            disabled={loading}
          >
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        {/* Plans */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PRO Plan */}
            <div
              onClick={() => !loading && setSelectedPlan('pro')}
              className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all ${
                selectedPlan === 'pro'
                  ? 'border-purple-600 bg-purple-600/10'
                  : 'border-gray-800 bg-gray-800/50 hover:border-gray-700'
              }`}
            >
              {selectedPlan === 'pro' && (
                <div className="absolute top-4 right-4">
                  <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                    <Check size={16} className="text-white" />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-600/20 rounded-lg">
                  <Crown size={24} className="text-purple-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{PLANS.pro.name}</h3>
                  <p className="text-sm text-gray-400">Para criadores profissionais</p>
                </div>
              </div>

              <div className="mb-4">
                <span className="text-4xl font-bold text-white">${PLANS.pro.price}</span>
                <span className="text-gray-400">/mês</span>
              </div>

              <ul className="space-y-2">
                {PLANS.pro.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
                    <Check size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {currentPlan === 'pro' && (
                <div className="mt-4 px-3 py-2 bg-blue-600/20 border border-blue-600/50 rounded-lg text-center">
                  <span className="text-sm text-blue-400 font-medium">Plano Atual</span>
                </div>
              )}
            </div>

            {/* ENTERPRISE Plan */}
            <div
              onClick={() => !loading && setSelectedPlan('enterprise')}
              className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all ${
                selectedPlan === 'enterprise'
                  ? 'border-orange-600 bg-orange-600/10'
                  : 'border-gray-800 bg-gray-800/50 hover:border-gray-700'
              }`}
            >
              {selectedPlan === 'enterprise' && (
                <div className="absolute top-4 right-4">
                  <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center">
                    <Check size={16} className="text-white" />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-600/20 rounded-lg">
                  <Zap size={24} className="text-orange-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{PLANS.enterprise.name}</h3>
                  <p className="text-sm text-gray-400">Para empresas e equipes</p>
                </div>
              </div>

              <div className="mb-4">
                <span className="text-4xl font-bold text-white">${PLANS.enterprise.price}</span>
                <span className="text-gray-400">/mês</span>
              </div>

              <ul className="space-y-2">
                {PLANS.enterprise.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
                    <Check size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {currentPlan === 'enterprise' && (
                <div className="mt-4 px-3 py-2 bg-blue-600/20 border border-blue-600/50 rounded-lg text-center">
                  <span className="text-sm text-blue-400 font-medium">Plano Atual</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-800 bg-gray-800/50">
          <div className="text-sm text-gray-400">
            {isUpgrade && (
              <p>✨ Você será cobrado proporcionalmente pela diferença</p>
            )}
            {isDowngrade && (
              <p>⚠️ O crédito restante será aplicado no próximo ciclo</p>
            )}
            {!isUpgrade && !isDowngrade && (
              <p>Selecione um plano diferente do atual para continuar</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading || selectedPlan === currentPlan}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  {isUpgrade && 'Fazer Upgrade'}
                  {isDowngrade && 'Fazer Downgrade'}
                  {!isUpgrade && !isDowngrade && 'Confirmar'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
