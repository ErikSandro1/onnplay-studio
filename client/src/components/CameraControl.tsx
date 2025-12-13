import { useState } from 'react';
import { Video, Monitor, Grid3x3, Maximize2, Settings } from 'lucide-react';
import { toast } from 'sonner';

type CameraSource = 'cam1' | 'cam2' | 'cam3' | 'media' | 'screen';
type LayoutType = 'single' | 'pip' | 'split' | 'grid';

interface Camera {
  id: CameraSource;
  label: string;
  isActive: boolean;
  isLive: boolean;
  resolution: string;
  fps: number;
}

interface CameraControlProps {
  onCameraChange: (camera: CameraSource, target: 'program' | 'preview') => void;
  onLayoutChange: (layout: LayoutType) => void;
}

export default function CameraControl({ onCameraChange, onLayoutChange }: CameraControlProps) {
  const [cameras, setCameras] = useState<Camera[]>([
    { id: 'cam1', label: 'CAM 1', isActive: true, isLive: false, resolution: '1080p', fps: 60 },
    { id: 'cam2', label: 'CAM 2', isActive: true, isLive: false, resolution: '1080p', fps: 60 },
    { id: 'cam3', label: 'CAM 3', isActive: false, isLive: false, resolution: '720p', fps: 30 },
    { id: 'media', label: 'MEDIA', isActive: true, isLive: false, resolution: '1080p', fps: 60 },
    { id: 'screen', label: 'SCREEN', isActive: false, isLive: false, resolution: '1080p', fps: 30 },
  ]);

  const [programCamera, setProgramCamera] = useState<CameraSource>('cam1');
  const [previewCamera, setPreviewCamera] = useState<CameraSource>('cam2');
  const [currentLayout, setCurrentLayout] = useState<LayoutType>('single');

  const layouts = [
    {
      id: 'single' as LayoutType,
      label: 'Single',
      icon: Maximize2,
      description: 'Uma câmera em tela cheia',
    },
    {
      id: 'pip' as LayoutType,
      label: 'PiP',
      icon: Monitor,
      description: 'Picture in Picture',
    },
    {
      id: 'split' as LayoutType,
      label: 'Split',
      icon: Grid3x3,
      description: 'Tela dividida',
    },
    {
      id: 'grid' as LayoutType,
      label: 'Grid 2x2',
      icon: Grid3x3,
      description: 'Grade 2x2',
    },
  ];

  const handleCameraSelect = (cameraId: CameraSource, target: 'program' | 'preview') => {
    const camera = cameras.find((c) => c.id === cameraId);
    if (!camera) return;

    if (!camera.isActive) {
      toast.error('Câmera não disponível', {
        description: `${camera.label} está offline ou desconectada`,
      });
      return;
    }

    if (target === 'program') {
      setProgramCamera(cameraId);
      toast.success(`${camera.label} → PROGRAM`, {
        description: 'Câmera enviada para saída ao vivo',
      });
    } else {
      setPreviewCamera(cameraId);
      toast.info(`${camera.label} → PREVIEW`, {
        description: 'Câmera carregada no preview',
      });
    }

    onCameraChange(cameraId, target);
  };

  const handleLayoutChange = (layout: LayoutType) => {
    setCurrentLayout(layout);
    onLayoutChange(layout);

    const layoutNames = {
      single: 'Tela Cheia',
      pip: 'Picture in Picture',
      split: 'Tela Dividida',
      grid: 'Grade 2x2',
    };

    toast.success(`Layout alterado: ${layoutNames[layout]}`);
  };

  const toggleCameraStatus = (cameraId: CameraSource) => {
    setCameras((prev) =>
      prev.map((cam) =>
        cam.id === cameraId ? { ...cam, isActive: !cam.isActive } : cam
      )
    );

    const camera = cameras.find((c) => c.id === cameraId);
    toast.info(`${camera?.label} ${camera?.isActive ? 'desativada' : 'ativada'}`);
  };

  return (
    <div className="space-y-4">
      {/* Program (PGM) Row */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-12 h-6 bg-red-600 rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">PGM</span>
          </div>
          <span className="text-xs text-gray-400">PROGRAM (Saída Ao Vivo)</span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {cameras.map((camera) => (
            <button
              key={`pgm-${camera.id}`}
              onClick={() => handleCameraSelect(camera.id, 'program')}
              disabled={!camera.isActive}
              className={`${
                programCamera === camera.id
                  ? 'bg-red-600 ring-2 ring-red-400'
                  : camera.isActive
                  ? 'bg-gray-700 hover:bg-gray-600'
                  : 'bg-gray-800 opacity-50'
              } text-white font-semibold py-2 px-3 rounded transition-all disabled:cursor-not-allowed text-sm relative`}
            >
              {camera.label}
              {!camera.isActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded">
                  <span className="text-xs">OFF</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Preview (PVW) Row */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-12 h-6 bg-green-600 rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">PVW</span>
          </div>
          <span className="text-xs text-gray-400">PREVIEW (Pré-visualização)</span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {cameras.map((camera) => (
            <button
              key={`pvw-${camera.id}`}
              onClick={() => handleCameraSelect(camera.id, 'preview')}
              disabled={!camera.isActive}
              className={`${
                previewCamera === camera.id
                  ? 'bg-green-600 ring-2 ring-green-400'
                  : camera.isActive
                  ? 'bg-gray-700 hover:bg-gray-600'
                  : 'bg-gray-800 opacity-50'
              } text-white font-semibold py-2 px-3 rounded transition-all disabled:cursor-not-allowed text-sm relative`}
            >
              {camera.label}
              {!camera.isActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded">
                  <span className="text-xs">OFF</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Layouts */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">LAYOUTS</span>
          <button className="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-1">
            <Settings size={12} />
            Personalizar
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {layouts.map((layout) => {
            const Icon = layout.icon;
            return (
              <button
                key={layout.id}
                onClick={() => handleLayoutChange(layout.id)}
                className={`${
                  currentLayout === layout.id
                    ? 'bg-orange-600 ring-2 ring-orange-400'
                    : 'bg-gray-700 hover:bg-gray-600'
                } text-white font-semibold py-3 px-2 rounded transition-all flex flex-col items-center gap-1`}
                title={layout.description}
              >
                <Icon size={18} />
                <span className="text-xs">{layout.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Camera Status */}
      <div className="bg-gray-800 rounded-lg p-3">
        <div className="text-xs text-gray-400 mb-2">STATUS DAS CÂMERAS</div>
        <div className="grid grid-cols-5 gap-2 text-xs">
          {cameras.map((camera) => (
            <div
              key={`status-${camera.id}`}
              className="flex flex-col items-center gap-1"
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  camera.isActive ? 'bg-green-500' : 'bg-red-500'
                }`}
              ></div>
              <span className="text-gray-400">{camera.label}</span>
              <span className="text-gray-500">{camera.resolution}</span>
              <button
                onClick={() => toggleCameraStatus(camera.id)}
                className="text-orange-500 hover:text-orange-400 text-xs"
              >
                {camera.isActive ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
