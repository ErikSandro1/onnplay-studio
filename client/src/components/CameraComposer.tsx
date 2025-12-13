import { useState } from 'react';
import { LayoutTemplate, Maximize, Grid, Columns, PictureInPicture } from 'lucide-react';
import { toast } from 'sonner';

interface Layout {
  id: string;
  name: string;
  icon: any;
  type: 'single' | 'pip' | 'split' | 'grid';
}

const LAYOUTS: Layout[] = [
  { id: 'single', name: 'Single', icon: Maximize, type: 'single' },
  { id: 'pip-br', name: 'PiP (Bottom-Right)', icon: PictureInPicture, type: 'pip' },
  { id: 'split-v', name: 'Split Vertical', icon: Columns, type: 'split' },
  { id: 'grid-4', name: 'Grid 2x2', icon: Grid, type: 'grid' },
];

export default function CameraComposer() {
  const [activeLayout, setActiveLayout] = useState<string>('single');
  const [slots, setSlots] = useState<Record<string, number>>({
    main: 1,
    pip: 2,
    split1: 1,
    split2: 2,
    grid1: 1,
    grid2: 2,
    grid3: 3,
    grid4: 4,
  });

  const handleLayoutChange = (layoutId: string) => {
    setActiveLayout(layoutId);
    toast.success(`Layout alterado para: ${LAYOUTS.find(l => l.id === layoutId)?.name}`);
  };

  const handleDrop = (e: React.DragEvent, slotId: string) => {
    e.preventDefault();
    const cameraId = e.dataTransfer.getData('cameraId');
    if (cameraId) {
      setSlots(prev => ({ ...prev, [slotId]: parseInt(cameraId) }));
      toast.success(`Câmera ${cameraId} atribuída ao slot`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <LayoutTemplate size={16} className="text-orange-500" />
          Composição de Câmeras
        </h3>
      </div>

      {/* Layout Selector */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {LAYOUTS.map(layout => {
          const Icon = layout.icon;
          return (
            <button
              key={layout.id}
              onClick={() => handleLayoutChange(layout.id)}
              className={`flex flex-col items-center justify-center p-2 rounded border transition-colors ${
                activeLayout === layout.id
                  ? 'bg-orange-600 border-orange-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
              }`}
              title={layout.name}
            >
              <Icon size={20} className="mb-1" />
              <span className="text-[10px]">{layout.name}</span>
            </button>
          );
        })}
      </div>

      {/* Composition Preview Area */}
      <div className="flex-1 bg-black rounded border border-gray-800 relative overflow-hidden">
        {activeLayout === 'single' && (
          <div
            className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-500 border-2 border-dashed border-gray-700 hover:border-orange-500 transition-colors"
            onDrop={(e) => handleDrop(e, 'main')}
            onDragOver={handleDragOver}
          >
            <div className="text-center">
              <p className="text-2xl font-bold text-white mb-1">CAM {slots.main}</p>
              <p className="text-xs">Arraste uma câmera aqui</p>
            </div>
          </div>
        )}

        {activeLayout === 'pip-br' && (
          <div className="relative w-full h-full">
            {/* Main Layer */}
            <div
              className="absolute inset-0 bg-gray-900 flex items-center justify-center border-2 border-dashed border-gray-700 hover:border-orange-500 transition-colors"
              onDrop={(e) => handleDrop(e, 'main')}
              onDragOver={handleDragOver}
            >
              <div className="text-center">
                <p className="text-2xl font-bold text-white mb-1">CAM {slots.main}</p>
                <p className="text-xs">Main</p>
              </div>
            </div>
            {/* PiP Layer */}
            <div
              className="absolute bottom-4 right-4 w-1/3 h-1/3 bg-gray-800 border-2 border-orange-500 shadow-lg flex items-center justify-center z-10"
              onDrop={(e) => handleDrop(e, 'pip')}
              onDragOver={handleDragOver}
            >
              <div className="text-center">
                <p className="text-lg font-bold text-white">CAM {slots.pip}</p>
                <p className="text-[10px] text-gray-400">PiP</p>
              </div>
            </div>
          </div>
        )}

        {activeLayout === 'split-v' && (
          <div className="flex w-full h-full">
            <div
              className="w-1/2 h-full bg-gray-900 border-r border-gray-700 flex items-center justify-center border-2 border-dashed border-transparent hover:border-orange-500 transition-colors"
              onDrop={(e) => handleDrop(e, 'split1')}
              onDragOver={handleDragOver}
            >
              <div className="text-center">
                <p className="text-xl font-bold text-white">CAM {slots.split1}</p>
              </div>
            </div>
            <div
              className="w-1/2 h-full bg-gray-900 flex items-center justify-center border-2 border-dashed border-transparent hover:border-orange-500 transition-colors"
              onDrop={(e) => handleDrop(e, 'split2')}
              onDragOver={handleDragOver}
            >
              <div className="text-center">
                <p className="text-xl font-bold text-white">CAM {slots.split2}</p>
              </div>
            </div>
          </div>
        )}

        {activeLayout === 'grid-4' && (
          <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="bg-gray-900 border border-gray-800 flex items-center justify-center border-2 border-dashed border-transparent hover:border-orange-500 transition-colors"
                onDrop={(e) => handleDrop(e, `grid${i}`)}
                onDragOver={handleDragOver}
              >
                <div className="text-center">
                  <p className="text-lg font-bold text-white">CAM {slots[`grid${i}`]}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-2 text-[10px] text-gray-500 text-center">
        Arraste câmeras da galeria para os slots acima
      </div>
    </div>
  );
}
