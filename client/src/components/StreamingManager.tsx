import { useState } from 'react';
import { Radio, Settings, Copy, Check, AlertCircle, Zap } from 'lucide-react';

interface StreamPlatform {
  id: string;
  name: string;
  icon: string;
  url: string;
  key: string;
  isConnected: boolean;
  viewers: number;
}

interface StreamingManagerProps {
  isStreaming?: boolean;
  onStartStreaming?: () => void;
  onStopStreaming?: () => void;
}

export default function StreamingManager({
  isStreaming = false,
  onStartStreaming,
  onStopStreaming,
}: StreamingManagerProps) {
  const [platforms, setPlatforms] = useState<StreamPlatform[]>([
    {
      id: 'youtube',
      name: 'YouTube Live',
      icon: '▶️',
      url: 'rtmps://a.rtmp.youtube.com/live2',
      key: 'xxxx-xxxx-xxxx-xxxx',
      isConnected: false,
      viewers: 0,
    },
    {
      id: 'twitch',
      name: 'Twitch',
      icon: '🎮',
      url: 'rtmps://live-jfk.twitch.tv/app',
      key: 'xxxx-xxxx-xxxx-xxxx',
      isConnected: false,
      viewers: 0,
    },
    {
      id: 'facebook',
      name: 'Facebook Live',
      icon: '👍',
      url: 'rtmps://live-api-s.facebook.com:443/rtmp/',
      key: 'xxxx-xxxx-xxxx-xxxx',
      isConnected: false,
      viewers: 0,
    },
  ]);

  const [showSettings, setShowSettings] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [obsSettings, setObsSettings] = useState({
    obsUrl: 'ws://localhost:4444',
    obsPassword: '',
    isConnectedToObs: false,
  });

  const handleCopyKey = (key: string, platformId: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(platformId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleStartStreaming = () => {
    // Simular conexão com plataformas
    setPlatforms(platforms.map(p => ({
      ...p,
      isConnected: true,
      viewers: Math.floor(Math.random() * 5000) + 100,
    })));
    onStartStreaming?.();
  };

  const handleStopStreaming = () => {
    setPlatforms(platforms.map(p => ({
      ...p,
      isConnected: false,
      viewers: 0,
    })));
    onStopStreaming?.();
  };

  const handleConnectObs = () => {
    setObsSettings(prev => ({
      ...prev,
      isConnectedToObs: !prev.isConnectedToObs,
    }));
  };

  return (
    <div className="bg-gray-800 rounded border border-gray-700 p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Streaming</h3>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
        >
          ⚙️
        </button>
      </div>

      {/* OBS Integration */}
      {showSettings && (
        <div className="mb-4 p-3 bg-gray-900 rounded border border-gray-700">
          <p className="text-xs font-semibold text-gray-400 mb-2">OBS/vMix Integration</p>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="ws://localhost:4444"
              value={obsSettings.obsUrl}
              onChange={(e) => setObsSettings(prev => ({ ...prev, obsUrl: e.target.value }))}
              className="w-full px-2 py-1 bg-gray-800 text-white rounded text-xs border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <input
              type="password"
              placeholder="Senha OBS"
              value={obsSettings.obsPassword}
              onChange={(e) => setObsSettings(prev => ({ ...prev, obsPassword: e.target.value }))}
              className="w-full px-2 py-1 bg-gray-800 text-white rounded text-xs border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              onClick={handleConnectObs}
              className={`w-full px-3 py-2 rounded text-xs font-semibold transition-colors ${
                obsSettings.isConnectedToObs
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              {obsSettings.isConnectedToObs ? '✅ Conectado ao OBS' : 'Conectar ao OBS'}
            </button>
          </div>
        </div>
      )}

      {/* Streaming Status */}
      <div className="mb-4 p-3 bg-gray-900 rounded border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Radio
              size={12}
              className={isStreaming ? 'fill-red-600 text-red-600 animate-pulse' : 'text-gray-600'}
            />
            <span className="text-sm font-semibold text-white">
              {isStreaming ? 'TRANSMITINDO' : 'OFFLINE'}
            </span>
          </div>
        </div>

        {/* Streaming Controls */}
        <div className="flex gap-2 mb-3">
          {!isStreaming ? (
            <button
              onClick={handleStartStreaming}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold transition-colors"
            >
              <Radio size={12} className="fill-current" />
              Iniciar
            </button>
          ) : (
            <button
              onClick={handleStopStreaming}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs font-semibold transition-colors"
            >
              <Radio size={12} />
              Parar
            </button>
          )}
        </div>

        {/* Platforms Status */}
        <div className="space-y-2">
          {platforms.map((platform) => (
            <div
              key={platform.id}
              className={`p-2 rounded border transition-colors ${
                platform.isConnected
                  ? 'bg-green-900 bg-opacity-30 border-green-700'
                  : 'bg-gray-800 border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{platform.icon}</span>
                  <span className="text-xs font-semibold text-white">{platform.name}</span>
                  {platform.isConnected && (
                    <span className="text-xs text-green-400">
                      {platform.viewers.toLocaleString()} espectadores
                    </span>
                  )}
                </div>
                {platform.isConnected && (
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stream Keys */}
      <div className="flex-1 overflow-y-auto">
        <p className="text-xs font-semibold text-gray-400 mb-2">Chaves de Stream</p>
        <div className="space-y-2">
          {platforms.map((platform) => (
            <div
              key={platform.id}
              className="p-2 bg-gray-900 rounded border border-gray-700"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-semibold text-white">{platform.name}</span>
                <button
                  onClick={() => handleCopyKey(platform.key, platform.id)}
                  className="p-1 hover:bg-gray-700 rounded transition-colors"
                >
                  {copiedKey === platform.id ? (
                    <Check size={12} className="text-green-500" />
                  ) : (
                    <Copy size={12} className="text-gray-400" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 font-mono truncate">{platform.key}</p>
              <p className="text-xs text-gray-600 mt-1">{platform.url}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="mt-4 p-2 bg-blue-900 bg-opacity-30 border border-blue-700 rounded flex items-start gap-2">
        <AlertCircle size={12} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-300">
          Use as chaves acima no OBS/vMix para transmitir simultaneamente em múltiplas plataformas
        </p>
      </div>
    </div>
  );
}
