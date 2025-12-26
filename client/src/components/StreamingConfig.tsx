/**
 * StreamingConfig Component
 * Configuração de destinos de streaming com persistência
 */

import { useState, useEffect } from 'react';
import { Settings, X, Save, Copy, Eye, EyeOff, AlertCircle, Check, Trash2 } from 'lucide-react';
import { rtmpStreamService, StreamDestination } from '../services/RTMPStreamService';

interface PlatformConfig {
  id: string;
  name: string;
  enabled: boolean;
  serverUrl: string;
  streamKey: string;
  title: string;
  description: string;
  thumbnail?: string;
  category?: string;
  tags?: string;
  visibility: 'public' | 'private' | 'unlisted';
  icon: string;
  color: string;
}

const STORAGE_KEY = 'onnplay_streaming_config';

const DEFAULT_PLATFORMS: PlatformConfig[] = [
  {
    id: 'youtube',
    name: 'YouTube Live',
    enabled: false,
    serverUrl: 'rtmps://a.rtmp.youtube.com:443/live2',
    streamKey: '',
    title: '',
    description: '',
    category: 'Gaming',
    tags: '',
    visibility: 'public',
    icon: '▶️',
    color: 'red',
  },
  {
    id: 'twitch',
    name: 'Twitch',
    enabled: false,
    serverUrl: 'rtmp://live-sjc.twitch.tv/app',
    streamKey: '',
    title: '',
    description: '',
    category: 'Just Chatting',
    tags: '',
    visibility: 'public',
    icon: '🎮',
    color: 'purple',
  },
  {
    id: 'facebook',
    name: 'Facebook Live',
    enabled: false,
    serverUrl: 'rtmps://live-api-s.facebook.com:443/rtmp/',
    streamKey: '',
    title: '',
    description: '',
    visibility: 'public',
    icon: '👥',
    color: 'blue',
  },
  {
    id: 'instagram',
    name: 'Instagram Live',
    enabled: false,
    serverUrl: 'rtmps://live-upload.instagram.com:443/rtmp/',
    streamKey: '',
    title: '',
    description: '',
    visibility: 'public',
    icon: '📸',
    color: 'pink',
  },
  {
    id: 'tiktok',
    name: 'TikTok Live',
    enabled: false,
    serverUrl: 'rtmp://ingest.tiktok.com:1935/live',
    streamKey: '',
    title: '',
    description: '',
    visibility: 'public',
    icon: '🎵',
    color: 'black',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Live',
    enabled: false,
    serverUrl: 'rtmps://live.linkedin.com:443/live',
    streamKey: '',
    title: '',
    description: '',
    visibility: 'public',
    icon: '💼',
    color: 'blue',
  },
  {
    id: 'custom_rtmp',
    name: 'RTMP Customizado',
    enabled: false,
    serverUrl: '',
    streamKey: '',
    title: '',
    description: '',
    visibility: 'public',
    icon: '⚙️',
    color: 'gray',
  },
];

