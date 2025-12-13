import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';
import Sidebar from '@/components/Sidebar';
import Monitor from '@/components/Monitor';
import VideoMixer from '@/components/VideoMixer';
import Mixer from '@/components/Mixer';
import SceneGallery from '@/components/SceneGallery';
import StatusBar from '@/components/StatusBar';
import VideoMonitors from '@/components/VideoMonitors';
import SourcesPanel from '@/components/SourcesPanel';
import TransitionsPanel from '@/components/TransitionsPanel';
import AudioControls from '@/components/AudioControls';
import AudioControlsPanel from '@/components/AudioControlsPanel';
import RecordStreamButtons from '@/components/RecordStreamButtons';
import MainHeader from '@/components/MainHeader';
import BottomStatusBar from '@/components/BottomStatusBar';
import RecordingManager from '@/components/RecordingManager';
import StreamingManager from '@/components/StreamingManager';
import AdvancedSettings from '@/components/AdvancedSettings';
import MainDashboard from '@/components/MainDashboard';
import NotificationCenter from '@/components/NotificationCenter';
import StudioHeader from '@/components/StudioHeader';
import StreamingConfig from '@/components/StreamingConfig';
import DailyVideoEmbed from '@/components/DailyVideoEmbed';
import InvitePanel from '@/components/InvitePanel';
import ParticipantsPanel from '@/components/ParticipantsPanel';
import LiveChat from '@/components/LiveChat';
import ReactionsPanel from '@/components/ReactionsPanel';
import RecordingVideocall from '@/components/RecordingVideocall';
import CameraComposer from '@/components/CameraComposer';
import DataPersistenceManager from '@/components/DataPersistenceManager';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { toast } from 'sonner';
import UnifiedChat from '@/components/UnifiedChat';
import OverlayManager from '@/components/OverlayManager';
import AdvancedAudioMixer from '@/components/AdvancedAudioMixer';
import TransitionSystem from '@/components/TransitionSystem';
import CameraControl from '@/components/CameraControl';
import RecordingSettings from '@/components/RecordingSettings';
import StreamingSettings from '@/components/StreamingSettings';
import AudioProcessor from '@/components/AudioProcessor';
import ParticipantManager from '@/components/ParticipantManager';

