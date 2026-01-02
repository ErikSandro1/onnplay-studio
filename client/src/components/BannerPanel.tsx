import { useState, useEffect } from 'react';
import { Plus, Eye, EyeOff, Send, X, Edit2, Trash2, Monitor, Tv } from 'lucide-react';
import { bannerOverlayService, Banner, BannerType, BannerTheme, BannerPosition } from '../services/BannerOverlayService';

interface BannerPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BannerPanel({ isOpen, onClose }: BannerPanelProps) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form state for creating/editing
  const [formData, setFormData] = useState({
    name: '',
    type: 'lower-third' as BannerType,
    theme: 'classic' as BannerTheme,
    position: 'bottom-left' as BannerPosition,
    title: '',
    subtitle: '',
    backgroundColor: '#f97316',
    textColor: '#ffffff',
    accentColor: '#ea580c',
  });

  useEffect(() => {
    // Carregar banners iniciais
    setBanners(bannerOverlayService.getAllBanners());

    // Escutar mudanças
    const unsubscribe = bannerOverlayService.subscribe(() => {
      setBanners(bannerOverlayService.getAllBanners());
    });

    return unsubscribe;
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'lower-third',
      theme: 'classic',
      position: 'bottom-left',
      title: '',
      subtitle: '',
      backgroundColor: '#f97316',
      textColor: '#ffffff',
      accentColor: '#ea580c',
    });
    setEditingBanner(null);
    setIsCreating(false);
  };

  const handleCreate = () => {
    if (!formData.name || !formData.title) return;

    bannerOverlayService.createBanner({
      name: formData.name,
      type: formData.type,
      theme: formData.theme,
      position: formData.position,
      content: {
        title: formData.title,
        subtitle: formData.subtitle || undefined,
        backgroundColor: formData.backgroundColor,
        textColor: formData.textColor,
        accentColor: formData.accentColor,
      },
    });

    resetForm();
  };

  const handleUpdate = () => {
    if (!editingBanner || !formData.name || !formData.title) return;

    bannerOverlayService.updateBanner(editingBanner.id, {
      name: formData.name,
      type: formData.type,
      theme: formData.theme,
      position: formData.position,
      content: {
        title: formData.title,
        subtitle: formData.subtitle || undefined,
        backgroundColor: formData.backgroundColor,
        textColor: formData.textColor,
        accentColor: formData.accentColor,
      },
    });

    resetForm();
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      name: banner.name,
      type: banner.type,
      theme: banner.theme,
      position: banner.position,
      title: banner.content.title || '',
      subtitle: banner.content.subtitle || '',
      backgroundColor: banner.content.backgroundColor || '#f97316',
      textColor: banner.content.textColor || '#ffffff',
      accentColor: banner.content.accentColor || '#ea580c',
    });
    setIsCreating(true);
  };

  const handleDelete = (id: string) => {
    bannerOverlayService.deleteBanner(id);
  };

  const handleSendToPreview = (id: string) => {
    bannerOverlayService.sendToPreview(id);
  };

  const handleSendToProgram = (id: string) => {
    bannerOverlayService.sendToProgram(id);
  };

  const handleTransitionToProgram = () => {
    bannerOverlayService.transitionToProgram();
  };

  const handleRemoveFromPreview = () => {
    bannerOverlayService.removeFromPreview();
  };

  const handleRemoveFromProgram = () => {
    bannerOverlayService.removeFromProgram();
  };

  if (!isOpen) return null;

  const previewBanner = bannerOverlayService.getPreviewBanner();
  const programBanner = bannerOverlayService.getProgramBanner();

  return (
    <div className="absolute right-0 top-0 h-full w-80 bg-gray-900 border-l border-gray-700 flex flex-col z-40">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Banners</h2>
        <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded">
          <X size={18} className="text-gray-400" />
        </button>
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-b border-gray-700 space-y-2">
        {/* Preview Status */}
        {previewBanner && (
          <div className="flex items-center justify-between p-2 bg-cyan-900/30 border border-cyan-600 rounded-lg">
            <div className="flex items-center gap-2">
              <Monitor size={14} className="text-cyan-400" />
              <span className="text-xs text-cyan-400">PREVIEW:</span>
              <span className="text-xs text-white truncate max-w-24">{previewBanner.name}</span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={handleTransitionToProgram}
                className="p-1 bg-orange-600 hover:bg-orange-700 rounded text-white"
                title="Enviar para PROGRAM"
              >
                <Send size={12} />
              </button>
              <button
                onClick={handleRemoveFromPreview}
                className="p-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
                title="Remover do PREVIEW"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Program Status */}
        {programBanner && (
          <div className="flex items-center justify-between p-2 bg-orange-900/30 border border-orange-600 rounded-lg">
            <div className="flex items-center gap-2">
              <Tv size={14} className="text-orange-400" />
              <span className="text-xs text-orange-400">LIVE:</span>
              <span className="text-xs text-white truncate max-w-24">{programBanner.name}</span>
            </div>
            <button
              onClick={handleRemoveFromProgram}
              className="p-1 bg-red-600 hover:bg-red-700 rounded text-white"
              title="Remover do PROGRAM"
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Create/Edit Form */}
      {isCreating ? (
        <div className="p-3 border-b border-gray-700 space-y-3 max-h-80 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              {editingBanner ? 'Editar Banner' : 'Novo Banner'}
            </h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <input
            type="text"
            placeholder="Nome do banner"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
          />

          <div className="grid grid-cols-2 gap-2">
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as BannerType })}
              className="px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-xs"
            >
              <option value="lower-third">Lower Third</option>
              <option value="banner">Banner</option>
              <option value="ticker">Ticker</option>
            </select>

            <select
              value={formData.theme}
              onChange={(e) => setFormData({ ...formData, theme: e.target.value as BannerTheme })}
              className="px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-xs"
            >
              <option value="classic">Classic</option>
              <option value="bubble">Bubble</option>
              <option value="minimal">Minimal</option>
              <option value="block">Block</option>
            </select>
          </div>

          <select
            value={formData.position}
            onChange={(e) => setFormData({ ...formData, position: e.target.value as BannerPosition })}
            className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-xs"
          >
            <option value="bottom-left">Inferior Esquerdo</option>
            <option value="bottom-right">Inferior Direito</option>
            <option value="bottom">Inferior Centro</option>
            <option value="top-left">Superior Esquerdo</option>
            <option value="top-right">Superior Direito</option>
            <option value="top">Superior Centro</option>
          </select>

          <input
            type="text"
            placeholder="Título"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
          />

          {formData.type === 'lower-third' && (
            <input
              type="text"
              placeholder="Subtítulo (opcional)"
              value={formData.subtitle}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
            />
          )}

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Fundo</label>
              <input
                type="color"
                value={formData.backgroundColor}
                onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                className="w-full h-8 rounded cursor-pointer"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Texto</label>
              <input
                type="color"
                value={formData.textColor}
                onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                className="w-full h-8 rounded cursor-pointer"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Destaque</label>
              <input
                type="color"
                value={formData.accentColor}
                onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                className="w-full h-8 rounded cursor-pointer"
              />
            </div>
          </div>

          <button
            onClick={editingBanner ? handleUpdate : handleCreate}
            disabled={!formData.name || !formData.title}
            className="w-full py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:text-gray-500 rounded text-white text-sm font-medium"
          >
            {editingBanner ? 'Salvar Alterações' : 'Criar Banner'}
          </button>
        </div>
      ) : (
        <div className="p-3 border-b border-gray-700">
          <button
            onClick={() => setIsCreating(true)}
            className="w-full py-2 bg-orange-600 hover:bg-orange-700 rounded text-white text-sm font-medium flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Novo Banner
          </button>
        </div>
      )}

      {/* Banner List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <p className="text-xs text-gray-500 mb-2">
          Clique uma vez para PREVIEW, duplo clique para PROGRAM
        </p>
        
        {banners.map((banner) => (
          <div
            key={banner.id}
            onClick={() => handleSendToPreview(banner.id)}
            onDoubleClick={() => handleSendToProgram(banner.id)}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              banner.isInProgram
                ? 'border-orange-500 bg-orange-900/20'
                : banner.isInPreview
                ? 'border-cyan-500 bg-cyan-900/20'
                : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    banner.type === 'lower-third' ? 'bg-blue-600' :
                    banner.type === 'banner' ? 'bg-green-600' :
                    banner.type === 'ticker' ? 'bg-purple-600' : 'bg-gray-600'
                  }`}>
                    {banner.type === 'lower-third' ? 'LT' : 
                     banner.type === 'banner' ? 'BN' : 
                     banner.type === 'ticker' ? 'TK' : 'LG'}
                  </span>
                  <h4 className="text-sm font-medium text-white truncate">{banner.name}</h4>
                </div>
                <p className="text-xs text-gray-400 truncate mt-1">{banner.content.title}</p>
              </div>

              <div className="flex items-center gap-1">
                {banner.isInProgram && (
                  <span className="text-xs bg-orange-600 text-white px-1.5 py-0.5 rounded animate-pulse">
                    LIVE
                  </span>
                )}
                {banner.isInPreview && !banner.isInProgram && (
                  <span className="text-xs bg-cyan-600 text-white px-1.5 py-0.5 rounded">
                    PRV
                  </span>
                )}
              </div>
            </div>

            {/* Preview do banner */}
            <div 
              className="mt-2 p-2 rounded text-xs"
              style={{
                backgroundColor: banner.content.backgroundColor,
                color: banner.content.textColor,
              }}
            >
              <div className="font-semibold truncate">{banner.content.title}</div>
              {banner.content.subtitle && (
                <div className="opacity-80 truncate">{banner.content.subtitle}</div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 mt-2">
              <button
                onClick={(e) => { e.stopPropagation(); handleEdit(banner); }}
                className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white flex items-center justify-center gap-1"
              >
                <Edit2 size={10} />
                Editar
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(banner.id); }}
                className="px-2 py-1 bg-red-900/50 hover:bg-red-900 rounded text-xs text-red-400 hover:text-white"
              >
                <Trash2 size={10} />
              </button>
            </div>
          </div>
        ))}

        {banners.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">Nenhum banner criado</p>
            <p className="text-xs mt-1">Clique em "Novo Banner" para começar</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default BannerPanel;
