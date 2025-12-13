import { useState } from 'react';
import { Layers, Type, Image, X, Plus, Eye, EyeOff, Edit, Trash2, Save } from 'lucide-react';

interface Overlay {
  id: string;
  type: 'lower-third' | 'banner' | 'logo' | 'custom';
  name: string;
  isActive: boolean;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  content: {
    title?: string;
    subtitle?: string;
    imageUrl?: string;
    backgroundColor?: string;
    textColor?: string;
  };
}

interface OverlayManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OverlayManager({ isOpen, onClose }: OverlayManagerProps) {
  const [overlays, setOverlays] = useState<Overlay[]>([
    {
      id: '1',
      type: 'lower-third',
      name: 'Lower Third Principal',
      isActive: false,
      position: 'bottom',
      content: {
        title: 'João Silva',
        subtitle: 'CEO & Fundador',
        backgroundColor: '#f97316',
        textColor: '#ffffff',
      },
    },
    {
      id: '2',
      type: 'banner',
      name: 'Banner de Promoção',
      isActive: false,
      position: 'top',
      content: {
        title: '🎉 Desconto de 50% - Use o código: LIVE50',
        backgroundColor: '#16a34a',
        textColor: '#ffffff',
      },
    },
    {
      id: '3',
      type: 'logo',
      name: 'Logo da Empresa',
      isActive: true,
      position: 'top',
      content: {
        imageUrl: '/logo-onnplay.png',
      },
    },
  ]);

  const [editingOverlay, setEditingOverlay] = useState<Overlay | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  const toggleOverlay = (id: string) => {
    setOverlays((prev) =>
      prev.map((overlay) =>
        overlay.id === id ? { ...overlay, isActive: !overlay.isActive } : overlay
      )
    );
  };

  const deleteOverlay = (id: string) => {
    setOverlays((prev) => prev.filter((overlay) => overlay.id !== id));
  };

  const addNewOverlay = () => {
    const newOverlay: Overlay = {
      id: Date.now().toString(),
      type: 'lower-third',
      name: 'Novo Overlay',
      isActive: false,
      position: 'bottom',
      content: {
        title: 'Título',
        subtitle: 'Subtítulo',
        backgroundColor: '#f97316',
        textColor: '#ffffff',
      },
    };
    setOverlays((prev) => [...prev, newOverlay]);
    setEditingOverlay(newOverlay);
  };

  const saveOverlay = () => {
    if (!editingOverlay) return;
    setOverlays((prev) =>
      prev.map((overlay) => (overlay.id === editingOverlay.id ? editingOverlay : overlay))
    );
    setEditingOverlay(null);
  };

  const getOverlayTypeIcon = (type: string) => {
    switch (type) {
      case 'lower-third':
        return <Type size={16} />;
      case 'banner':
        return <Layers size={16} />;
      case 'logo':
        return <Image size={16} />;
      default:
        return <Layers size={16} />;
    }
  };

