import { useEffect } from 'react';

interface ShortcutCallbacks {
  onTake?: () => void;
  onCamera?: (camera: number) => void;
  onRecord?: () => void;
  onStream?: () => void;
  onMute?: () => void;
  onFullscreen?: () => void;
}

/**
 * Hook para gerenciar atalhos de teclado no OnnPlay Studio
 * 
 * Atalhos disponíveis:
 * - SPACE: TAKE (alternar Preview para Program)
 * - 1-4: Selecionar câmera
 * - R: Gravar/parar gravação
 * - S: Stream/parar stream
 * - M: Mutar/desmutar
 * - F: Fullscreen
 */
export function useKeyboardShortcuts(callbacks: ShortcutCallbacks) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignorar se o usuário está digitando em um input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // SPACE: TAKE
      if (event.code === 'Space') {
        event.preventDefault();
        callbacks.onTake?.();
      }

      // 1-4: Câmeras
      if (event.code >= 'Digit1' && event.code <= 'Digit4') {
        const camera = parseInt(event.code.replace('Digit', ''));
        callbacks.onCamera?.(camera);
      }

      // R: Gravar
      if (event.code === 'KeyR' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        callbacks.onRecord?.();
      }

      // S: Stream
      if (event.code === 'KeyS' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        callbacks.onStream?.();
      }

      // M: Mutar
      if (event.code === 'KeyM' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        callbacks.onMute?.();
      }

      // F: Fullscreen
      if (event.code === 'KeyF' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        callbacks.onFullscreen?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [callbacks]);
}
