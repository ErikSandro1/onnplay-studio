import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import MainHeader from '../components/MainHeader';
import VideoMonitors from '../components/VideoMonitors';
import SourcesPanel from '../components/SourcesPanel';
import TransitionsPanel from '../components/TransitionsPanel';
import AudioControlsPanel from '../components/AudioControlsPanel';
import RecordStreamButtons from '../components/RecordStreamButtons';
import BottomStatusBar from '../components/BottomStatusBar';

// PRO Components
import AdvancedSettings from '../components/AdvancedSettings';
import MainDashboard from '../components/MainDashboard';
import StreamingConfig from '../components/StreamingConfig';
import InvitePanel from '../components/InvitePanel';
import ParticipantsPanel from '../components/ParticipantsPanel';
import LiveChat from '../components/LiveChat';
import ReactionsPanel from '../components/ReactionsPanel';
import RecordingVideocall from '../components/RecordingVideocall';
import UnifiedChat from '../components/UnifiedChat';
import OverlayManager from '../components/OverlayManager';
import AdvancedAudioMixer from '../components/AdvancedAudioMixer';
import TransitionSystem from '../components/TransitionSystem';
import CameraControl from '../components/CameraControl';
import RecordingSettings from '../components/RecordingSettings';
import StreamingSettings from '../components/StreamingSettings';
import AudioProcessor from '../components/AudioProcessor';
import ParticipantManager from '../components/ParticipantManager';
import NotificationCenter from '../components/NotificationCenter';

const Home: React.FC = () => {
  const [showSidebar, setShowSidebar] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // PRO Modals States
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showMainDashboard, setShowMainDashboard] = useState(false);
  const [showStreamingConfig, setShowStreamingConfig] = useState(false);
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [showParticipantsPanel, setShowParticipantsPanel] = useState(false);
  const [showLiveChat, setShowLiveChat] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showRecordingVideocall, setShowRecordingVideocall] = useState(false);
  const [showUnifiedChat, setShowUnifiedChat] = useState(false);
  const [showOverlayManager, setShowOverlayManager] = useState(false);
  const [showAdvancedAudioMixer, setShowAdvancedAudioMixer] = useState(false);
  const [showTransitionSystem, setShowTransitionSystem] = useState(false);
  const [showCameraControl, setShowCameraControl] = useState(false);
  const [showRecordingSettings, setShowRecordingSettings] = useState(false);
  const [showStreamingSettings, setShowStreamingSettings] = useState(false);
  const [showAudioProcessor, setShowAudioProcessor] = useState(false);
  const [showParticipantManager, setShowParticipantManager] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0A0E1A' }}>
      {/* Sidebar */}
      {showSidebar && (
        <div className="flex-shrink-0">
          <Sidebar />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <MainHeader onMenuClick={() => setShowSidebar(!showSidebar)} />

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto" style={{ background: '#0A0E1A' }}>
          <div className="flex p-6 gap-6" style={{ minHeight: '100%' }}>
            {/* Left Side: Monitors + Audio + Buttons */}
            <div className="flex-1 flex flex-col gap-6">
              {/* Video Monitors - LARGE */}
              <div style={{ height: '500px', minHeight: '500px' }}>
                <VideoMonitors />
              </div>

              {/* Audio Controls */}
              <div style={{ height: '120px' }}>
                <AudioControlsPanel />
              </div>

              {/* Record/Stream Buttons */}
              <div style={{ height: '140px' }}>
                <RecordStreamButtons />
              </div>

              {/* Status Bar */}
              <div>
                <BottomStatusBar isLive={isLive} isRecording={isRecording} />
              </div>
            </div>

            {/* Right Side: Sources + Transitions */}
            <div className="flex flex-col gap-6" style={{ width: '320px', flexShrink: 0 }}>
              {/* Sources Panel */}
              <div style={{ height: '400px' }}>
                <SourcesPanel />
              </div>

              {/* Transitions Panel */}
              <div style={{ height: '350px' }}>
                <TransitionsPanel onTransitionSelect={(type) => {
                  // Abre o TransitionSystem quando clicar em uma transição
                  setShowTransitionSystem(true);
                }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PRO MODALS */}
      {showMainDashboard && (
        <div className="fixed inset-0 z-50">
          <MainDashboard />
        </div>
      )}

      {showAdvancedSettings && (
        <div className="fixed inset-0 z-50">
          <AdvancedSettings isOpen={true} onClose={() => setShowAdvancedSettings(false)} />
        </div>
      )}

      <StreamingConfig
        isOpen={showStreamingConfig}
        onClose={() => setShowStreamingConfig(false)}
      />

      <InvitePanel
        isOpen={showInvitePanel}
        onClose={() => setShowInvitePanel(false)}
        roomName="OnnPlay Studio Pro Live"
        roomUrl="https://onnplay.daily.co/studio-pro"
      />

      <ParticipantsPanel
        isOpen={showParticipantsPanel}
        onClose={() => setShowParticipantsPanel(false)}
        onParticipantRemove={(id) => {
          console.log('Participante removido:', id);
        }}
      />

      <LiveChat
        isOpen={showLiveChat}
        onClose={() => setShowLiveChat(false)}
        userName="Você"
        userRole="host"
      />

      <ReactionsPanel
        isOpen={showReactions}
        onClose={() => setShowReactions(false)}
      />

      <RecordingVideocall
        isOpen={showRecordingVideocall}
        onClose={() => setShowRecordingVideocall(false)}
        isLive={isLive}
      />

      <UnifiedChat
        isOpen={showUnifiedChat}
        onClose={() => setShowUnifiedChat(false)}
      />

      <OverlayManager
        isOpen={showOverlayManager}
        onClose={() => setShowOverlayManager(false)}
      />

      <AdvancedAudioMixer
        isOpen={showAdvancedAudioMixer}
        onClose={() => setShowAdvancedAudioMixer(false)}
      />

      <TransitionSystem
        isOpen={showTransitionSystem}
        onClose={() => setShowTransitionSystem(false)}
      />

      <CameraControl
        isOpen={showCameraControl}
        onClose={() => setShowCameraControl(false)}
      />

      <RecordingSettings
        isOpen={showRecordingSettings}
        onClose={() => setShowRecordingSettings(false)}
      />

      <StreamingSettings
        isOpen={showStreamingSettings}
        onClose={() => setShowStreamingSettings(false)}
      />

      <AudioProcessor
        isOpen={showAudioProcessor}
        onClose={() => setShowAudioProcessor(false)}
      />

      <ParticipantManager
        isOpen={showParticipantManager}
        onClose={() => setShowParticipantManager(false)}
        maxParticipants={20}
      />

      {/* Notification Center */}
      <NotificationCenter />
    </div>
  );
};

export default Home;
