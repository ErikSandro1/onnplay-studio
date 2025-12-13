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
import { AIChat } from '../components/AIChat';
import { JoinRoomModal } from '../components/JoinRoomModal';

// Services
import { videoSourceManager } from '../services/VideoSourceManager';
import { transitionEngine } from '../services/TransitionEngine';
import { programSwitcher } from '../services/ProgramSwitcher';
import { layoutManager } from '../services/LayoutManager';
import { streamingService } from '../services/StreamingService';
import { recordingService } from '../services/RecordingService';
import { aiAssistantService } from '../services/AIAssistantService';
import { cameraControlService } from '../services/CameraControlService';
import { rtmpStreamService } from '../services/RTMPStreamService';

// Context
import { DailyProvider, useDailyContext } from '../contexts/DailyContext';
const HomeContent: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isJoinRoomModalOpen, setIsJoinRoomModalOpen] = useState(false);
  
  // Daily.co context
  const dailyContext = useDailyContext();
  
  // Subscribe to RTMP stream stats
  useEffect(() => {
    const unsubscribe = rtmpStreamService.subscribe((stats) => {
      setBitrate(`${stats.bitrate} Kbps`);
    });
    return unsubscribe;
  }, []);
  
  // Control states
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [lastTransition, setLastTransition] = useState<string>('none');
  const [transitionTimestamp, setTransitionTimestamp] = useState<string>('');
  const [previewCamera, setPreviewCamera] = useState<'cam1' | 'cam2' | 'cam3' | 'media' | 'screen'>('cam1');
  const [programCamera, setProgramCamera] = useState<'cam1' | 'cam2' | 'cam3' | 'media' | 'screen'>('cam2');
  
  // Broadcast stats
  const [viewers, setViewers] = useState(0);
  const [duration, setDuration] = useState('00:00:00');
  const [bitrate, setBitrate] = useState('0 Kbps');

  // Mock participants (used when Daily.co is not connected)
  const mockParticipants = [
    { id: '1', name: 'You (Local)', isMuted: false, isCameraOff: false, isSpeaking: false, isLocal: true },
    { id: '2', name: 'Guest 1', isMuted: false, isCameraOff: false, isSpeaking: false, isLocal: false },
    { id: '3', name: 'Guest 2', isMuted: true, isCameraOff: false, isSpeaking: false, isLocal: false },
  ];

  // Use Daily.co participants if connected, otherwise use mock
  const displayParticipants = dailyContext.isConnected 
    ? dailyContext.participants 
    : mockParticipants;

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
        await rtmpStreamService.stopStreaming();
        setIsLive(false);
      } else {
        // Check if destinations are configured
        const destinations = rtmpStreamService.getDestinations();
        const enabled = destinations.filter(d => d.enabled);
        if (enabled.length === 0) {
          alert('Please configure streaming destinations first (Tools → Destinations)');
          setActiveTool('destinations');
          return;
        }
        await rtmpStreamService.startStreaming();
        setIsLive(true);
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

  const handleCameraChange = (camera: 'cam1' | 'cam2' | 'cam3' | 'media' | 'screen', target: 'program' | 'preview') => {
    if (target === 'program') {
      setProgramCamera(camera);
    } else {
      setPreviewCamera(camera);
    }
  };

  const handleLayoutChange = (layout: 'single' | 'pip' | 'split' | 'grid') => {
    console.log('Layout changed to:', layout);
    // Will be connected to LayoutManager later
  };

  const handleTransition = async (type: 'mix' | 'wipe' | 'cut' | 'auto') => {
    
    if (isTransitioning) {
      console.log('⚠️ Already transitioning, skipping');
      return;
    }
    
    setIsTransitioning(true);
    
    try {
      // Map transition types to ProgramSwitcher types
      const transitionMap = {
        mix: 'fade' as const,
        wipe: 'wipe' as const,
        cut: 'cut' as const,
        auto: 'fade' as const,
      };
      
      // Execute transition via ProgramSwitcher
      await programSwitcher.take({
        type: transitionMap[type],
        duration: type === 'cut' ? 0 : 1000,
      });
      
      // Update visual feedback
      setLastTransition(type.toUpperCase());
      const now = new Date();
      setTransitionTimestamp(now.toLocaleTimeString('pt-BR'));
      
      console.log(`✅ Transition ${type} executed`);
    } catch (error) {
      console.error('❌ Transition error:', error);
    } finally {
      setIsTransitioning(false);
    }
  };

  const renderToolModal = () => {
    switch (activeTool) {
      case 'transitions':
        return <TransitionSystem onTransition={handleTransition} isTransitioning={isTransitioning} />;
      case 'brand':
        return <OverlayManager isOpen={true} onClose={handleCloseTool} />;
      case 'people':
        return <ParticipantManager isOpen={true} onClose={handleCloseTool} />;
      case 'audio':
        return <AdvancedAudioMixer isOpen={true} onClose={handleCloseTool} />;
      case 'camera':
        return <CameraControl onCameraChange={handleCameraChange} onLayoutChange={handleLayoutChange} />;
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

  // Register AI Assistant handlers
  useEffect(() => {
    // Camera commands
    aiAssistantService.registerHandler('set_zoom', async (params) => {
      const cameraId = params.target.toLowerCase().includes('cam 1') ? 'cam1' :
                       params.target.toLowerCase().includes('cam 2') ? 'cam2' : 'cam1';
      cameraControlService.setZoom(cameraId, params.value);
      return {
        success: true,
        message: `Zoom da ${params.target} ajustado para ${params.value}x`,
        details: { camera: cameraId, zoom: params.value },
      };
    });
    
    aiAssistantService.registerHandler('reset_zoom', async (params) => {
      const cameraId = params.target.toLowerCase().includes('cam 1') ? 'cam1' :
                       params.target.toLowerCase().includes('cam 2') ? 'cam2' : 'cam1';
      cameraControlService.resetCamera(cameraId);
      return {
        success: true,
        message: `Zoom da ${params.target} resetado`,
        details: { camera: cameraId },
      };
    });
    
    // Layout commands
    aiAssistantService.registerHandler('set_pip', async (params) => {
      handleLayoutChange('pip');
      return { success: true, message: 'Layout mudado para Picture-in-Picture' };
    });
    
    aiAssistantService.registerHandler('set_split', async (params) => {
      handleLayoutChange('split');
      return { success: true, message: 'Layout mudado para Split Screen' };
    });
    
    aiAssistantService.registerHandler('set_grid', async (params) => {
      handleLayoutChange('grid');
      return { success: true, message: 'Layout mudado para Grid 2x2' };
    });
    
    aiAssistantService.registerHandler('set_single', async (params) => {
      handleLayoutChange('single');
      return { success: true, message: 'Layout mudado para Single' };
    });
    
    // Transition commands
    aiAssistantService.registerHandler('fade', async (params) => {
      await handleTransition('mix');
      return { success: true, message: 'Transição fade aplicada' };
    });
    
    aiAssistantService.registerHandler('wipe', async (params) => {
      await handleTransition('wipe');
      return { success: true, message: 'Transição wipe aplicada' };
    });
    
    aiAssistantService.registerHandler('cut', async (params) => {
      await handleTransition('cut');
      return { success: true, message: 'Corte direto aplicado' };
    });
    
    aiAssistantService.registerHandler('take', async (params) => {
      await handleTransition('mix');
      return { success: true, message: 'TAKE executado (PREVIEW → PROGRAM)' };
    });
    
    // Broadcast commands
    aiAssistantService.registerHandler('go_live', async (params) => {
      setIsLive(true);
      return { success: true, message: '🔴 Transmissão iniciada! Você está AO VIVO!' };
    });
    
    aiAssistantService.registerHandler('stop_broadcast', async (params) => {
      setIsLive(false);
      return { success: true, message: 'Transmissão encerrada' };
    });
    
    aiAssistantService.registerHandler('start_recording', async (params) => {
      setIsRecording(true);
      return { success: true, message: '⏺️ Gravação iniciada!' };
    });
    
    aiAssistantService.registerHandler('stop_recording', async (params) => {
      setIsRecording(false);
      return { success: true, message: 'Gravação parada' };
    });
  }, []);

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
              <DualMonitors 
                isLive={isLive}
                viewers={viewers}
                duration={duration}
                lastTransition={lastTransition}
                transitionTimestamp={transitionTimestamp}
                previewCamera={previewCamera}
                programCamera={programCamera}
                isTransitioning={isTransitioning}
              />
            </div>

            {/* Participants Strip */}
            <div style={{ height: '140px' }}>
              <ParticipantsStrip participants={displayParticipants} />
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
      
      {/* AI Assistant Chat */}
      <AIChat isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
      
      {/* Join Room Modal */}
      <JoinRoomModal isOpen={isJoinRoomModalOpen} onClose={() => setIsJoinRoomModalOpen(false)} />
      
      {/* Join Room Button (floating) - only show when not connected */}
      {!dailyContext.isConnected && (
        <button
          onClick={() => setIsJoinRoomModalOpen(true)}
          className="fixed bottom-6 right-24 w-14 h-14 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center text-2xl z-40"
          title="Join Video Room"
        >
          📹
        </button>
      )}
      
      {/* Leave Room Button (floating) - only show when connected */}
      {dailyContext.isConnected && (
        <button
          onClick={() => dailyContext.leaveRoom()}
          className="fixed bottom-6 right-24 w-14 h-14 rounded-full bg-gradient-to-r from-red-500 to-red-600 shadow-lg hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center text-2xl z-40"
          title="Leave Room"
        >
          🚪
        </button>
      )}
      
      {/* AI Assistant Button (floating) */}
      <button
        onClick={() => setIsAIChatOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center text-2xl z-40"
        title="Operador IA"
      >
        🤖
      </button>
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
