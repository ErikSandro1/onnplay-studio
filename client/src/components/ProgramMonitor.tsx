import React from 'react';
import { Maximize2, Settings } from 'lucide-react';

interface ProgramMonitorProps {
  isLive: boolean;
  viewers?: number;
  duration?: string;
}

const ProgramMonitor: React.FC<ProgramMonitorProps> = ({
  isLive = false,
  viewers = 0,
  duration = '00:00:00',
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="flex items-center gap-4">
          <h2 
            className="text-2xl font-bold tracking-wide"
            style={{ color: '#FF6B00' }}
          >
            PROGRAM
          </h2>
          
          {isLive && (
            <div 
              className="flex items-center gap-2 px-4 py-2 rounded-lg animate-pulse"
              style={{
                background: 'rgba(255, 107, 0, 0.2)',
                border: '1px solid #FF6B00'
              }}
            >
              <div 
                className="w-3 h-3 rounded-full"
                style={{ background: '#FF6B00' }}
              />
              <span 
                className="text-sm font-bold"
                style={{ color: '#FF6B00' }}
              >
                LIVE
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            className="p-2 rounded-lg transition-all duration-200 hover:bg-[#1E2842]"
            style={{ color: '#7A8BA3' }}
          >
            <Settings size={20} />
          </button>
          <button
            className="p-2 rounded-lg transition-all duration-200 hover:bg-[#1E2842]"
            style={{ color: '#7A8BA3' }}
          >
            <Maximize2 size={20} />
          </button>
        </div>
      </div>
      
      {/* Monitor */}
      <div 
        className="flex-1 rounded-xl overflow-hidden relative"
        style={{
          background: '#141B2E',
          border: '3px solid #FF6B00',
          boxShadow: '0 0 30px rgba(255, 107, 0, 0.3)',
        }}
      >
        {/* Placeholder Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div 
              className="text-9xl font-bold mb-4"
              style={{ color: '#FF6B00' }}
            >
              📺
            </div>
            <div 
              className="text-2xl font-semibold mb-2"
              style={{ color: '#FF6B00' }}
            >
              {isLive ? 'ON AIR' : 'OFF AIR'}
            </div>
            <div 
              className="text-lg"
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
              className="absolute top-4 left-4 px-4 py-2 rounded-lg backdrop-blur-sm"
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
                className="text-2xl font-bold"
                style={{ color: '#FF6B00' }}
              >
                {viewers}
              </div>
            </div>
            
            <div 
              className="absolute top-4 right-4 px-4 py-2 rounded-lg backdrop-blur-sm"
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
                className="text-xl font-mono font-bold"
                style={{ color: '#FF6B00' }}
              >
                {duration}
              </div>
            </div>
          </>
        )}
        
        {/* Resolution Indicator */}
        <div 
          className="absolute bottom-4 left-4 px-3 py-1 rounded-md text-sm font-semibold"
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
  );
};

export default ProgramMonitor;