  const getPositionLabel = (position: string) => {
    const labels: Record<string, string> = {
      top: 'Topo',
      bottom: 'Inferior',
      left: 'Esquerda',
      right: 'Direita',
      center: 'Centro',
    };
    return labels[position] || position;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-6xl h-[85vh] flex border border-gray-700">
        {/* Left Panel - Overlay List */}
        <div className="w-80 border-r border-gray-700 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers size={20} className="text-orange-500" />
                <h2 className="text-lg font-bold text-white">Overlays</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-800 rounded transition-colors"
              >
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <button
              onClick={addNewOverlay}
              className="w-full px-3 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              Novo Overlay
            </button>
          </div>

          {/* Overlay List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {overlays.map((overlay) => (
              <div
                key={overlay.id}
                className={`p-3 rounded-lg border transition-all ${
                  editingOverlay?.id === overlay.id
                    ? 'border-orange-600 bg-orange-900/20'
                    : overlay.isActive
                    ? 'border-green-600/50 bg-green-900/10'
                    : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="text-gray-400">{getOverlayTypeIcon(overlay.type)}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-white truncate">
                        {overlay.name}
                      </h3>
                      <p className="text-xs text-gray-400">{getPositionLabel(overlay.position)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleOverlay(overlay.id)}
                    className={`p-1 rounded transition-colors ${
                      overlay.isActive
                        ? 'text-green-500 hover:bg-green-900/30'
                        : 'text-gray-500 hover:bg-gray-700'
                    }`}
                    title={overlay.isActive ? 'Ocultar' : 'Mostrar'}
                  >
                    {overlay.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingOverlay(overlay)}
                    className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white transition-colors flex items-center justify-center gap-1"
                  >
                    <Edit size={12} />
                    Editar
                  </button>
                  <button
                    onClick={() => deleteOverlay(overlay.id)}
                    className="px-2 py-1 bg-red-900/50 hover:bg-red-900 rounded text-xs text-red-400 hover:text-white transition-colors"
                    title="Deletar"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Preview & Editor */}
        <div className="flex-1 flex flex-col">
          {/* Preview Toggle */}
          <div className="p-3 border-b border-gray-700 flex items-center justify-between bg-gray-900/50">
            <h3 className="text-sm font-semibold text-white">
              {editingOverlay ? 'Editando Overlay' : 'Visualização'}
            </h3>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-300 transition-colors flex items-center gap-2"
            >
              {showPreview ? <Eye size={14} /> : <EyeOff size={14} />}
              {showPreview ? 'Ocultar' : 'Mostrar'} Preview
            </button>
          </div>

          {/* Preview Area */}
          {showPreview && (
            <div className="relative bg-gray-950 aspect-video m-4 rounded-lg overflow-hidden border border-gray-700">
              {/* Simulated video background */}
              <div className="absolute inset-0 flex items-center justify-center text-gray-600">
                <div className="text-center">
                  <Layers size={48} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Preview da Transmissão</p>
                </div>
              </div>

              {/* Active Overlays */}
              {overlays
                .filter((o) => o.isActive || o.id === editingOverlay?.id)
                .map((overlay) => {
                  if (overlay.type === 'lower-third' && overlay.content.title) {
                    return (
                      <div
                        key={overlay.id}
                        className={`absolute ${
                          overlay.position === 'bottom' ? 'bottom-8 left-8' : 'top-8 left-8'
                        } animate-in slide-in-from-left duration-500`}
                        style={{
                          backgroundColor: overlay.content.backgroundColor,
                          color: overlay.content.textColor,
                        }}
                      >
                        <div className="px-6 py-3 rounded-r-lg">
                          <h3 className="text-lg font-bold">{overlay.content.title}</h3>
                          {overlay.content.subtitle && (
                            <p className="text-sm opacity-90">{overlay.content.subtitle}</p>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (overlay.type === 'banner' && overlay.content.title) {
                    return (
                      <div
                        key={overlay.id}
                        className={`absolute left-0 right-0 ${
                          overlay.position === 'top' ? 'top-0' : 'bottom-0'
                        } animate-in slide-in-from-top duration-500`}
                        style={{
                          backgroundColor: overlay.content.backgroundColor,
                          color: overlay.content.textColor,
                        }}
                      >
                        <div className="px-6 py-3 text-center">
                          <p className="text-sm font-semibold">{overlay.content.title}</p>
                        </div>
                      </div>
                    );
                  }

                  if (overlay.type === 'logo' && overlay.content.imageUrl) {
                    return (
                      <div
                        key={overlay.id}
                        className={`absolute ${
                          overlay.position === 'top'
                            ? 'top-4 right-4'
                            : overlay.position === 'bottom'
                            ? 'bottom-4 right-4'
                            : 'top-4 left-4'
                        } animate-in fade-in duration-500`}
                      >
                        <img
                          src={overlay.content.imageUrl}
                          alt="Logo"
                          className="w-24 h-24 object-contain"
                        />
                      </div>
                    );
                  }

                  return null;
                })}
            </div>
          )}

          {/* Editor */}
          {editingOverlay && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nome do Overlay
                </label>
                <input
                  type="text"
                  value={editingOverlay.name}
                  onChange={(e) =>
                    setEditingOverlay({ ...editingOverlay, name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tipo</label>
                <select
                  value={editingOverlay.type}
                  onChange={(e) =>
                    setEditingOverlay({
                      ...editingOverlay,
                      type: e.target.value as Overlay['type'],
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-600"
                >
                  <option value="lower-third">Lower Third</option>
                  <option value="banner">Banner</option>
                  <option value="logo">Logo</option>
                  <option value="custom">Personalizado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Posição</label>
                <select
                  value={editingOverlay.position}
                  onChange={(e) =>
                    setEditingOverlay({
                      ...editingOverlay,
                      position: e.target.value as Overlay['position'],
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-600"
                >
                  <option value="top">Topo</option>
                  <option value="bottom">Inferior</option>
                  <option value="left">Esquerda</option>
                  <option value="right">Direita</option>
                  <option value="center">Centro</option>
                </select>
              </div>

              {(editingOverlay.type === 'lower-third' || editingOverlay.type === 'banner') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Título</label>
                    <input
                      type="text"
                      value={editingOverlay.content.title || ''}
                      onChange={(e) =>
                        setEditingOverlay({
                          ...editingOverlay,
                          content: { ...editingOverlay.content, title: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-600"
                    />
                  </div>

                  {editingOverlay.type === 'lower-third' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Subtítulo
                      </label>
                      <input
                        type="text"
                        value={editingOverlay.content.subtitle || ''}
                        onChange={(e) =>
                          setEditingOverlay({
                            ...editingOverlay,
                            content: { ...editingOverlay.content, subtitle: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-600"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Cor de Fundo
                      </label>
                      <input
                        type="color"
                        value={editingOverlay.content.backgroundColor || '#f97316'}
                        onChange={(e) =>
                          setEditingOverlay({
                            ...editingOverlay,
                            content: {
                              ...editingOverlay.content,
                              backgroundColor: e.target.value,
                            },
                          })
                        }
                        className="w-full h-10 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Cor do Texto
                      </label>
                      <input
                        type="color"
                        value={editingOverlay.content.textColor || '#ffffff'}
                        onChange={(e) =>
                          setEditingOverlay({
                            ...editingOverlay,
                            content: { ...editingOverlay.content, textColor: e.target.value },
                          })
                        }
                        className="w-full h-10 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                </>
              )}

              {editingOverlay.type === 'logo' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    URL da Imagem
                  </label>
                  <input
                    type="text"
                    value={editingOverlay.content.imageUrl || ''}
                    onChange={(e) =>
                      setEditingOverlay({
                        ...editingOverlay,
                        content: { ...editingOverlay.content, imageUrl: e.target.value },
                      })
                    }
                    placeholder="/logo-onnplay.png"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-600"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <button
                  onClick={saveOverlay}
                  className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  Salvar Overlay
                </button>
                <button
                  onClick={() => setEditingOverlay(null)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {!editingOverlay && (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Layers size={48} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Selecione um overlay para editar</p>
                <p className="text-xs mt-1">ou crie um novo overlay</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
