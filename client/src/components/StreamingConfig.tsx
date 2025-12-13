import { useState } from 'react';
import { Settings, X, Save, Copy, Eye, EyeOff, AlertCircle } from 'lucide-react';

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
    id: 'twitch_secondary',
    name: 'Twitch (Secundário)',
    enabled: false,
    serverUrl: 'rtmp://live-sjc.twitch.tv/app',
    streamKey: '',
    title: '',
    description: '',
    visibility: 'public',
    icon: '🎮',
    color: 'purple',
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
  const [platforms, setPlatforms] = useState<PlatformConfig[]>(DEFAULT_PLATFORMS);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('youtube');
  const [showStreamKey, setShowStreamKey] = useState<{ [key: string]: boolean }>({});

  const currentPlatform = platforms.find(p => p.id === selectedPlatform);

  const updatePlatform = (id: string, updates: Partial<PlatformConfig>) => {
    setPlatforms(platforms.map(p => (p.id === id ? { ...p, ...updates } : p)));
  };

  const togglePlatform = (id: string) => {
    const platform = platforms.find(p => p.id === id);
    if (platform) {
      updatePlatform(id, { enabled: !platform.enabled });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getEnabledCount = () => platforms.filter(p => p.enabled).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 sticky top-0 bg-gray-800">
          <div className="flex items-center gap-2">
            <Settings size={24} className="text-orange-500" />
            <div>
              <h2 className="text-lg font-bold text-white">Configuração de Transmissão</h2>
              <p className="text-xs text-gray-400">
                {getEnabledCount()} plataforma{getEnabledCount() !== 1 ? 's' : ''} ativa{getEnabledCount() !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
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
                        {platform.enabled ? '🟢 Ativo' : '⚫ Inativo'}
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
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{currentPlatform.icon}</span>
                  <div>
                    <h3 className="text-lg font-bold text-white">{currentPlatform.name}</h3>
                    <p className="text-sm text-gray-400">
                      {currentPlatform.enabled ? '✓ Transmissão ativa' : 'Desativado'}
                    </p>
                  </div>
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
                  Chave de Transmissão
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
                  placeholder="Descrição da sua transmissão"
                />
              </div>

              {/* Category & Tags */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-400 block mb-2">
                    Categoria
                  </label>
                  <input
                    type="text"
                    value={currentPlatform.category || ''}
                    onChange={(e) =>
                      updatePlatform(currentPlatform.id, { category: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    placeholder="Ex: Gaming, Educação"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-400 block mb-2">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={currentPlatform.tags || ''}
                    onChange={(e) =>
                      updatePlatform(currentPlatform.id, { tags: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    placeholder="Ex: live, streaming, ao vivo"
                  />
                </div>
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
                  <option value="public">🌍 Público</option>
                  <option value="unlisted">🔗 Não listado</option>
                  <option value="private">🔒 Privado</option>
                </select>
              </div>

              {/* Info Box */}
              <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded p-3 flex gap-2">
                <AlertCircle size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-300">
                  <p className="font-semibold mb-1">💡 Dica:</p>
                  <p>
                    Você pode transmitir para múltiplas plataformas simultaneamente. Ative as
                    plataformas desejadas e configure as chaves de transmissão.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-4 flex items-center justify-between bg-gray-800 sticky bottom-0">
          <div className="text-sm text-gray-400">
            {getEnabledCount()} plataforma{getEnabledCount() !== 1 ? 's' : ''} configurada{getEnabledCount() !== 1 ? 's' : ''}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded font-semibold transition-colors"
            >
              Fechar
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded font-semibold transition-colors"
            >
              <Save size={16} />
              Salvar Configurações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
