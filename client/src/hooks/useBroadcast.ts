import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUsageLimits } from './useUsageLimits';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface BroadcastSession {
  id: string;
  platform: string;
  quality: string;
  participantsCount: number;
  startedAt: Date;
  duration?: number;
  peakViewers?: number;
}

export function useBroadcast() {
  const { token } = useAuth();
  const { canStartStreaming } = useUsageLimits();
  
  const [broadcastId, setBroadcastId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [currentSession, setCurrentSession] = useState<BroadcastSession | null>(null);

  /**
   * Start a broadcast session
   * @param platform - Platform name (YouTube, Twitch, Facebook, etc.)
   * @param quality - Quality setting (720p, 1080p, 4K)
   * @param participantsCount - Number of participants in the broadcast
   * @returns Broadcast ID if successful, null otherwise
   */
  const startBroadcast = useCallback(async (
    platform: string,
    quality: string,
    participantsCount: number = 1
  ): Promise<string | null> => {
    if (!token) {
      toast.error('Você precisa estar logado para transmitir');
      return null;
    }

    if (isLive) {
      toast.warning('Você já está transmitindo');
      return broadcastId;
    }

    // Check if user can start streaming
    const permission = await canStartStreaming();
    if (!permission.allowed) {
      // Permission check already shows toast
      return null;
    }

    setIsStarting(true);

    try {
      const response = await fetch(`${API_URL}/broadcast/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          platform,
          quality,
          participantsCount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao iniciar transmissão');
      }

      const newBroadcastId = data.broadcastId;
      setBroadcastId(newBroadcastId);
      setIsLive(true);
      setCurrentSession({
        id: newBroadcastId,
        platform,
        quality,
        participantsCount,
        startedAt: new Date(),
      });
      
      toast.success('🎥 Transmissão iniciada!');
      
      // Warn if low on minutes
      if (permission.remainingMinutes !== null && permission.remainingMinutes < 10) {
        toast.warning(
          `⚠️ Atenção: Você tem apenas ${permission.remainingMinutes} minutos restantes neste mês`,
          { duration: 5000 }
        );
      }

      console.log(`📡 Broadcast started: ${newBroadcastId} (${platform}, ${quality})`);

      return newBroadcastId;
    } catch (error: any) {
      console.error('Start broadcast error:', error);
      toast.error(error.message || 'Erro ao iniciar transmissão');
      return null;
    } finally {
      setIsStarting(false);
    }
  }, [token, isLive, broadcastId, canStartStreaming]);

  /**
   * End the current broadcast session
   * @param peakViewers - Maximum number of viewers during the broadcast
   */
  const endBroadcast = useCallback(async (peakViewers?: number) => {
    if (!token || !broadcastId) {
      console.warn('No active broadcast to end');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/broadcast/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          broadcastId,
          peakViewers,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Falha ao encerrar transmissão');
      }

      setIsLive(false);
      setBroadcastId(null);
      setCurrentSession(null);
      
      toast.success('🛑 Transmissão encerrada!');
      
      console.log(`🛑 Broadcast ended: ${broadcastId}`);
    } catch (error: any) {
      console.error('End broadcast error:', error);
      toast.error(error.message || 'Erro ao encerrar transmissão');
    }
  }, [token, broadcastId]);

  /**
   * Mark the current broadcast as failed
   */
  const failBroadcast = useCallback(async () => {
    if (!token || !broadcastId) return;

    try {
      await fetch(`${API_URL}/broadcast/fail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          broadcastId,
        }),
      });

      setIsLive(false);
      setBroadcastId(null);
      setCurrentSession(null);
      
      console.log(`❌ Broadcast failed: ${broadcastId}`);
    } catch (error) {
      console.error('Fail broadcast error:', error);
    }
  }, [token, broadcastId]);

  /**
   * Update the peak viewers count
   * @param viewers - Current number of viewers
   */
  const updateViewers = useCallback(async (viewers: number) => {
    if (!token || !broadcastId) return;

    try {
      await fetch(`${API_URL}/broadcast/viewers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          broadcastId,
          viewers,
        }),
      });
    } catch (error) {
      console.error('Update viewers error:', error);
    }
  }, [token, broadcastId]);

  /**
   * Get broadcast history
   * @param limit - Number of broadcasts to fetch
   */
  const getBroadcastHistory = useCallback(async (limit: number = 10) => {
    if (!token) return [];

    try {
      const response = await fetch(`${API_URL}/broadcast/history?limit=${limit}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao buscar histórico');
      }

      return data.broadcasts || [];
    } catch (error: any) {
      console.error('Get history error:', error);
      toast.error('Erro ao buscar histórico de transmissões');
      return [];
    }
  }, [token]);

  /**
   * Get broadcast statistics
   */
  const getBroadcastStats = useCallback(async () => {
    if (!token) return null;

    try {
      const response = await fetch(`${API_URL}/broadcast/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao buscar estatísticas');
      }

      return data.stats || null;
    } catch (error: any) {
      console.error('Get stats error:', error);
      return null;
    }
  }, [token]);

  return {
    // State
    broadcastId,
    isLive,
    isStarting,
    currentSession,
    
    // Actions
    startBroadcast,
    endBroadcast,
    failBroadcast,
    updateViewers,
    
    // Queries
    getBroadcastHistory,
    getBroadcastStats,
  };
}
