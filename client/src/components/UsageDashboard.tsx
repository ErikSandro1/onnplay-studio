import React, { useEffect, useState } from 'react';
import { Progress } from './ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Clock, TrendingUp, AlertCircle, Crown, RefreshCw } from 'lucide-react';
import { useLocation } from 'wouter';
import { UpgradeModal } from './UpgradeModal';

interface UsageSummary {
  plan: string;
  limits: {
    streamingMinutes: number;
    recordingMinutes: number;
    maxQuality: string;
    maxParticipants: number;
    features: {
      aiAssistant: boolean;
      recording: boolean;
      ptzControl: boolean;
      commentOverlay: boolean;
      apiAccess: boolean;
    };
  };
  usage: {
    streamingMinutes: number;
    recordingMinutes: number;
    aiCommandsCount: number;
    storageMb: number;
  };
  remaining: {
    streamingMinutes: number;
    recordingMinutes: number;
  };
  percentUsed: {
    streamingMinutes: number;
    recordingMinutes: number;
  };
}

export function UsageDashboard() {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('Não autenticado');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/usage/summary', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.summary) {
          setUsage(data.summary);
        } else {
          setError('Formato de resposta inválido');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || 'Falha ao carregar dados de uso');
      }
    } catch (err: any) {
      console.error('Failed to fetch usage:', err);
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={fetchUsage}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!usage) {
    return null;
  }

  const streamingLimit = usage.limits.streamingMinutes;
  const streamingUsed = usage.usage.streamingMinutes;
  const streamingPercentage = usage.percentUsed?.streamingMinutes || 
    (streamingLimit === -1 ? 0 : (streamingUsed / streamingLimit) * 100);
  const streamingRemaining = usage.remaining?.streamingMinutes ?? 
    (streamingLimit === -1 ? Infinity : Math.max(0, streamingLimit - streamingUsed));
  
  const isLimitReached = streamingLimit !== -1 && streamingUsed >= streamingLimit;
  const isNearLimit = streamingLimit !== -1 && streamingPercentage >= 80;

  const formatTime = (minutes: number) => {
    if (minutes === -1 || minutes === Infinity) return '∞';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getPlanLabel = (plan: string) => {
    switch (plan) {
      case 'free': return 'Plano FREE';
      case 'pro': return 'Plano PRO';
      case 'enterprise': return 'Plano ENTERPRISE';
      default: return plan.toUpperCase();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Uso de Broadcast
            </CardTitle>
            <CardDescription>
              {getPlanLabel(usage.plan)}
            </CardDescription>
          </div>
          {usage.plan === 'free' && (
            <Button 
              onClick={() => setShowUpgradeModal(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Streaming Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Tempo de Transmissão</span>
            <span className={`font-bold ${isNearLimit ? 'text-orange-600' : isLimitReached ? 'text-red-600' : 'text-gray-700'}`}>
              {formatTime(streamingUsed)} / {formatTime(streamingLimit)}
            </span>
          </div>
          
          {streamingLimit !== -1 && (
            <>
              <Progress 
                value={Math.min(100, streamingPercentage)} 
                className={`h-3 ${isLimitReached ? 'bg-red-100' : isNearLimit ? 'bg-orange-100' : ''}`}
              />
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{streamingPercentage.toFixed(0)}% usado</span>
                <span>{formatTime(streamingRemaining)} restantes</span>
              </div>
            </>
          )}

          {streamingLimit === -1 && (
            <div className="text-sm text-green-600 font-medium">
              ✨ Transmissão ilimitada
            </div>
          )}
        </div>

        {/* Alerts */}
        {isLimitReached && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">Limite Atingido</p>
              <p className="text-xs text-red-700 mt-1">
                Você atingiu o limite mensal de transmissão. Faça upgrade para continuar transmitindo.
              </p>
            </div>
          </div>
        )}

        {isNearLimit && !isLimitReached && (
          <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <TrendingUp className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-900">Próximo do Limite</p>
              <p className="text-xs text-orange-700 mt-1">
                Você está usando {streamingPercentage.toFixed(0)}% do seu limite mensal. Considere fazer upgrade.
              </p>
            </div>
          </div>
        )}

        {/* Plan Features */}
        <div className="pt-4 border-t space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Qualidade Máxima</span>
            <span className="font-medium">{usage.limits.maxQuality}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Participantes</span>
            <span className="font-medium">Até {usage.limits.maxParticipants}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">AI Assistant</span>
            <span className={`font-medium ${usage.limits.features.aiAssistant ? 'text-green-600' : 'text-gray-400'}`}>
              {usage.limits.features.aiAssistant ? 'Ativado' : 'Desativado'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Gravação</span>
            <span className={`font-medium ${usage.limits.features.recording ? 'text-green-600' : 'text-gray-400'}`}>
              {usage.limits.features.recording ? 'Ativado' : 'Desativado'}
            </span>
          </div>
        </div>
      </CardContent>

      <UpgradeModal 
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentPlan={usage.plan}
      />
    </Card>
  );
}