interface StreamingConfigProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function StreamingConfig({ isOpen = false, onClose }: StreamingConfigProps) {
  const [platforms, setPlatforms] = useState<PlatformConfig[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('youtube');
  const [showStreamKey, setShowStreamKey] = useState<{ [key: string]: boolean }>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [hasChanges, setHasChanges] = useState(false);

  // Load saved config on mount
  useEffect(() => {
    loadConfig();
  }, []);

  // Auto-save when platforms change
  useEffect(() => {
    if (hasChanges && platforms.length > 0) {
      const timeoutId = setTimeout(() => {
        saveConfig();
      }, 1000); // Auto-save after 1 second of no changes
      return () => clearTimeout(timeoutId);
    }
  }, [platforms, hasChanges]);

  /**
   * Load configuration from localStorage
   */
  const loadConfig = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as PlatformConfig[];
        // Merge with defaults to ensure new platforms are included
        const merged = DEFAULT_PLATFORMS.map(defaultPlatform => {
          const savedPlatform = parsed.find(p => p.id === defaultPlatform.id);
          return savedPlatform ? { ...defaultPlatform, ...savedPlatform } : defaultPlatform;
        });
        setPlatforms(merged);
        
        // Sync with RTMPStreamService
        syncWithRTMPService(merged);
        
        console.log('✅ Streaming config loaded from localStorage');
      } else {
        setPlatforms(DEFAULT_PLATFORMS);
      }
    } catch (error) {
      console.error('Failed to load streaming config:', error);
      setPlatforms(DEFAULT_PLATFORMS);
    }
  };

  /**
   * Save configuration to localStorage
   */
  const saveConfig = () => {
    try {
      setSaveStatus('saving');
      
      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(platforms));
      
      // Sync with RTMPStreamService
      syncWithRTMPService(platforms);
      
      setSaveStatus('saved');
      setHasChanges(false);
      
      // Reset status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
      
      console.log('✅ Streaming config saved to localStorage');
    } catch (error) {
      console.error('Failed to save streaming config:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  /**
   * Sync platforms with RTMPStreamService
   */
  const syncWithRTMPService = (platformsToSync: PlatformConfig[]) => {
    // Clear existing destinations
    const existingDestinations = rtmpStreamService.getDestinations();
    existingDestinations.forEach(d => rtmpStreamService.removeDestination(d.id));
    
    // Add enabled platforms as destinations
    platformsToSync
      .filter(p => p.enabled && p.streamKey)
      .forEach(p => {
        const destination: StreamDestination = {
          id: p.id,
          platform: p.id === 'custom_rtmp' ? 'custom' : p.id as any,
          name: p.name,
          rtmpUrl: p.serverUrl,
          streamKey: p.streamKey,
          enabled: p.enabled,
        };
        rtmpStreamService.addDestination(destination);
      });
  };

  /**
   * Manual save button handler
   */
  const handleSave = () => {
    saveConfig();
  };

  const currentPlatform = platforms.find(p => p.id === selectedPlatform);

  const updatePlatform = (id: string, updates: Partial<PlatformConfig>) => {
    setPlatforms(platforms.map(p => (p.id === id ? { ...p, ...updates } : p)));
    setHasChanges(true);
  };

  const togglePlatform = (id: string) => {
    const platform = platforms.find(p => p.id === id);
    if (platform) {
      // Validate before enabling
      if (!platform.enabled && !platform.streamKey) {
        alert('Por favor, insira a chave de transmissão antes de ativar.');
        setSelectedPlatform(id);
        return;
      }
      updatePlatform(id, { enabled: !platform.enabled });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const clearPlatformConfig = (id: string) => {
    updatePlatform(id, {
      enabled: false,
      streamKey: '',
      title: '',
      description: '',
      tags: '',
    });
  };

  const getEnabledCount = () => platforms.filter(p => p.enabled).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
          <div className="flex items-center gap-2">
            <Settings size={24} className="text-orange-500" />
            <div>
              <h2 className="text-lg font-bold text-white">Configuração de Transmissão</h2>
              <p className="text-xs text-gray-400">
                {getEnabledCount()} plataforma{getEnabledCount() !== 1 ? 's' : ''} ativa{getEnabledCount() !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Save Status Indicator */}
            {saveStatus === 'saving' && (
              <span className="text-xs text-yellow-400 flex items-center gap-1">
                <span className="animate-spin">⏳</span> Salvando...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <Check size={14} /> Salvo!
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle size={14} /> Erro ao salvar
              </span>
            )}
            {hasChanges && saveStatus === 'idle' && (
              <span className="text-xs text-orange-400">• Alterações não salvas</span>
            )}
            
            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={!hasChanges || saveStatus === 'saving'}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                hasChanges && saveStatus !== 'saving'
                  ? 'bg-orange-600 hover:bg-orange-500 text-white'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Save size={14} />
              Salvar
            </button>
            
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Platform List */}
          <div className="w-64 border-r border-gray-700 overflow-y-auto">
            {platforms.map(platform => (
              <button
                key={platform.id}
                onClick={() => setSelectedPlatform(platform.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-700 transition-colors ${
                  selectedPlatform === platform.id
                    ? 'bg-orange-600 bg-opacity-20 border-l-4 border-l-orange-500'
                    : 'hover:bg-gray-700 hover:bg-opacity-30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xl">{platform.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{platform.name}</p>
                      <p className="text-xs text-gray-500">
                        {platform.enabled ? (
                          <span className="text-green-400">🟢 Ativo</span>
                        ) : platform.streamKey ? (
                          <span className="text-yellow-400">🟡 Configurado</span>
                        ) : (
                          <span className="text-gray-500">⚫ Não configurado</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={platform.enabled}
                    onChange={() => togglePlatform(platform.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-gray-600 text-orange-500 focus:ring-orange-500"
                  />
                </div>
              </button>
            ))}
          </div>

          {/* Configuration Panel */}
          {currentPlatform && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Platform Info */}
              <div className="bg-gray-900 border border-gray-700 rounded p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{currentPlatform.icon}</span>
                    <div>
                      <h3 className="text-lg font-bold text-white">{currentPlatform.name}</h3>
                      <p className="text-sm text-gray-400">
                        {currentPlatform.enabled ? (
                          <span className="text-green-400">✓ Transmissão ativa</span>
                        ) : currentPlatform.streamKey ? (
                          <span className="text-yellow-400">⚠ Configurado mas inativo</span>
                        ) : (
                          <span className="text-gray-400">Não configurado</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {currentPlatform.streamKey && (
                    <button
                      onClick={() => clearPlatformConfig(currentPlatform.id)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                      title="Limpar configuração"
                    >
                      <Trash2 size={12} />
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              {/* Server URL */}
              <div>
                <label className="text-sm font-semibold text-gray-400 block mb-2">
                  URL do Servidor RTMP
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currentPlatform.serverUrl}
                    onChange={(e) =>
                      updatePlatform(currentPlatform.id, { serverUrl: e.target.value })
                    }
                    className="flex-1 px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm font-mono"
                    placeholder="rtmp://..."
                  />
                  <button
                    onClick={() => copyToClipboard(currentPlatform.serverUrl)}
                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                    title="Copiar URL"
                  >
                    <Copy size={16} className="text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Stream Key */}
              <div>
                <label className="text-sm font-semibold text-gray-400 block mb-2">
                  Chave de Transmissão <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type={showStreamKey[currentPlatform.id] ? 'text' : 'password'}
                    value={currentPlatform.streamKey}
                    onChange={(e) =>
                      updatePlatform(currentPlatform.id, { streamKey: e.target.value })
                    }
                    className="flex-1 px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm font-mono"
                    placeholder="Insira sua chave de transmissão"
                  />
                  <button
                    onClick={() =>
                      setShowStreamKey(prev => ({
                        ...prev,
                        [currentPlatform.id]: !prev[currentPlatform.id],
                      }))
                    }
                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                  >
                    {showStreamKey[currentPlatform.id] ? (
                      <EyeOff size={16} className="text-gray-400" />
                    ) : (
                      <Eye size={16} className="text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={() => copyToClipboard(currentPlatform.streamKey)}
                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                    title="Copiar chave"
                  >
                    <Copy size={16} className="text-gray-400" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  ⚠️ Nunca compartilhe sua chave de transmissão com ninguém
                </p>
              </div>

              {/* Title */}
              <div>
                <label className="text-sm font-semibold text-gray-400 block mb-2">
                  Título da Transmissão
                </label>
                <input
                  type="text"
                  value={currentPlatform.title}
                  onChange={(e) =>
                    updatePlatform(currentPlatform.id, { title: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                  placeholder="Título da sua transmissão ao vivo"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-semibold text-gray-400 block mb-2">
                  Descrição
                </label>
                <textarea
                  value={currentPlatform.description}
                  onChange={(e) =>
                    updatePlatform(currentPlatform.id, { description: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm resize-none"
                  rows={3}
                  placeholder="Descrição da transmissão..."
                />
              </div>

              {/* Tags */}
              <div>
                <label className="text-sm font-semibold text-gray-400 block mb-2">
                  Tags (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={currentPlatform.tags || ''}
                  onChange={(e) =>
                    updatePlatform(currentPlatform.id, { tags: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                  placeholder="gaming, live, stream"
                />
              </div>

              {/* Visibility */}
              <div>
                <label className="text-sm font-semibold text-gray-400 block mb-2">
                  Visibilidade
                </label>
                <select
                  value={currentPlatform.visibility}
                  onChange={(e) =>
                    updatePlatform(currentPlatform.id, {
                      visibility: e.target.value as 'public' | 'private' | 'unlisted',
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                >
                  <option value="public">🌐 Público</option>
                  <option value="unlisted">🔗 Não listado</option>
                  <option value="private">🔒 Privado</option>
                </select>
              </div>

              {/* Help Text */}
              <div className="bg-gray-900/50 border border-gray-700 rounded p-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                  <AlertCircle size={14} />
                  Como obter a chave de transmissão
                </h4>
                <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                  {currentPlatform.id === 'youtube' && (
                    <>
                      <li>Acesse YouTube Studio → Criar → Transmitir ao vivo</li>
                      <li>Copie a "Chave de transmissão" na seção de configurações</li>
                    </>
                  )}
                  {currentPlatform.id === 'twitch' && (
                    <>
                      <li>Acesse Twitch → Painel do Criador → Configurações → Stream</li>
                      <li>Clique em "Copiar" ao lado da chave de transmissão</li>
                    </>
                  )}
                  {currentPlatform.id === 'facebook' && (
                    <>
                      <li>Acesse Facebook → Vídeo ao vivo → Usar chave de transmissão</li>
                      <li>Copie a chave de transmissão exibida</li>
                    </>
                  )}
                  {currentPlatform.id === 'instagram' && (
                    <>
                      <li>Instagram Live via RTMP requer conta profissional</li>
                      <li>Use o Meta Business Suite para obter a chave</li>
                    </>
                  )}
                  {currentPlatform.id === 'tiktok' && (
                    <>
                      <li>TikTok Live requer conta com mais de 1000 seguidores</li>
                      <li>Acesse TikTok Studio para obter a chave RTMP</li>
                    </>
                  )}
                  {currentPlatform.id === 'linkedin' && (
                    <>
                      <li>LinkedIn Live requer aprovação prévia</li>
                      <li>Acesse LinkedIn → Criar evento ao vivo</li>
                    </>
                  )}
                  {currentPlatform.id === 'custom_rtmp' && (
                    <>
                      <li>Insira a URL completa do servidor RTMP</li>
                      <li>Insira a chave de stream fornecida pelo serviço</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-800 sticky bottom-0">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              💾 As configurações são salvas automaticamente no seu navegador
            </p>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges}
                className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors ${
                  hasChanges
                    ? 'bg-orange-600 hover:bg-orange-500 text-white'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Save size={16} />
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
