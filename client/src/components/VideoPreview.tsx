import { useEffect, useState } from 'react';
import { cameraControlService, CameraId } from '../services/CameraControlService';

interface VideoPreviewProps {
  cameraId: CameraId;
  className?: string;
}

/**
 * VideoPreview Component
 * 
 * Renders a video preview with zoom, pan and rotation applied
 * Uses mock colored background for now (will be replaced with real video later)
 */
export default function VideoPreview({ cameraId, className = '' }: VideoPreviewProps) {
  const [transformStyle, setTransformStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    const unsubscribe = cameraControlService.subscribe(() => {
      const style = cameraControlService.getTransformStyle(cameraId);
      setTransformStyle(style);
    });

    // Initial style
    const style = cameraControlService.getTransformStyle(cameraId);
    setTransformStyle(style);

    return unsubscribe;
  }, [cameraId]);

  // Mock camera colors for visual feedback
  const cameraColors: Record<CameraId, string> = {
    cam1: 'from-blue-600 to-blue-800',
    cam2: 'from-green-600 to-green-800',
    cam3: 'from-purple-600 to-purple-800',
    screen: 'from-gray-600 to-gray-800',
    media: 'from-orange-600 to-orange-800',
  };

  const cameraLabels: Record<CameraId, string> = {
    cam1: 'CAM 1',
    cam2: 'CAM 2',
    cam3: 'CAM 3',
    screen: 'SCREEN',
    media: 'MEDIA',
  };

  return (
    <div className={`relative w-full h-full overflow-hidden bg-gray-900 ${className}`}>
      {/* Video Container with Transform */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${cameraColors[cameraId]} flex items-center justify-center`}
        style={transformStyle}
      >
        {/* Mock Camera Label */}
        <div className="text-white text-6xl font-bold opacity-30">
          {cameraLabels[cameraId]}
        </div>

        {/* Grid overlay for visual reference */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Vertical lines */}
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white opacity-10"></div>
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white opacity-10"></div>
          
          {/* Horizontal lines */}
          <div className="absolute top-1/3 left-0 right-0 h-px bg-white opacity-10"></div>
          <div className="absolute top-2/3 left-0 right-0 h-px bg-white opacity-10"></div>

          {/* Center crosshair */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-8 h-px bg-white opacity-30"></div>
            <div className="w-px h-8 bg-white opacity-30 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"></div>
          </div>
        </div>
      </div>

      {/* Zoom indicator */}
      <div className="absolute top-2 right-2 bg-black bg-opacity-50 px-2 py-1 rounded text-xs text-white font-mono">
        {cameraControlService.getCameraSettings(cameraId).zoom.toFixed(1)}x
      </div>
    </div>
  );
}
