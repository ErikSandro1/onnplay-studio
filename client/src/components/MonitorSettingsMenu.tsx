/**
 * MonitorSettingsMenu - Menu de configurações para PREVIEW e PROGRAM
 * Permite ajustar zoom, espelhamento, rotação e outras configurações de câmera
 */

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Settings, 
  ZoomIn, 
  ZoomOut, 
  FlipHorizontal, 
  FlipVertical,
  RotateCw,
  RefreshCw,
  X,
  Sliders
} from 'lucide-react';

interface MonitorSettingsMenuProps {
  target: 'preview' | 'program';
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement>;
}

interface CameraSettings {
  zoom: number;
  flipH: boolean;
  flipV: boolean;
  rotation: number;
  brightness: number;
  contrast: number;
}

// Armazenar configurações globalmente
const settingsStore: { preview: CameraSettings; program: CameraSettings } = {
  preview: { zoom: 1, flipH: true, flipV: false, rotation: 0, brightness: 100, contrast: 100 },
  program: { zoom: 1, flipH: true, flipV: false, rotation: 0, brightness: 100, contrast: 100 },
};

// Função para obter configurações
export function getMonitorSettings(target: 'preview' | 'program'): CameraSettings {
  return settingsStore[target];
}

// Função para aplicar configurações ao elemento de vídeo
export function applySettingsToVideo(video: HTMLVideoElement, settings: CameraSettings) {
  const transforms: string[] = [];
  
  if (settings.flipH) transforms.push('scaleX(-1)');
  if (settings.flipV) transforms.push('scaleY(-1)');
  if (settings.rotation !== 0) transforms.push(`rotate(${settings.rotation}deg)`);
  if (settings.zoom !== 1) transforms.push(`scale(${settings.zoom})`);
  
  video.style.transform = transforms.join(' ');
  video.style.filter = `brightness(${settings.brightness}%) contrast(${settings.contrast}%)`;
}

