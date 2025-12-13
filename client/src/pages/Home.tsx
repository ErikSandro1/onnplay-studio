import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import MainHeader from '../components/MainHeader';
import RightSidebar, { TabId } from '../components/RightSidebar';
import ParticipantsStrip from '../components/ParticipantsStrip';
import ControlBar from '../components/ControlBar';
import DualMonitors from '../components/DualMonitors';

// Tab Components
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
  const [activeTab, setActiveTab] = useState<TabId>('broadcast');
  
  // Control states
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  // Mock participants data
  const [participants] = useState([
    { id: '1', name: 'You', isMuted: false, isCameraOff: false, isSpeaking: false },
    { id: '2', name: 'Guest 1', isMuted: false, isCameraOff: false, isSpeaking: false },
    { id: '3', name: 'Guest 2', isMuted: true, isCameraOff: false, isSpeaking: false },
  ]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'broadcast':
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold mb-4" style={{ color: '#FFFFFF' }}>
              Broadcast Controls
            </h3>
            
            <button
              onClick={() => setIsLive(!isLive)}
              className="w-full py-6 rounded-xl text-xl font-bold transition-all duration-200 hover:scale-105"
              style={{
                background: isLive ? '#DC2626' : '#FF6B00',
                color: '#FFFFFF',
                border: isLive ? '2px solid #DC2626' : '2px solid #FF6B00',
                boxShadow: isLive ? '0 0 30px rgba(220, 38, 38, 0.5)' : '0 0 30px rgba(255, 107, 0, 0.5)'
              }}
            >
              {isLive ? '🔴 END BROADCAST' : '▶️ GO LIVE'}
            </button>
            
            <button
              onClick={() => setIsRecording(!isRecording)}
              className="w-full py-6 rounded-xl text-xl font-bold transition-all duration-200 hover:scale-105"
              style={{
                background: isRecording ? '#DC2626' : '#DC2626',
                color: '#FFFFFF',
                border: '2px solid #DC2626'
              }}
            >
              {isRecording ? '⏹️ STOP RECORDING' : '⏺️ START RECORDING'}
            </button>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div 
                className="p-4 rounded-lg"
                style={{ background: '#1E2842' }}
              >
                <div className="text-xs font-semibold mb-2" style={{ color: '#7A8BA3' }}>
                  STATUS
                </div>
                <div className="text-lg font-bold" style={{ color: isLive ? '#FF6B00' : '#7A8BA3' }}>
                  {isLive ? 'LIVE' : 'OFF AIR'}
                </div>
              </div>
              
              <div 
                className="p-4 rounded-lg"
                style={{ background: '#1E2842' }}
              >
                <div className="text-xs font-semibold mb-2" style={{ color: '#7A8BA3' }}>
                  BITRATE
                </div>
                <div className="text-lg font-bold" style={{ color: '#00D9FF' }}>
                  {isLive ? '6000 Kbps' : '0 Kbps'}
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'transitions':
        return <TransitionSystem isOpen={true} onClose={() => {}} />;
      
      case 'brand':
        return <OverlayManager isOpen={true} onClose={() => {}} />;
      
      case 'people':
        return <ParticipantManager isOpen={true} onClose={() => {}} maxParticipants={20} />;
      
      case 'audio':
        return <AdvancedAudioMixer isOpen={true} onClose={() => {}} />;
      
      case 'camera':
        return <CameraControl isOpen={true} onClose={() => {}} />;
      
      case 'destinations':
        return <StreamingConfig isOpen={true} onClose={() => {}} />;
      
      case 'recording':
        return <RecordingSettings isOpen={true} onClose={() => {}} />;
      
      case 'analytics':
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold mb-4" style={{ color: '#FFFFFF' }}>
              Analytics
            </h3>
            <div className="text-center py-12" style={{ color: '#7A8BA3' }}>
              <div className="text-6xl mb-4">📊</div>
              <div className="text-lg">Analytics coming soon...</div>
              <div className="text-sm mt-2">Viewers, engagement, bitrate graphs</div>
            </div>
          </div>
        );
      
      case 'chat':
        return <UnifiedChat isOpen={true} onClose={() => {}} />;
      
      case 'settings':
        return <AdvancedSettings isOpen={true} onClose={() => {}} />;
      
      default:
        return (
          <div className="text-center py-12" style={{ color: '#7A8BA3' }}>
            Select a tab to get started
          </div>
        );
    }
  };

  return (
    <div 
      className="flex h-screen overflow-hidden"
      style={{ background: '#0A0E1A' }}
    >
      {/* Sidebar */}
      {sidebarOpen && <Sidebar />}
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <MainHeader 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)} 
        />
        
        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Program Monitor + Participants + Controls */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Dual Monitors (PREVIEW + PROGRAM) */}
            <div className="flex-1 p-4 overflow-hidden">
              <DualMonitors 
                isLive={isLive}
                viewers={isLive ? 127 : 0}
                duration={isLive ? '00:15:42' : '00:00:00'}
                previewSource="CAM 1"
                programSource="CAM 2"
              />
            </div>
            
            {/* Participants Strip */}
            <ParticipantsStrip
              participants={participants}
              onToggleMute={(id) => console.log('Toggle mute:', id)}
              onToggleCamera={(id) => console.log('Toggle camera:', id)}
              onParticipantClick={(id) => console.log('Participant clicked:', id)}
            />
            
            {/* Control Bar */}
            <ControlBar
              isMuted={isMuted}
              isCameraOff={isCameraOff}
              isScreenSharing={isScreenSharing}
              onToggleMute={() => setIsMuted(!isMuted)}
              onToggleCamera={() => setIsCameraOff(!isCameraOff)}
              onToggleScreenShare={() => setIsScreenSharing(!isScreenSharing)}
              onInvite={() => setActiveTab('people')}
              onLeave={() => console.log('Leave clicked')}
            />
          </div>
          
          {/* Right: Sidebar with Tabs */}
          <RightSidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
          >
            {renderTabContent()}
          </RightSidebar>
        </div>
      </div>
    </div>
  );
};

export default Home;
