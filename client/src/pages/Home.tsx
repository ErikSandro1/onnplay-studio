import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import MainHeader from '../components/MainHeader';
import BroadcastPanel from '../components/BroadcastPanel';
import ToolsMenu, { ToolId } from '../components/ToolsMenu';
import ParticipantsStrip from '../components/ParticipantsStrip';
import ControlBar from '../components/ControlBar';
import DualMonitors from '../components/DualMonitors';

// Tool Components (opened as modals)
import TransitionSystem from '../components/TransitionSystem';
import ParticipantManager from '../components/ParticipantManager';
import AdvancedAudioMixer from '../components/AdvancedAudioMixer';
import CameraControl from '../components/CameraControl';
import OverlayManager from '../components/OverlayManager';
import StreamingConfig from '../components/StreamingConfig';
import RecordingSettings from '../components/RecordingSettings';
import UnifiedChat from '../components/UnifiedChat';
import AdvancedSettings from '../components/AdvancedSettings';

// Services
import { videoSourceManager } from '../services/VideoSourceManager';
import { transitionEngine } from '../services/TransitionEngine';
import { programSwitcher } from '../services/ProgramSwitcher';
import { layoutManager } from '../services/LayoutManager';
import { streamingService } from '../services/StreamingService';
import { recordingService } from '../services/RecordingService';

// Context
import { DailyProvider, useDailyContext } from '../contexts/DailyContext';

