import React from 'react';
import { Maximize2, Settings } from 'lucide-react';

interface DualMonitorsProps {
  isLive: boolean;
  viewers?: number;
  duration?: string;
  previewSource?: string;
  programSource?: string;
}

const DualMonitors: React.FC<DualMonitorsProps> = ({
  isLive = false,
  viewers = 0,
  duration = '00:00:00',
  previewSource = 'CAM 1',
  programSource = 'CAM 2',
}) => {
  return (
    <div className="flex gap-4 h-full">
      {/* PREVIEW Monitor */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 px-2">
          <div className="flex items-center gap-3">
            <h2 
              className="text-xl font-bold tracking-wide"
              style={{ color: '#00D9FF' }}
            >
              PREVIEW
            </h2>
            <span 
              className="text-sm font-medium px-3 py-1 rounded"
              style={{ 
                background: 'rgba(0, 217, 255, 0.2)',
                color: '#00D9FF',
                border: '1px solid #00D9FF'
              }}
            >
              {previewSource}
            </span>
          </div>
          
          <button
            className="p-2 rounded-lg transition-all duration-200 hover:bg-[#1E2842]"
            style={{ color: '#7A8BA3' }}
          >
            <Settings size={18} />
          </button>
        </div>
        
        {/* Monitor */}
        <div 
          className="flex-1 rounded-lg overflow-hidden relative"
          style={{
            background: '#141B2E',
            border: '2px solid #00D9FF',
            boxShadow: '0 0 20px rgba(0, 217, 255, 0.2)',
          }}
        >
          {/* Placeholder Content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div 
                className="text-6xl font-bold mb-2"
                style={{ color: '#00D9FF' }}
              >
                🎬
              </div>
              <div 
                className="text-lg font-semibold"
                style={{ color: '#00D9FF' }}
              >
                NEXT UP
              </div>
              <div 
                className="text-sm mt-1"
                style={{ color: '#7A8BA3' }}
              >
                Select source and transition
              </div>
            </div>
          </div>
          
          {/* Label */}
          <div 
            className="absolute top-3 left-3 px-3 py-1 rounded-md text-xs font-bold"
            style={{
              background: 'rgba(0, 217, 255, 0.9)',
              color: '#0A0E1A',
            }}
          >
            PREVIEW
          </div>
        </div>
      </div>

      {/* PROGRAM Monitor */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 px-2">
          <div className="flex items-center gap-3">
            <h2 
              className="text-xl font-bold tracking-wide"
              style={{ color: '#FF6B00' }}
            >
              PROGRAM
            </h2>
            
            {isLive && (
              <div 
                className="flex items-center gap-2 px-3 py-1 rounded-lg animate-pulse"
                style={{
                  background: 'rgba(255, 107, 0, 0.2)',
                  border: '1px solid #FF6B00'
                }}
              >
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ background: '#FF6B00' }}
                />
                <span 
                  className="text-xs font-bold"
                  style={{ color: '#FF6B00' }}
                >
                  LIVE
                </span>
              </div>
            )}
            
            <span 
              className="text-sm font-medium px-3 py-1 rounded"
              style={{ 
                background: 'rgba(255, 107, 0, 0.2)',
                color: '#FF6B00',
                border: '1px solid #FF6B00'
              }}
            >
              {programSource}
            </span>
          </div>
          
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
        
        {/* Monitor */}
        <div 
          className="flex-1 rounded-lg overflow-hidden relative"
          style={{
            background: '#141B2E',
            border: '2px solid #FF6B00',
            boxShadow: '0 0 20px rgba(255, 107, 0, 0.3)',
          }}
        >
          {/* Placeholder Content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div 
                className="text-6xl font-bold mb-2"
                style={{ color: '#FF6B00' }}
              >
                📺
              </div>
              <div 
                className="text-lg font-semibold"
                style={{ color: '#FF6B00' }}
              >
                {isLive ? 'ON AIR' : 'OFF AIR'}
              </div>
              <div 
                className="text-sm mt-1"
                style={{ color: '#7A8BA3' }}
              >
                {isLive ? 'Broadcasting to your audience' : 'Ready to go live'}
              </div>
            </div>
          </div>
          
          {/* Live Stats Overlay */}
          {isLive && (
            <>
              <div 
                className="absolute top-3 left-3 px-3 py-2 rounded-lg backdrop-blur-sm"
                style={{
                  background: 'rgba(10, 14, 26, 0.8)',
                  border: '1px solid #FF6B00'
                }}
              >
                <div 
                  className="text-xs font-semibold mb-1"
                  style={{ color: '#7A8BA3' }}
                >
                  VIEWERS
                </div>
                <div 
                  className="text-xl font-bold"
                  style={{ color: '#FF6B00' }}
                >
                  {viewers}
                </div>
              </div>
              
              <div 
                className="absolute top-3 right-3 px-3 py-2 rounded-lg backdrop-blur-sm"
                style={{
                  background: 'rgba(10, 14, 26, 0.8)',
                  border: '1px solid #FF6B00'
                }}
              >
                <div 
                  className="text-xs font-semibold mb-1"
                  style={{ color: '#7A8BA3' }}
                >
                  DURATION
                </div>
                <div 
                  className="text-lg font-mono font-bold"
                  style={{ color: '#FF6B00' }}
                >
                  {duration}
                </div>
              </div>
            </>
          )}
          
          {/* Label */}
          <div 
            className="absolute bottom-3 left-3 px-3 py-1 rounded-md text-xs font-bold"
            style={{
              background: 'rgba(255, 107, 0, 0.9)',
              color: '#FFFFFF',
            }}
          >
            {isLive ? 'LIVE' : 'PROGRAM'}
          </div>
          
          {/* Resolution Indicator */}
          <div 
            className="absolute bottom-3 right-3 px-2 py-1 rounded-md text-xs font-semibold"
            style={{
              background: 'rgba(255, 107, 0, 0.2)',
              color: '#FF6B00',
              border: '1px solid #FF6B00',
            }}
          >
            1080p
          </div>
        </div>
      </div>
    </div>
  );
};

export default DualMonitors;
