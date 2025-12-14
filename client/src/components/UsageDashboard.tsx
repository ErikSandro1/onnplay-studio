import React, { useEffect, useState } from 'react';
import { Progress } from './ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Clock, TrendingUp, AlertCircle, Crown } from 'lucide-react';
import { useLocation } from 'wouter';

interface UsageSummary {
  streaming_minutes: number;
  recording_minutes: number;
  ai_commands_count: number;
  storage_mb: number;
  limits: {
    streamingMinutesPerMonth: number;
    recordingMinutesPerMonth: number;
    maxQuality: string;
    maxParticipants: number;
    aiAssistant: boolean;
    recording: boolean;
  };
  plan: string;
}

export function UsageDashboard() {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/usage/summary', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsage(data.summary);
      }
    } catch (error) {
      console.error('Failed to fetch usage:', error);
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

  if (!usage) {
    return null;
  }

  const streamingLimit = usage.limits.streamingMinutesPerMonth;
  const streamingUsed = usage.streaming_minutes;
  const streamingPercentage = streamingLimit === -1 ? 0 : (streamingUsed / streamingLimit) * 100;
  const streamingRemaining = streamingLimit === -1 ? Infinity : Math.max(0, streamingLimit - streamingUsed);
  
  const isLimitReached = streamingLimit !== -1 && streamingUsed >= streamingLimit;
  const isNearLimit = streamingLimit !== -1 && streamingPercentage >= 80;

  const formatTime = (minutes: number) => {
    if (minutes === Infinity) return '∞';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
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
              {usage.plan === 'free' ? 'Plano FREE' : usage.plan === 'pro' ? 'Plano PRO' : 'Plano ENTERPRISE'}
            </CardDescription>
          </div>
          {usage.plan === 'free' && (
            <Button 
              onClick={() => setLocation('/pricing')}
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
              {formatTime(streamingUsed)} / {streamingLimit === -1 ? '∞' : formatTime(streamingLimit)}
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
            <span className={`font-medium ${usage.limits.aiAssistant ? 'text-green-600' : 'text-gray-400'}`}>
              {usage.limits.aiAssistant ? 'Ativado' : 'Desativado'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Gravação</span>
            <span className={`font-medium ${usage.limits.recording ? 'text-green-600' : 'text-gray-400'}`}>
              {usage.limits.recording ? 'Ativado' : 'Desativado'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