const HomeContent: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  
  // Daily.co context
  const dailyContext = useDailyContext();
  
  // Control states
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  // Broadcast stats
  const [viewers, setViewers] = useState(0);
  const [duration, setDuration] = useState('00:00:00');
  const [bitrate, setBitrate] = useState('0 Kbps');

  // Initialize services
  useEffect(() => {
    console.log('🚀 OnnPlay Studio - Services initialized');
    console.log('📹 VideoSourceManager:', videoSourceManager);
    console.log('🎬 TransitionEngine:', transitionEngine);
    console.log('🎯 ProgramSwitcher:', programSwitcher);
    console.log('📐 LayoutManager:', layoutManager);
    console.log('📡 StreamingService:', streamingService);
    console.log('⏺️ RecordingService:', recordingService);

    // Cleanup on unmount
    return () => {
      streamingService.destroy();
      recordingService.destroy();
    };
  }, []);

  // Subscribe to recording state
  useEffect(() => {
    const unsubscribe = recordingService.subscribe((state) => {
      setIsRecording(state.isRecording);
    });

    return unsubscribe;
  }, []);

  // Subscribe to streaming state
  useEffect(() => {
    const unsubscribe = streamingService.subscribe((destinations) => {
      const hasActive = destinations.some(d => d.isActive);
      setIsLive(hasActive);
    });

    return unsubscribe;
  }, []);

  // Update duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isLive || isRecording) {
      let seconds = 0;
      interval = setInterval(() => {
        seconds++;
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        setDuration(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        );
      }, 1000);
    } else {
      setDuration('00:00:00');
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLive, isRecording]);

  // Update viewers (mock)
  useEffect(() => {
    if (isLive) {
      setViewers(Math.floor(Math.random() * 200) + 50);
      setBitrate('6000 Kbps');
    } else {
      setViewers(0);
      setBitrate('0 Kbps');
    }
  }, [isLive]);

  const handleGoLive = async () => {
    try {
      if (isLive) {
        await streamingService.stopAllStreams();
      } else {
        // Check if destinations are configured
        const destinations = streamingService.getAllDestinations();
        if (destinations.length === 0) {
          alert('Please configure streaming destinations first (Tools → Destinations)');
          setActiveTool('destinations');
          return;
        }
        await streamingService.startAllStreams();
      }
    } catch (err) {
      console.error('Failed to toggle streaming:', err);
      alert(`Failed to ${isLive ? 'stop' : 'start'} streaming: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleStartRecording = async () => {
    try {
      if (isRecording) {
        await recordingService.stopRecording();
      } else {
        await recordingService.startRecording({
          quality: 'high',
          format: 'mp4',
        });
      }
    } catch (err) {
      console.error('Failed to toggle recording:', err);
      alert(`Failed to ${isRecording ? 'stop' : 'start'} recording: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    if (dailyContext.isConnected) {
      dailyContext.toggleAudio();
    }
  };

  const handleToggleCamera = () => {
    setIsCameraOff(!isCameraOff);
    if (dailyContext.isConnected) {
      dailyContext.toggleVideo();
    }
  };

  const handleToggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
    if (dailyContext.isConnected) {
      dailyContext.toggleScreenShare();
    }
  };

  const handleSelectTool = (toolId: ToolId) => {
    setActiveTool(toolId);
  };

  const handleCloseTool = () => {
    setActiveTool(null);
  };

  const renderToolModal = () => {
    switch (activeTool) {
      case 'transitions':
        return <TransitionSystem isOpen={true} onClose={handleCloseTool} />;
      case 'brand':
        return <OverlayManager isOpen={true} onClose={handleCloseTool} />;
      case 'people':
        return <ParticipantManager isOpen={true} onClose={handleCloseTool} />;
      case 'audio':
        return <AdvancedAudioMixer isOpen={true} onClose={handleCloseTool} />;
      case 'camera':
        return <CameraControl isOpen={true} onClose={handleCloseTool} />;
      case 'destinations':
        return <StreamingConfig isOpen={true} onClose={handleCloseTool} />;
      case 'recording':
        return <RecordingSettings isOpen={true} onClose={handleCloseTool} />;
      case 'chat':
        return <UnifiedChat isOpen={true} onClose={handleCloseTool} />;
      case 'settings':
        return <AdvancedSettings isOpen={true} onClose={handleCloseTool} />;
      default:
        return null;
    }
  };

  return (
    <div 
      className="flex h-screen overflow-hidden"
      style={{ background: '#0A0E1A' }}
    >
      {/* Left Sidebar */}
      {sidebarOpen && <Sidebar />}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <MainHeader 
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Main Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Center: Monitors + Participants + Controls */}
          <div className="flex-1 flex flex-col p-4 gap-4">
            {/* Monitors */}
            <div className="flex-1 min-h-0">
              <DualMonitors />
            </div>

            {/* Participants Strip */}
            <div style={{ height: '140px' }}>
              <ParticipantsStrip participants={dailyContext.participants} />
            </div>

            {/* Control Bar */}
            <div>
              <ControlBar
                isMuted={isMuted}
                isCameraOff={isCameraOff}
                isScreenSharing={isScreenSharing}
                onToggleMute={handleToggleMute}
                onToggleCamera={handleToggleCamera}
                onToggleScreenShare={handleToggleScreenShare}
                onInvite={() => alert('Invite feature coming soon!')}
                onLeave={() => {
                  if (confirm('Are you sure you want to leave the studio?')) {
                    dailyContext.leaveRoom();
                    window.location.href = '/';
                  }
                }}
              />
            </div>
          </div>

          {/* Right Panel: Broadcast Stats + Tools Menu */}
          <div 
            className="flex flex-col"
            style={{ 
              width: '400px',
              background: '#0F1419',
              borderLeft: '1px solid #1E2842'
            }}
          >
            {/* Header with Tools Menu */}
            <div 
              className="flex items-center justify-between px-4 py-3"
              style={{ 
                borderBottom: '1px solid #1E2842',
                background: '#0A0E1A'
              }}
            >
              <h3 
                className="text-lg font-bold"
                style={{ color: '#FFFFFF' }}
              >
                Broadcast
              </h3>
              <ToolsMenu onSelectTool={handleSelectTool} />
            </div>

            {/* Broadcast Panel */}
            <div className="flex-1 overflow-y-auto">
              <BroadcastPanel
                isLive={isLive}
                isRecording={isRecording}
                viewers={viewers}
                duration={duration}
                bitrate={bitrate}
                onGoLive={handleGoLive}
                onStartRecording={handleStartRecording}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tool Modals */}
      {renderToolModal()}
    </div>
  );
};

const Home: React.FC = () => {
  return (
    <DailyProvider>
      <HomeContent />
    </DailyProvider>
  );
};

export default Home;
