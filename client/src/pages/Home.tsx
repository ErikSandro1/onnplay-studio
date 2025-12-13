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

const Home: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  
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
  
  // Mock participants data
  const [participants] = useState([
    { id: '1', name: 'You', isMuted: false, isCameraOff: false, isSpeaking: false },
    { id: '2', name: 'Guest 1', isMuted: false, isCameraOff: false, isSpeaking: false },
    { id: '3', name: 'Guest 2', isMuted: true, isCameraOff: false, isSpeaking: false },
  ]);

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

  const handleGoLive = () => {
    setIsLive(!isLive);
  };

  const handleStartRecording = () => {
    setIsRecording(!isRecording);
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
              <ParticipantsStrip participants={participants} />
            </div>

            {/* Control Bar */}
            <div>
              <ControlBar
                isMuted={isMuted}
                isCameraOff={isCameraOff}
                isScreenSharing={isScreenSharing}
                onToggleMute={() => setIsMuted(!isMuted)}
                onToggleCamera={() => setIsCameraOff(!isCameraOff)}
                onToggleScreenShare={() => setIsScreenSharing(!isScreenSharing)}
                onInvite={() => alert('Invite feature coming soon!')}
                onLeave={() => {
                  if (confirm('Are you sure you want to leave the studio?')) {
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

export default Home;
