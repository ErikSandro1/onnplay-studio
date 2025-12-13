import { useState } from 'react';
import { X, Radio, Youtube, Twitch, Facebook, Linkedin, Twitter, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface Platform {
  id: string;
  name: string;
  icon: any;
  color: string;
  enabled: boolean;
  streamKey: string;
  rtmpUrl: string;
  quality: '1080p60' | '1080p30' | '720p60' | '720p30';
  bitrate: number;
}

interface StreamingSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (platforms: Platform[]) => void;
}

export default function StreamingSettings({ isOpen, onClose, onSave }: StreamingSettingsProps) {
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});
  const [platforms, setPlatforms] = useState<Platform[]>([
    {
      id: 'youtube',
      name: 'YouTube Live',
      icon: Youtube,
      color: 'bg-red-600',
      enabled: true,
      streamKey: '',
      rtmpUrl: 'rtmps://a.rtmp.youtube.com/live2',
      quality: '1080p60',
      bitrate: 8000,
    },
    {
      id: 'twitch',
      name: 'Twitch',
      icon: Twitch,
      color: 'bg-purple-600',
      enabled: true,
      streamKey: '',
      rtmpUrl: 'rtmps://live.twitch.tv/app',
      quality: '1080p60',
      bitrate: 6000,
    },
    {
      id: 'facebook',
      name: 'Facebook Live',
      icon: Facebook,
      color: 'bg-blue-600',
      enabled: false,
      streamKey: '',
      rtmpUrl: 'rtmps://live-api-s.facebook.com:443/rtmp/',
      quality: '720p30',
      bitrate: 4000,
    },
    {
      id: 'linkedin',
      name: 'LinkedIn Live',
      icon: Linkedin,
      color: 'bg-blue-700',
      enabled: false,
      streamKey: '',
      rtmpUrl: 'rtmps://rtmp-api.linkedin.com:443/live',
      quality: '720p30',
      bitrate: 4000,
    },
    {
      id: 'twitter',
      name: 'Twitter/X',
      icon: Twitter,
      color: 'bg-sky-500',
      enabled: false,
      streamKey: '',
      rtmpUrl: 'rtmps://ingest.pscp.tv:443/x',
      quality: '720p30',
      bitrate: 3000,
    },
  ]);

  if (!isOpen) return null;

  const togglePlatform = (id: string) => {
    setPlatforms((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
  };

  const updateStreamKey = (id: string, streamKey: string) => {
    setPlatforms((prev) =>
      prev.map((p) => (p.id === id ? { ...p, streamKey } : p))
    );
  };

  const updateQuality = (id: string, quality: Platform['quality']) => {
    setPlatforms((prev) =>
      prev.map((p) => (p.id === id ? { ...p, quality } : p))
    );
  };

  const updateBitrate = (id: string, bitrate: number) => {
    setPlatforms((prev) =>
      prev.map((p) => (p.id === id ? { ...p, bitrate } : p))
    );
  };

  const toggleShowKey = (id: string) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = () => {
    const enabledPlatforms = platforms.filter((p) => p.enabled);
    
    if (enabledPlatforms.length === 0) {
      toast.error('Ative pelo menos uma plataforma');
      return;
    }

    const missingKeys = enabledPlatforms.filter((p) => !p.streamKey);
    if (missingKeys.length > 0) {
      toast.warning('Algumas plataformas não têm chave de stream', {
        description: `Configure: ${missingKeys.map((p) => p.name).join(', ')}`,
      });
    }

    onSave(platforms);
    toast.success('Configurações de streaming salvas!', {
      description: `${enabledPlatforms.length} plataforma(s) ativa(s)`,
    });
    onClose();
  };

  const totalBitrate = platforms
    .filter((p) => p.enabled)
    .reduce((sum, p) => sum + p.bitrate, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-full max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Radio className="text-red-500" size={24} />
            Configurações de Multi-Streaming
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {platforms.map((platform) => {
            const Icon = platform.icon;
            return (
              <div
                key={platform.id}
                className={`border-2 ${
                  platform.enabled ? 'border-orange-500' : 'border-gray-700'
                } rounded-lg p-4 transition-all`}
              >
                {/* Platform Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`${platform.color} p-2 rounded`}>
                      <Icon className="text-white" size={24} />
                    </div>
                    <div>
                      <div className="text-white font-semibold">{platform.name}</div>
                      <div className="text-xs text-gray-400">{platform.rtmpUrl}</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={platform.enabled}
                      onChange={() => togglePlatform(platform.id)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                  </label>
                </div>

                {platform.enabled && (
                  <div className="space-y-3">
                    {/* Stream Key */}
                    <div>
                      <label className="block text-sm font-semibold text-white mb-1">
                        Chave de Stream
                      </label>
                      <div className="flex gap-2">
                        <input
                          type={showKeys[platform.id] ? 'text' : 'password'}
                          value={platform.streamKey}
                          onChange={(e) => updateStreamKey(platform.id, e.target.value)}
                          placeholder="Cole sua chave de stream aqui"
                          className="flex-1 bg-gray-800 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <button
                          onClick={() => toggleShowKey(platform.id)}
                          className="bg-gray-700 hover:bg-gray-600 text-white px-3 rounded transition-colors"
                        >
                          {showKeys[platform.id] ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* Quality & Bitrate */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-white mb-1">
                          Qualidade
                        </label>
                        <select
                          value={platform.quality}
                          onChange={(e) => updateQuality(platform.id, e.target.value as any)}
                          className="w-full bg-gray-800 text-white rounded px-3 py-2"
                        >
                          <option value="1080p60">1080p @ 60fps</option>
                          <option value="1080p30">1080p @ 30fps</option>
                          <option value="720p60">720p @ 60fps</option>
                          <option value="720p30">720p @ 30fps</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-white mb-1">
                          Bitrate: {platform.bitrate} kbps
                        </label>
                        <input
                          type="range"
                          min="1000"
                          max="10000"
                          step="500"
                          value={platform.bitrate}
                          onChange={(e) => updateBitrate(platform.id, Number(e.target.value))}
                          className="w-full mt-2"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Summary */}
          <div className="bg-gray-800 rounded-lg p-4 mt-4">
            <div className="text-white font-semibold mb-2">Resumo do Multi-Streaming</div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-400">Plataformas Ativas</div>
                <div className="text-2xl font-bold text-orange-500">
                  {platforms.filter((p) => p.enabled).length}
                </div>
              </div>
              <div>
                <div className="text-gray-400">Bitrate Total</div>
                <div className="text-2xl font-bold text-orange-500">
                  {(totalBitrate / 1000).toFixed(1)} Mbps
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              ⚠️ Certifique-se de ter uma conexão de internet com upload de pelo menos{' '}
              {(totalBitrate / 1000 * 1.5).toFixed(1)} Mbps
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors font-semibold"
          >
            Salvar e Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}
