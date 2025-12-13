import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import MainHeader from '../components/MainHeader';
import VideoMonitors from '../components/VideoMonitors';
import SourcesPanel from '../components/SourcesPanel';
import TransitionsPanel from '../components/TransitionsPanel';
import AudioControlsPanel from '../components/AudioControlsPanel';
import RecordStreamButtons from '../components/RecordStreamButtons';
import BottomStatusBar from '../components/BottomStatusBar';

const Home: React.FC = () => {
  const [showSidebar, setShowSidebar] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

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
                <TransitionsPanel />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