export function MonitorSettingsMenu({ target, isOpen, onClose, anchorRef }: MonitorSettingsMenuProps) {
  const [settings, setSettings] = useState<CameraSettings>(settingsStore[target]);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Posição do menu
  const [position, setPosition] = useState({ top: 0, left: 0 });
  
  useEffect(() => {
    if (isOpen && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      
      // Para PREVIEW, posicionar à direita do botão
      // Para PROGRAM, posicionar à esquerda do botão
      let left = rect.right + 10; // Padrão: à direita do botão
      
      // Se não couber à direita, posicionar à esquerda
      if (left + 280 > windowWidth) {
        left = rect.left - 280 - 10;
      }
      
      // Garantir que não saia da tela
      if (left < 10) left = 10;
      
      setPosition({
        top: rect.bottom + 8,
        left: left,
      });
    }
  }, [isOpen, anchorRef]);
  
  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);
  
  // Atualizar configurações
  const updateSetting = <K extends keyof CameraSettings>(key: K, value: CameraSettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    settingsStore[target] = newSettings;
    
    // Disparar evento para atualizar o vídeo
    window.dispatchEvent(new CustomEvent('monitor:settings-changed', {
      detail: { target, settings: newSettings }
    }));
  };
  
  // Reset para padrão
  const resetSettings = () => {
    const defaultSettings: CameraSettings = {
      zoom: 1,
      flipH: true, // Espelhado por padrão (como selfie)
      flipV: false,
      rotation: 0,
      brightness: 100,
      contrast: 100,
    };
    setSettings(defaultSettings);
    settingsStore[target] = defaultSettings;
    
    window.dispatchEvent(new CustomEvent('monitor:settings-changed', {
      detail: { target, settings: defaultSettings }
    }));
  };
  
  if (!isOpen) return null;
  
  const menuContent = (
    <div
      ref={menuRef}
      className="fixed z-[9999] w-72 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
      style={{ top: position.top, left: Math.max(10, position.left) }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center gap-2">
          <Sliders size={18} className="text-cyan-400" />
          <span className="font-semibold text-white">
            Configurações {target === 'preview' ? 'PREVIEW' : 'PROGRAM'}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>
      
      {/* Conteúdo */}
      <div className="p-4 space-y-4">
        {/* Zoom */}
        <div>
          <label className="text-sm text-gray-400 mb-2 block">Zoom: {(settings.zoom * 100).toFixed(0)}%</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateSetting('zoom', Math.max(0.5, settings.zoom - 0.1))}
              className="p-2 rounded bg-gray-800 hover:bg-gray-700 text-white"
            >
              <ZoomOut size={16} />
            </button>
            <input
              type="range"
              min="50"
              max="200"
              value={settings.zoom * 100}
              onChange={(e) => updateSetting('zoom', parseInt(e.target.value) / 100)}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <button
              onClick={() => updateSetting('zoom', Math.min(2, settings.zoom + 0.1))}
              className="p-2 rounded bg-gray-800 hover:bg-gray-700 text-white"
            >
              <ZoomIn size={16} />
            </button>
          </div>
        </div>
        
        {/* Espelhamento */}
        <div>
          <label className="text-sm text-gray-400 mb-2 block">Espelhamento</label>
          <div className="flex gap-2">
            <button
              onClick={() => updateSetting('flipH', !settings.flipH)}
              className={`flex-1 flex items-center justify-center gap-2 p-2 rounded ${
                settings.flipH ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <FlipHorizontal size={16} />
              <span className="text-sm">Horizontal</span>
            </button>
            <button
              onClick={() => updateSetting('flipV', !settings.flipV)}
              className={`flex-1 flex items-center justify-center gap-2 p-2 rounded ${
                settings.flipV ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <FlipVertical size={16} />
              <span className="text-sm">Vertical</span>
            </button>
          </div>
        </div>
        
        {/* Rotação */}
        <div>
          <label className="text-sm text-gray-400 mb-2 block">Rotação: {settings.rotation}°</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateSetting('rotation', (settings.rotation - 90 + 360) % 360)}
              className="p-2 rounded bg-gray-800 hover:bg-gray-700 text-white"
              title="Girar anti-horário"
            >
              <RotateCw size={16} style={{ transform: 'scaleX(-1)' }} />
            </button>
            <div className="flex-1 flex justify-center gap-1">
              {[0, 90, 180, 270].map((deg) => (
                <button
                  key={deg}
                  onClick={() => updateSetting('rotation', deg)}
                  className={`px-3 py-1 rounded text-sm ${
                    settings.rotation === deg 
                      ? 'bg-cyan-600 text-white' 
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {deg}°
                </button>
              ))}
            </div>
            <button
              onClick={() => updateSetting('rotation', (settings.rotation + 90) % 360)}
              className="p-2 rounded bg-gray-800 hover:bg-gray-700 text-white"
              title="Girar horário"
            >
              <RotateCw size={16} />
            </button>
          </div>
        </div>
        
        {/* Brilho */}
        <div>
          <label className="text-sm text-gray-400 mb-2 block">Brilho: {settings.brightness}%</label>
          <input
            type="range"
            min="50"
            max="150"
            value={settings.brightness}
            onChange={(e) => updateSetting('brightness', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
          />
        </div>
        
        {/* Contraste */}
        <div>
          <label className="text-sm text-gray-400 mb-2 block">Contraste: {settings.contrast}%</label>
          <input
            type="range"
            min="50"
            max="150"
            value={settings.contrast}
            onChange={(e) => updateSetting('contrast', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>
      </div>
      
      {/* Footer */}
      <div className="p-3 border-t border-gray-700 bg-gray-800">
        <button
          onClick={resetSettings}
          className="w-full flex items-center justify-center gap-2 p-2 rounded bg-gray-700 hover:bg-gray-600 text-white"
        >
          <RefreshCw size={16} />
          <span>Restaurar Padrão</span>
        </button>
      </div>
    </div>
  );
  
  return createPortal(menuContent, document.body);
}

export default MonitorSettingsMenu;