export default function Home() {
  // The userAuth hooks provides authentication state
  // To implement login/logout functionality, simply call logout() or redirect to getLoginUrl()
  let { user, loading, error, isAuthenticated, logout } = useAuth();

  const [, navigate] = useLocation();
  const [activeSection, setActiveSection] = useState('video');
  const [isLive, setIsLive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showMainDashboard, setShowMainDashboard] = useState(false);
  const [showStreamingConfig, setShowStreamingConfig] = useState(false);
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [showParticipantsPanel, setShowParticipantsPanel] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);
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

  const handleTake = () => {
    setIsLive(!isLive);
    toast.success(isLive ? 'Saiu do ar' : 'Entrou no ar!', {
      description: isLive ? 'Transmissão finalizada' : 'Transmissão iniciada',
    });
  };

  useKeyboardShortcuts({});

  return (
    <div className="h-screen w-screen text-white flex overflow-hidden" style={{ background: '#0A0E1A' }}>
      {/* Sidebar */}
      {showSidebar && <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main Header */}
        <MainHeader onMenuClick={() => setShowSidebar(!showSidebar)} />

        {/* Header Toolbar - Hidden, keeping for PRO features */}
        <div className="hidden">
          <StudioHeader
          isLive={isLive}
          participantCount={participantCount}
          onNavigateHome={() => navigate('/')}
          onInvite={() => setShowInvitePanel(true)}
          onParticipants={() => setShowParticipantsPanel(true)}
          onStreamingConfig={() => setShowStreamingConfig(true)}
          onDashboard={() => setShowMainDashboard(true)}
          onSettings={() => setShowAdvancedSettings(true)}
          onRecordingVideocall={() => setShowRecordingVideocall(true)}
          onReactions={() => setShowReactions(true)}
          onChat={() => setShowLiveChat(true)}
          onUnifiedChat={() => setShowUnifiedChat(true)}
          onOverlayManager={() => setShowOverlayManager(true)}
          onAdvancedAudioMixer={() => setShowAdvancedAudioMixer(true)}
          onTransitionSystem={() => setShowTransitionSystem(true)}
          onCameraControl={() => setShowCameraControl(true)}
          onRecordingSettings={() => setShowRecordingSettings(true)}
          onStreamingSettings={() => setShowStreamingSettings(true)}
          onAudioProcessor={() => setShowAudioProcessor(true)}
          onParticipantManager={() => setShowParticipantManager(true)}
        />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto flex flex-col" style={{ background: '#0A0E1A' }}>
          {/* Top Section: Video Monitors - NEW DESIGN */}
          <VideoMonitors />

          {/* Controls Section - NEW DESIGN */}
          <div className="px-6 pb-6">
            <div className="grid grid-cols-3 gap-6">
              {/* Left Column: Sources */}
              <div>
                <SourcesPanel />
              </div>

              {/* Center Column: Transitions */}
              <div>
                <TransitionsPanel />
              </div>

              {/* Right Column: Audio Controls */}
              <div>
                <AudioControlsPanel />
              </div>
            </div>

            {/* Record & Stream Buttons */}
            <div className="mt-6">
              <RecordStreamButtons />
            </div>
          </div>

          {/* Daily.co Video Embed Section - MOVED DOWN */}
          <div className="flex-shrink-0 h-80 px-4 pb-4">
            <div className="h-full rounded-lg overflow-hidden border border-gray-700">
              <DailyVideoEmbed
                roomName="OnnPlay Studio Pro Live"
                roomUrl="https://onnplay.daily.co/studio-pro"
                onParticipantsChange={setParticipantCount}
                onParticipants={() => setShowParticipantsPanel(true)}
                onSettings={() => setShowAdvancedSettings(true)}
              />
            </div>
          </div>

          {/* Scene Gallery */}
          <div className="flex-shrink-0 h-40 px-4 pb-4">
            <SceneGallery />
          </div>

          {/* Bottom Padding */}
          <div className="flex-shrink-0 h-4"></div>
        </div>

        {/* Status Bar - Fixed at bottom */}
        <BottomStatusBar isLive={isLive} isRecording={isRecording} />
      </div>

      {/* Modals */}
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

      {/* Streaming Config Modal */}
      <StreamingConfig
        isOpen={showStreamingConfig}
        onClose={() => setShowStreamingConfig(false)}
      />

      {/* Invite Panel Modal */}
      <InvitePanel
        isOpen={showInvitePanel}
        onClose={() => setShowInvitePanel(false)}
        roomName="OnnPlay Studio Pro Live"
        roomUrl="https://onnplay.daily.co/studio-pro"
      />

      {/* Participants Panel Modal */}
      <ParticipantsPanel
        isOpen={showParticipantsPanel}
        onClose={() => setShowParticipantsPanel(false)}
        onParticipantRemove={(id) => {
          toast.info('Participante removido');
        }}
      />

      {/* Live Chat Modal */}
      <LiveChat
        isOpen={showLiveChat}
        onClose={() => setShowLiveChat(false)}
        userName="Você"
        userRole="host"
      />

      {/* Reactions Panel */}
      <ReactionsPanel
        isOpen={showReactions}
        onClose={() => setShowReactions(false)}
      />

      {/* Recording Videocall Modal */}
      <RecordingVideocall
        isOpen={showRecordingVideocall}
        onClose={() => setShowRecordingVideocall(false)}
        isLive={isLive}
      />

      {/* Unified Chat */}
      <UnifiedChat
        isOpen={showUnifiedChat}
        onClose={() => setShowUnifiedChat(false)}
      />

      {/* Overlay Manager */}
      <OverlayManager
        isOpen={showOverlayManager}
        onClose={() => setShowOverlayManager(false)}
      />

      {/* Advanced Audio Mixer */}
      <AdvancedAudioMixer
        isOpen={showAdvancedAudioMixer}
        onClose={() => setShowAdvancedAudioMixer(false)}
      />

      {/* Transition System */}
      <TransitionSystem
        isOpen={showTransitionSystem}
        onClose={() => setShowTransitionSystem(false)}
      />

      {/* Camera Control */}
      <CameraControl
        isOpen={showCameraControl}
        onClose={() => setShowCameraControl(false)}
      />

      {/* Recording Settings */}
      <RecordingSettings
        isOpen={showRecordingSettings}
        onClose={() => setShowRecordingSettings(false)}
        onSave={(settings) => {
          console.log('Recording settings saved:', settings);
          toast.success('Configurações de gravação salvas!');
        }}
      />

      {/* Streaming Settings */}
      <StreamingSettings
        isOpen={showStreamingSettings}
        onClose={() => setShowStreamingSettings(false)}
        onSave={(platforms) => {
          console.log('Streaming settings saved:', platforms);
        }}
      />

      {/* Audio Processor */}
      <AudioProcessor
        isOpen={showAudioProcessor}
        onClose={() => setShowAudioProcessor(false)}
        sourceId="cam1"
        sourceName="Câmera 1"
      />

      {/* Participant Manager */}
      <ParticipantManager
        isOpen={showParticipantManager}
        onClose={() => setShowParticipantManager(false)}
        maxParticipants={20}
      />

      {/* Notification Center */}
      <NotificationCenter />
    </div>
  );
}
