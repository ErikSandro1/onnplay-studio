import { useState, useEffect } from 'react';
import { Save, Trash2, Plus, ChevronDown, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface PresetManagerProps {
  onLoadPreset?: (preset: { channels: Record<string, number>; master: number }) => void;
  currentChannels?: Record<string, number>;
  currentMaster?: number;
}

export default function PresetManager({
  onLoadPreset,
  currentChannels = {},
  currentMaster = 50,
}: PresetManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);

  // Fetch presets from API
  const { data: presets, isLoading, refetch } = trpc.mixerPresets.list.useQuery(undefined, {
    enabled: isOpen, // Only fetch when dropdown is open
  });

  // Create preset mutation
  const createMutation = trpc.mixerPresets.create.useMutation({
    onSuccess: () => {
      toast.success('Preset salvo com sucesso!');
      refetch();
      setNewPresetName('');
      setShowNewForm(false);
    },
    onError: (error) => {
      toast.error('Erro ao salvar preset: ' + error.message);
    },
  });

  // Delete preset mutation
  const deleteMutation = trpc.mixerPresets.delete.useMutation({
    onSuccess: () => {
      toast.success('Preset removido!');
      refetch();
    },
    onError: (error) => {
      toast.error('Erro ao remover preset: ' + error.message);
    },
  });

  const handleSavePreset = () => {
    if (!newPresetName.trim()) return;

    createMutation.mutate({
      name: newPresetName,
      channelLevels: currentChannels,
      eqSettings: { bass: 0, mid: 0, treble: 0 },
      isDefault: false,
    });
  };

  const handleLoadPreset = (preset: NonNullable<typeof presets>[number]) => {
    if (onLoadPreset) {
      const channelLevels = preset.channelLevels as Record<string, number>;
      onLoadPreset({
        channels: channelLevels,
        master: channelLevels.master ?? currentMaster,
      });
      toast.info(`Preset "${preset.name}" carregado`);
    }
    setIsOpen(false);
  };

  const handleDeletePreset = (id: number) => {
    deleteMutation.mutate({ id });
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors text-sm font-semibold"
      >
        <Save size={16} />
        Presets
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded shadow-lg z-50">
          {/* Presets List */}
          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 flex items-center justify-center text-gray-500">
                <Loader2 className="animate-spin mr-2" size={16} />
                Carregando...
              </div>
            ) : !presets || presets.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                Nenhum preset salvo
              </div>
            ) : (
              presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleLoadPreset(preset)}
                  className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-700 transition-colors text-left border-b border-gray-700 last:border-b-0"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{preset.name}</p>
                    <p className="text-xs text-gray-500">
                      {preset.isDefault ? '⭐ Padrão' : ''} | Criado: {new Date(preset.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePreset(preset.id);
                    }}
                    disabled={deleteMutation.isPending}
                    className="p-1 hover:bg-red-600 rounded transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={14} className="text-red-500" />
                  </button>
                </button>
              ))
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-700"></div>

          {/* Save New Preset Form */}
          {showNewForm ? (
            <div className="p-3 border-t border-gray-700">
              <input
                type="text"
                placeholder="Nome do preset..."
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleSavePreset();
                }}
                className="w-full px-2 py-1 bg-gray-700 text-white rounded text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSavePreset}
                  disabled={createMutation.isPending}
                  className="flex-1 px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    'Salvar'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowNewForm(false);
                    setNewPresetName('');
                  }}
                  className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewForm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 hover:bg-gray-700 transition-colors text-orange-500 font-semibold text-sm"
            >
              <Plus size={16} />
              Novo Preset
            </button>
          )}
        </div>
      )}
    </div>
  );
}
