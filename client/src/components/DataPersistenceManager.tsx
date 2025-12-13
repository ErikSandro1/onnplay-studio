import { useState, useEffect } from 'react';
import { Save, RotateCcw, Database, Trash2 } from 'lucide-react';
import { api, Preset } from '@/services/api';
import { toast } from 'sonner';

export default function DataPersistenceManager() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPresets = async () => {
    setLoading(true);
    try {
      const data = await api.presets.list();
      setPresets(data);
    } catch (error) {
      toast.error('Erro ao carregar presets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPresets();
  }, []);

  const handleSaveCurrentState = async () => {
    const name = prompt('Nome do Preset:');
    if (!name) return;

    await api.presets.save({
      name,
      layout: 'single',
      cameras: { main: 1 },
      audio: { muted: false, volume: 80 },
    });
    loadPresets();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza?')) {
      await api.presets.delete(id);
      loadPresets();
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Database size={16} className="text-orange-500" />
          Persistência de Dados
        </h3>
        <button
          onClick={handleSaveCurrentState}
          className="text-xs bg-orange-600 hover:bg-orange-700 text-white px-2 py-1 rounded flex items-center gap-1"
        >
          <Save size={12} />
          Salvar Atual
        </button>
      </div>

      <div className="space-y-2 max-h-40 overflow-y-auto">
        {loading ? (
          <p className="text-xs text-gray-500 text-center">Carregando...</p>
        ) : presets.length === 0 ? (
          <p className="text-xs text-gray-500 text-center">Nenhum preset salvo</p>
        ) : (
          presets.map(preset => (
            <div
              key={preset.id}
              className="flex items-center justify-between bg-gray-800 p-2 rounded border border-gray-700"
            >
              <span className="text-xs font-medium text-gray-300">{preset.name}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => toast.success(`Preset "${preset.name}" carregado!`)}
                  className="p-1 hover:bg-gray-700 rounded text-blue-400"
                  title="Carregar"
                >
                  <RotateCcw size={12} />
                </button>
                <button
                  onClick={() => handleDelete(preset.id)}
                  className="p-1 hover:bg-gray-700 rounded text-red-400"
                  title="Deletar"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
