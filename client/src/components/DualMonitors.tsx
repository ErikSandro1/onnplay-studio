import React from 'react';
import { Maximize2, Settings } from 'lucide-react';
import VideoPreview from './VideoPreview';
import { CameraId } from '../services/CameraControlService';
import { CommentOverlay } from './CommentOverlay';

interface DualMonitorsProps {
  isLive: boolean;
  viewers?: number;
  duration?: string;
  previewCamera?: CameraId;
  programCamera?: CameraId;
  lastTransition?: string;
  transitionTimestamp?: string;
  isTransitioning?: boolean;
}

const DualMonitors: React.FC<DualMonitorsProps> = ({
  isLive = false,
  viewers = 0,
  duration = '00:00:00',
  previewCamera = 'cam1',
  programCamera = 'cam2',
  lastTransition = 'none',
  transitionTimestamp = '',
  isTransitioning = false,
}) => {
  const previewLabel = previewCamera.toUpperCase().replace('CAM', 'CAM ');
  const programLabel = programCamera.toUpperCase().replace('CAM', 'CAM ');
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
              {previewLabel}
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
          {/* Video Preview */}
          <VideoPreview cameraId={previewCamera} />
          
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
              {programLabel}
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
          data-monitor="program"
          className="flex-1 rounded-lg overflow-hidden relative"
          style={{
            background: '#141B2E',
            border: '2px solid #FF6B00',
            boxShadow: '0 0 20px rgba(255, 107, 0, 0.3)',
          }}
        >
          {/* Video Preview */}
          <VideoPreview cameraId={programCamera} />
          
          {/* LIVE indicator */}
          {isLive && (
            <div className="absolute top-4 left-4 bg-red-600 px-3 py-1 rounded-lg flex items-center gap-2 animate-pulse">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span className="text-white font-bold text-sm">LIVE</span>
            </div>
          )}
          
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
          
          {/* Comment Overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <CommentOverlay />
          </div>
          
          {/* Transition Indicator */}
          {lastTransition !== 'none' && (
            <div 
              className="absolute top-16 left-3 px-3 py-2 rounded-lg backdrop-blur-sm"
              style={{
                background: 'rgba(10, 14, 26, 0.9)',
                border: isTransitioning ? '2px solid #00D9FF' : '1px solid #FF6B00',
                boxShadow: isTransitioning ? '0 0 20px rgba(0, 217, 255, 0.5)' : 'none',
              }}
            >
              <div 
                className="text-xs font-semibold mb-1"
                style={{ color: '#7A8BA3' }}
              >
                {isTransitioning ? 'TRANSITIONING...' : 'LAST TRANSITION'}
              </div>
              <div 
                className={`text-lg font-bold ${isTransitioning ? 'animate-pulse' : ''}`}
                style={{ color: isTransitioning ? '#00D9FF' : '#FF6B00' }}
              >
                {lastTransition}
              </div>
              {transitionTimestamp && (
                <div 
                  className="text-xs font-mono mt-1"
                  style={{ color: '#7A8BA3' }}
                >
                  {transitionTimestamp}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DualMonitors;
