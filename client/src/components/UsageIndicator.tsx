/**
 * UsageIndicator Component
 * Mostra o uso de tempo de transmissão em tempo real no header do Studio
 * Com alertas visuais quando próximo do limite
 */

import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, Crown, X } from 'lucide-react';

interface UsageData {
  plan: string;
  limits: {
    streamingMinutes: number;
  };
  usage: {
    streamingMinutes: number;
  };
  remaining: {
    streamingMinutes: number;
  };
  percentUsed: {
    streaming: number;
  };
}

interface UsageIndicatorProps {
  isLive?: boolean;
  onUpgradeClick?: () => void;
}

export function UsageIndicator({ isLive = false, onUpgradeClick }: UsageIndicatorProps) {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionMinutes, setSessionMinutes] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningDismissed, setWarningDismissed] = useState(false);

  // Fetch usage data on mount and periodically
  useEffect(() => {
    fetchUsage();
    const interval = setInterval(fetchUsage, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Track session time when live
  useEffect(() => {
    if (!isLive) {
      setSessionMinutes(0);
      return;
    }

    const interval = setInterval(() => {
      setSessionMinutes(prev => prev + 1);
    }, 60000); // Increment every minute

    return () => clearInterval(interval);
  }, [isLive]);

  // Check for warnings
  useEffect(() => {
    if (!usage || usage.plan !== 'free') return;
    
    const totalUsed = usage.usage.streamingMinutes + sessionMinutes;
    const limit = usage.limits.streamingMinutes;
    const percentUsed = (totalUsed / limit) * 100;

    if (percentUsed >= 80 && !warningDismissed) {
      setShowWarning(true);
    }
  }, [usage, sessionMinutes, warningDismissed]);

  const fetchUsage = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch('/api/usage/summary', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.summary) {
          setUsage(data.summary);
        }
      }
    } catch (err) {
      console.error('Failed to fetch usage:', err);
    } finally {
      setLoading(false);
    }
  };

  // Increment usage on server when live
  useEffect(() => {
    if (!isLive || sessionMinutes === 0) return;

    const incrementUsage = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        await fetch('/api/usage/increment/streaming', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ minutes: 1 }),
        });
      } catch (err) {
        console.error('Failed to increment usage:', err);
      }
    };

    incrementUsage();
  }, [sessionMinutes, isLive]);

  if (loading || !usage) return null;

  // PRO/Enterprise users - don't show indicator
  if (usage.plan !== 'free') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-[#d4a853]/20 to-[#b8934a]/20 border border-[#d4a853]/30 rounded-lg">
        <Crown size={14} className="text-[#d4a853]" />
        <span className="text-xs font-medium text-[#d4a853]">PRO</span>
      </div>
    );
  }

  const totalUsed = (usage.usage?.streamingMinutes ?? 0) + sessionMinutes;
  const limit = usage.limits?.streamingMinutes ?? 300; // Default 5 hours = 300 minutes
  const remaining = Math.max(0, limit - totalUsed);
  const percentUsed = limit > 0 ? Math.min(100, (totalUsed / limit) * 100) : 0;
  const isNearLimit = percentUsed >= 80;
  const isLimitReached = totalUsed >= limit;

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <>
      {/* Usage Indicator Badge */}
      <div 
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
          isLimitReached
            ? 'bg-red-900/50 border border-red-500/50 animate-pulse'
            : isNearLimit
            ? 'bg-orange-900/50 border border-orange-500/50'
            : 'bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#d4a853]/50'
        }`}
        onClick={onUpgradeClick}
        title={`${formatTime(totalUsed)} usado de ${formatTime(limit)}`}
      >
        <Clock size={14} className={isLimitReached ? 'text-red-400' : isNearLimit ? 'text-orange-400' : 'text-gray-400'} />
        <span className={`text-xs font-medium ${
          isLimitReached ? 'text-red-400' : isNearLimit ? 'text-orange-400' : 'text-gray-300'
        }`}>
          {formatTime(remaining)} restantes
        </span>
        {isNearLimit && !isLimitReached && (
          <AlertTriangle size={12} className="text-orange-400" />
        )}
      </div>

      {/* Warning Modal */}
      {showWarning && !warningDismissed && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border-2 border-orange-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <AlertTriangle size={24} className="text-orange-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Atenção!</h3>
                  <p className="text-sm text-gray-400">Limite de uso próximo</p>
                </div>
              </div>
              <button
                onClick={() => setWarningDismissed(true)}
                className="p-1 hover:bg-[#2a2a2a] rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-300 mb-4">
                Você já usou <strong className="text-orange-400">{percentUsed.toFixed(0)}%</strong> do seu limite mensal de transmissão.
              </p>
              
              {/* Progress Bar */}
              <div className="w-full bg-[#1a1a1a] rounded-full h-3 mb-2">
                <div 
                  className="bg-gradient-to-r from-orange-500 to-red-500 h-3 rounded-full transition-all"
                  style={{ width: `${percentUsed}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{formatTime(totalUsed)} usado</span>
                <span>{formatTime(remaining)} restantes</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setWarningDismissed(true)}
                className="flex-1 px-4 py-2.5 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 font-medium rounded-xl transition-colors"
              >
                Continuar
              </button>
              <button
                onClick={() => {
                  setWarningDismissed(true);
                  onUpgradeClick?.();
                }}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#d4a853] to-[#b8934a] hover:from-[#e0b563] hover:to-[#c9a45a] text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Crown size={16} />
                Upgrade PRO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Limit Reached Modal */}
      {isLimitReached && isLive && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border-2 border-red-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle size={24} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Limite Atingido!</h3>
                <p className="text-sm text-gray-400">Sua transmissão será encerrada</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-300 mb-4">
                Você atingiu o limite de <strong className="text-red-400">{formatTime(limit)}</strong> de transmissão mensal do plano FREE.
              </p>
              <p className="text-gray-400 text-sm">
                Faça upgrade para o plano PRO e tenha transmissão ilimitada!
              </p>
            </div>

            <button
              onClick={onUpgradeClick}
              className="w-full px-4 py-3 bg-gradient-to-r from-[#d4a853] to-[#b8934a] hover:from-[#e0b563] hover:to-[#c9a45a] text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Crown size={18} />
              Fazer Upgrade para PRO
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default UsageIndicator;
