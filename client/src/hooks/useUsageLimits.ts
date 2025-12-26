import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3000/api');

export interface PlanLimits {
  streamingMinutesPerMonth: number;
  recordingMinutesPerMonth: number;
  maxQuality: '720p' | '1080p' | '4K';
  maxParticipants: number;
  aiAssistant: boolean;
  recording: boolean;
  ptzControl: boolean;
  commentOverlay: boolean;
  apiAccess: boolean;
}

export interface UsageData {
  streamingMinutes: number;
  recordingMinutes: number;
  aiCommandsCount: number;
  storageMb: number;
}

export interface UsageSummary {
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
  usage: UsageData;
  remaining: {
    streamingMinutes: number;
    recordingMinutes: number;
  };
  percentUsed: {
    streaming: number;
    recording: number;
  };
}

export function useUsageLimits() {
  const { token, user } = useAuth();
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSummary = async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/usage/summary`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Failed to fetch usage summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [token]);

  /**
   * Check if user can start streaming
   */
  const canStartStreaming = async (): Promise<{
    allowed: boolean;
    reason?: string;
    remainingMinutes?: number;
  }> => {
    if (!token) {
      return { allowed: false, reason: 'Você precisa estar logado' };
    }

    try {
      const response = await fetch(`${API_URL}/usage/check/streaming`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.upgradeRequired) {
          toast.error(data.reason, {
            action: {
              label: 'Fazer Upgrade',
              onClick: () => (window.location.href = '/pricing'),
            },
            duration: 5000,
          });
        } else {
          toast.error(data.reason);
        }
        return { allowed: false, reason: data.reason };
      }

      return {
        allowed: true,
        remainingMinutes: data.remainingMinutes,
      };
    } catch (error) {
      console.error('Failed to check streaming permission:', error);
      return { allowed: false, reason: 'Erro ao verificar permissão' };
    }
  };

  /**
   * Check if user can start recording
   */
  const canStartRecording = async (): Promise<{
    allowed: boolean;
    reason?: string;
  }> => {
    if (!token) {
      return { allowed: false, reason: 'Você precisa estar logado' };
    }

    try {
      const response = await fetch(`${API_URL}/usage/check/recording`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.upgradeRequired) {
          toast.error(data.reason, {
            action: {
              label: 'Fazer Upgrade',
              onClick: () => (window.location.href = '/pricing'),
            },
            duration: 5000,
          });
        } else {
          toast.error(data.reason);
        }
        return { allowed: false, reason: data.reason };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Failed to check recording permission:', error);
      return { allowed: false, reason: 'Erro ao verificar permissão' };
    }
  };

  /**
   * Check if user can use AI Assistant
   */
  const canUseAI = async (): Promise<{ allowed: boolean; reason?: string }> => {
    if (!token) {
      return { allowed: false, reason: 'Você precisa estar logado' };
    }

    try {
      const response = await fetch(`${API_URL}/usage/check/ai`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.upgradeRequired) {
          toast.error(data.reason, {
            action: {
              label: 'Fazer Upgrade',
              onClick: () => (window.location.href = '/pricing'),
            },
            duration: 5000,
          });
        }
        return { allowed: false, reason: data.reason };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Failed to check AI permission:', error);
      return { allowed: false, reason: 'Erro ao verificar permissão' };
    }
  };

  /**
   * Check if quality is allowed
   */
  const canUseQuality = async (
    quality: string
  ): Promise<{ allowed: boolean; reason?: string }> => {
    if (!token) {
      return { allowed: false, reason: 'Você precisa estar logado' };
    }

    try {
      const response = await fetch(`${API_URL}/usage/check/quality`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quality }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.upgradeRequired) {
          toast.error(data.reason, {
            action: {
              label: 'Fazer Upgrade',
              onClick: () => (window.location.href = '/pricing'),
            },
            duration: 5000,
          });
        }
        return { allowed: false, reason: data.reason };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Failed to check quality permission:', error);
      return { allowed: false, reason: 'Erro ao verificar permissão' };
    }
  };

  /**
   * Check if participant count is allowed
   */
  const canAddParticipants = async (
    count: number
  ): Promise<{ allowed: boolean; reason?: string }> => {
    if (!token) {
      return { allowed: false, reason: 'Você precisa estar logado' };
    }

    try {
      const response = await fetch(`${API_URL}/usage/check/participants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ count }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.upgradeRequired) {
          toast.error(data.reason, {
            action: {
              label: 'Fazer Upgrade',
              onClick: () => (window.location.href = '/pricing'),
            },
            duration: 5000,
          });
        }
        return { allowed: false, reason: data.reason };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Failed to check participants permission:', error);
      return { allowed: false, reason: 'Erro ao verificar permissão' };
    }
  };

  /**
   * Increment streaming minutes
   */
  const incrementStreamingMinutes = async (minutes: number): Promise<void> => {
    if (!token) return;

    try {
      await fetch(`${API_URL}/usage/increment/streaming`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ minutes }),
      });

      // Refresh summary
      await fetchSummary();
    } catch (error) {
      console.error('Failed to increment streaming minutes:', error);
    }
  };

  /**
   * Increment recording minutes
   */
  const incrementRecordingMinutes = async (minutes: number): Promise<void> => {
    if (!token) return;

    try {
      await fetch(`${API_URL}/usage/increment/recording`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ minutes }),
      });

      // Refresh summary
      await fetchSummary();
    } catch (error) {
      console.error('Failed to increment recording minutes:', error);
    }
  };

  /**
   * Increment AI commands count
   */
  const incrementAICommands = async (count: number = 1): Promise<void> => {
    if (!token) return;

    try {
      await fetch(`${API_URL}/usage/increment/ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ count }),
      });

      // Refresh summary
      await fetchSummary();
    } catch (error) {
      console.error('Failed to increment AI commands:', error);
    }
  };

  return {
    summary,
    isLoading,
    canStartStreaming,
    canStartRecording,
    canUseAI,
    canUseQuality,
    canAddParticipants,
    incrementStreamingMinutes,
    incrementRecordingMinutes,
    incrementAICommands,
    refreshSummary: fetchSummary,
  };
}
