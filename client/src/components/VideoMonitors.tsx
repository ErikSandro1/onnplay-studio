import React from 'react';
import { Settings, Maximize2 } from 'lucide-react';

interface VideoMonitorsProps {
  editSource?: string;
  programSource?: string;
}

const VideoMonitors: React.FC<VideoMonitorsProps> = ({
  editSource = 'CAM 1',
  programSource = 'CAM 2',
}) => {
  return (
    <div className="grid grid-cols-2 gap-6 p-6">
      {/* EDIT Monitor */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3
            className="text-lg font-bold tracking-wide"
            style={{ color: '#00D9FF' }}
          >
            EDIT
          </h3>
          <div className="flex items-center gap-2">
            <button
              className="p-2 rounded-lg transition-all duration-200 hover:bg-[#1E2842]"
              style={{ color: '#7A8BA3' }}
            >
              <Settings size={18} />
            </button>
            <button
              className="p-2 rounded-lg transition-all duration-200 hover:bg-[#1E2842]"
              style={{ color: '#7A8BA3' }}
            >
              <Maximize2 size={18} />
            </button>
          </div>
        </div>
        
        <div
          className="relative aspect-video rounded-xl overflow-hidden"
          style={{
            background: '#141B2E',
            border: '3px solid #00D9FF',
            boxShadow: '0 0 20px rgba(0, 217, 255, 0.3)',
          }}
        >
          {/* Placeholder para vídeo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div
                className="text-6xl font-bold mb-2"
                style={{ color: '#00D9FF' }}
              >
                {editSource}
              </div>
              <div style={{ color: '#7A8BA3' }}>Preview</div>
            </div>
          </div>
          
          {/* Indicador de resolução */}
          <div
            className="absolute top-3 left-3 px-3 py-1 rounded-md text-xs font-semibold"
            style={{
              background: 'rgba(0, 217, 255, 0.2)',
              color: '#00D9FF',
              border: '1px solid #00D9FF',
            }}
          >
            1080p
          </div>
        </div>
        
        {/* Monitor Stand */}
        <div className="flex justify-center mt-2">
          <div
            className="w-32 h-2 rounded-t-lg"
            style={{ background: '#1E2842' }}
          />
        </div>
        <div className="flex justify-center">
          <div
            className="w-48 h-3 rounded-b-lg"
            style={{ background: '#1E2842' }}
          />
        </div>
      </div>

      {/* PROGRAM Monitor */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3
            className="text-lg font-bold tracking-wide"
            style={{ color: '#FF6B00' }}
          >
            PROGRAM
          </h3>
          <div className="flex items-center gap-2">
            <button
              className="p-2 rounded-lg transition-all duration-200 hover:bg-[#1E2842]"
              style={{ color: '#7A8BA3' }}
            >
              <Settings size={18} />
            </button>
            <button
              className="p-2 rounded-lg transition-all duration-200 hover:bg-[#1E2842]"
              style={{ color: '#7A8BA3' }}
            >
              <Maximize2 size={18} />
            </button>
          </div>
        </div>
        
        <div
          className="relative aspect-video rounded-xl overflow-hidden"
          style={{
            background: '#141B2E',
            border: '3px solid #FF6B00',
            boxShadow: '0 0 20px rgba(255, 107, 0, 0.3)',
          }}
        >
          {/* Placeholder para vídeo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div
                className="text-6xl font-bold mb-2"
                style={{ color: '#FF6B00' }}
              >
                {programSource}
              </div>
              <div style={{ color: '#7A8BA3' }}>Live Output</div>
            </div>
          </div>
          
          {/* Indicador LIVE */}
          <div
            className="absolute top-3 left-3 px-3 py-1 rounded-md text-xs font-bold flex items-center gap-2"
            style={{
              background: 'rgba(255, 107, 0, 0.2)',
              color: '#FF6B00',
              border: '1px solid #FF6B00',
            }}
          >
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: '#FF6B00' }}
            />
            LIVE
          </div>
          
          {/* Indicador de resolução */}
          <div
            className="absolute top-3 right-3 px-3 py-1 rounded-md text-xs font-semibold"
            style={{
              background: 'rgba(255, 107, 0, 0.2)',
              color: '#FF6B00',
              border: '1px solid #FF6B00',
            }}
          >
            1080p
          </div>
        </div>
        
        {/* Monitor Stand */}
        <div className="flex justify-center mt-2">
          <div
            className="w-32 h-2 rounded-t-lg"
            style={{ background: '#1E2842' }}
          />
        </div>
        <div className="flex justify-center">
          <div
            className="w-48 h-3 rounded-b-lg"
            style={{ background: '#1E2842' }}
          />
        </div>
      </div>
    </div>
  );
};

export default VideoMonitors;
