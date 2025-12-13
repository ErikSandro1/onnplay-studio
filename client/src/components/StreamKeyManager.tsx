import { useState } from 'react';
import { Eye, EyeOff, Copy, Trash2, Plus, AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

type Platform = 'youtube' | 'twitch' | 'facebook' | 'instagram' | 'tiktok' | 'linkedin' | 'rtmp';

interface StreamKeyFormData {
  platform: Platform;
  label: string;
  streamKey: string;
  rtmpUrl?: string;
}

const PLATFORM_CONFIG: Record<Platform, { name: string; icon: string; color: string; requiresRtmp: boolean }> = {
  youtube: { name: 'YouTube', icon: '▶️', color: 'from-red-600 to-red-700', requiresRtmp: false },
  twitch: { name: 'Twitch', icon: '🎮', color: 'from-purple-600 to-purple-700', requiresRtmp: false },
  facebook: { name: 'Facebook', icon: '📘', color: 'from-blue-600 to-blue-700', requiresRtmp: false },
  instagram: { name: 'Instagram', icon: '📷', color: 'from-pink-600 to-pink-700', requiresRtmp: false },
  tiktok: { name: 'TikTok', icon: '🎵', color: 'from-black to-gray-800', requiresRtmp: false },
  linkedin: { name: 'LinkedIn', icon: '💼', color: 'from-blue-700 to-blue-800', requiresRtmp: false },
  rtmp: { name: 'RTMP Customizado', icon: '🔗', color: 'from-gray-600 to-gray-700', requiresRtmp: true },
};

export default function StreamKeyManager() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState<StreamKeyFormData>({
    platform: 'youtube',
    label: '',
    streamKey: '',
    rtmpUrl: '',
  });

  // Fetch stream keys
  const { data: streamKeys, isLoading, refetch } = trpc.streamingConfigs.list.useQuery();

  // Create mutation
  const createMutation = trpc.streamingConfigs.create.useMutation({
    onSuccess: () => {
      toast.success('Stream key adicionada com sucesso!');
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error('Erro ao adicionar stream key: ' + error.message);
    },
  });

  // Update mutation
  const updateMutation = trpc.streamingConfigs.update.useMutation({
    onSuccess: () => {
      toast.success('Stream key atualizada!');
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error('Erro ao atualizar stream key: ' + error.message);
    },
  });

  // Delete mutation
  const deleteMutation = trpc.streamingConfigs.delete.useMutation({
    onSuccess: () => {
      toast.success('Stream key removida!');
      refetch();
    },
    onError: (error) => {
      toast.error('Erro ao remover stream key: ' + error.message);
    },
  });

  const resetForm = () => {
    setFormData({ platform: 'youtube', label: '', streamKey: '', rtmpUrl: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.label.trim() || !formData.streamKey.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (formData.platform === 'rtmp' && !formData.rtmpUrl?.trim()) {
      toast.error('URL RTMP é obrigatória para streaming customizado');
      return;
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        ...formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (key: any) => {
    setFormData({
      platform: key.platform as Platform,
      label: key.label || '',
      streamKey: key.streamKey || '',
      rtmpUrl: key.rtmpUrl || '',
    });
    setEditingId(key.id);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Tem certeza que deseja remover esta stream key?')) {
      deleteMutation.mutate({ id });
    }
  };

  const toggleVisibility = (id: number) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(id)) {
      newVisible.delete(id);
    } else {
      newVisible.add(id);
    }
    setVisibleKeys(newVisible);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência!');
  };

  const maskStreamKey = (key: string) => {
    if (key.length <= 8) return '*'.repeat(key.length);
    return key.substring(0, 4) + '*'.repeat(Math.max(8, key.length - 8)) + key.substring(key.length - 4);
  };

  const platformConfig = PLATFORM_CONFIG[formData.platform];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Stream Keys</h2>
          <p className="text-gray-400 text-sm mt-1">Gerencie suas chaves de transmissão de forma segura</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
        >
          <Plus size={18} />
          Nova Stream Key
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            {editingId ? 'Editar Stream Key' : 'Adicionar Nova Stream Key'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Platform Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Plataforma</label>
              <select
                value={formData.platform}
                onChange={(e) => setFormData({ ...formData, platform: e.target.value as Platform })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {Object.entries(PLATFORM_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.icon} {config.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Label */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Nome/Rótulo</label>
              <input
                type="text"
                placeholder="ex: YouTube Principal, Twitch Backup"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Stream Key */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Stream Key</label>
              <input
                type="password"
                placeholder="Cole sua stream key aqui"
                value={formData.streamKey}
                onChange={(e) => setFormData({ ...formData, streamKey: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-gray-500 mt-1">🔒 Sua chave é criptografada e armazenada com segurança</p>
            </div>

            {/* RTMP URL (if applicable) */}
            {formData.platform === 'rtmp' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">URL RTMP</label>
                <input
                  type="text"
                  placeholder="rtmp://seu-servidor.com/live"
                  value={formData.rtmpUrl}
                  onChange={(e) => setFormData({ ...formData, rtmpUrl: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  editingId ? 'Atualizar' : 'Adicionar'
                )}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stream Keys List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Loader2 className="animate-spin mr-2" size={20} />
            Carregando...
          </div>
        ) : !streamKeys || streamKeys.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Nenhuma stream key configurada</p>
            <p className="text-gray-500 text-sm mt-1">Adicione sua primeira stream key para começar a transmitir</p>
          </div>
        ) : (
          streamKeys.map((key) => {
            const config = PLATFORM_CONFIG[key.platform as Platform];
            const isVisible = visibleKeys.has(key.id);

            return (
              <div
                key={key.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-orange-500/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  {/* Platform Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center text-xl flex-shrink-0`}>
                      {config.icon}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white">{key.label || config.name}</h3>
                        {key.isEnabled ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                            <CheckCircle size={12} />
                            Ativo
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-500/20 text-gray-400 text-xs rounded-full">
                            <XCircle size={12} />
                            Inativo
                          </span>
                        )}
                      </div>
                      
                      {/* Stream Key Display */}
                      <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2 mb-2">
                        <code className="text-sm text-gray-300 font-mono flex-1">
                          {isVisible ? key.streamKey : maskStreamKey(key.streamKey || '')}
                        </code>
                        <button
                          onClick={() => toggleVisibility(key.id)}
                          className="p-1.5 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-white"
                          title={isVisible ? 'Ocultar' : 'Mostrar'}
                        >
                          {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(key.streamKey || '')}
                          className="p-1.5 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-white"
                          title="Copiar"
                        >
                          <Copy size={16} />
                        </button>
                      </div>

                      {/* RTMP URL (if applicable) */}
                      {key.rtmpUrl && (
                        <div className="text-xs text-gray-500">
                          <span className="font-medium">RTMP:</span> {key.rtmpUrl}
                        </div>
                      )}

                      {/* Last Used */}
                      <p className="text-xs text-gray-500 mt-1">
                        Última utilização: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString('pt-BR') : 'Nunca'}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(key)}
                      className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(key.id)}
                      disabled={deleteMutation.isPending}
                      className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400 disabled:opacity-50"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Security Info */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <div className="flex gap-3">
          <AlertCircle className="text-blue-400 flex-shrink-0" size={20} />
          <div className="text-sm">
            <p className="text-blue-300 font-medium mb-1">🔒 Segurança de Stream Keys</p>
            <ul className="text-blue-200/80 space-y-1 text-xs">
              <li>• Suas chaves são criptografadas e armazenadas com segurança</li>
              <li>• Nunca compartilhe suas stream keys com terceiros</li>
              <li>• Regenere suas chaves regularmente nas plataformas</li>
              <li>• Use rótulos descritivos para identificar cada chave</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
