import { useEffect, useState, useCallback } from 'react';
import { wsService } from '@/services/websocket';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Hook para usar WebSocket no OnnPlay Studio
 * 
 * Exemplo:
 * const { isConnected, send, on } = useWebSocket({
 *   autoConnect: true,
 *   onConnected: () => console.log('Conectado'),
 * });
 * 
 * on('take', (data) => console.log('TAKE recebido:', data));
 * send('take', { action: 'take' });
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { autoConnect = true, onConnected, onDisconnected, onError } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [operatorId, setOperatorId] = useState<string>('');

  useEffect(() => {
    if (!autoConnect) return;

    // Conectar ao WebSocket
    wsService.connect().catch((error) => {
      console.error('Erro ao conectar WebSocket:', error);
      onError?.(error);
    });

    // Listener para conexão
    const unsubscribeConnected = wsService.on('connected', (data) => {
      setIsConnected(true);
      setOperatorId(data.operatorId);
      onConnected?.();
    });

    // Listener para desconexão
    const unsubscribeDisconnected = wsService.on('disconnected', () => {
      setIsConnected(false);
      onDisconnected?.();
    });

    // Listener para erro de conexão
    const unsubscribeError = wsService.on('connection-failed', () => {
      setIsConnected(false);
      onError?.(new Error('Falha ao conectar ao servidor WebSocket'));
    });

    return () => {
      unsubscribeConnected();
      unsubscribeDisconnected();
      unsubscribeError();
    };
  }, [autoConnect, onConnected, onDisconnected, onError]);

  const send = useCallback(
    (type: string, payload: any) => {
      if (!isConnected) {
        console.warn('WebSocket não conectado');
        return;
      }
      wsService.send(type as any, payload);
    },
    [isConnected]
  );

  const on = useCallback((type: string, callback: (data: any) => void) => {
    return wsService.on(type, callback);
  }, []);

  const disconnect = useCallback(() => {
    wsService.disconnect();
    setIsConnected(false);
  }, []);

  return {
    isConnected,
    operatorId,
    send,
    on,
    disconnect,
  };
}
