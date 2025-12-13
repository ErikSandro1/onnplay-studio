import { useState } from 'react';
import { useLocation } from 'wouter';
import { Mic, MicOff, Video, VideoOff, Layout, Settings, LogOut, Activity } from 'lucide-react';
import { toast } from 'sonner';

export default function RemoteControl() {
  const [, navigate] = useLocation();
  const [isLive, setIsLive] = useState(false);
  const [activeCamera, setActiveCamera] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(80);

  const handleTake = () => {
    setIsLive(!isLive);
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(200);
    }
    toast.success(isLive ? 'OFF AIR' : 'ON AIR');
  };

  const handleCameraSelect = (cam: number) => {
    setActiveCamera(cam);
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="p-4 bg-gray-900 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo-silver.png" alt="OnnPlay" className="w-10 h-10 object-contain" />
          <div>
            <h1 className="font-bold text-sm">OnnPlay Remote</h1>
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></span>
              {isLive ? 'AO VIVO' : 'CONECTADO'}
            </p>
          </div>
        </div>
        <button onClick={() => navigate('/dashboard')} className="p-2 text-gray-400">
          <LogOut size={20} />
        </button>
      </div>

      {/* Main Controls */}
      <div className="flex-1 p-4 flex flex-col gap-4">
        {/* Tally / Status */}
        <div className={`rounded-lg p-4 text-center border-2 transition-colors ${
          isLive ? 'bg-red-900/30 border-red-600' : 'bg-gray-900 border-gray-700'
        }`}>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">STATUS ATUAL</p>
          <h2 className={`text-3xl font-black ${isLive ? 'text-red-500' : 'text-gray-500'}`}>
            {isLive ? 'ON AIR' : 'STANDBY'}
          </h2>
          {isLive && <p className="text-red-400 font-mono mt-1">00:12:45</p>}
        </div>

        {/* Camera Switcher Grid */}
        <div className="grid grid-cols-2 gap-3 flex-1">
          {[1, 2, 3, 4].map(cam => (
            <button
              key={cam}
              onClick={() => handleCameraSelect(cam)}
              className={`rounded-lg flex flex-col items-center justify-center p-4 transition-all ${
                activeCamera === cam
                  ? 'bg-orange-600 text-white shadow-lg scale-[1.02]'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Video size={32} className="mb-2" />
              <span className="font-bold text-xl">CAM {cam}</span>
              {activeCamera === cam && <span className="text-xs mt-1 bg-black/20 px-2 py-0.5 rounded">PROGRAM</span>}
            </button>
          ))}
        </div>

        {/* Audio Control */}
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-gray-400">MASTER AUDIO</span>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-2 rounded-full ${isMuted ? 'bg-red-900 text-red-500' : 'bg-gray-800 text-green-500'}`}
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => setVolume(parseInt(e.target.value))}
            className="w-full h-12 accent-orange-500"
          />
        </div>

        {/* TAKE Button */}
        <button
          onClick={handleTake}
          className={`w-full py-6 rounded-xl font-black text-3xl tracking-widest shadow-lg transition-all active:scale-95 ${
            isLive
              ? 'bg-gray-800 text-red-500 border-2 border-red-900'
              : 'bg-red-600 text-white hover:bg-red-500 shadow-red-900/50'
          }`}
        >
          {isLive ? 'CUT' : 'TAKE'}
        </button>
      </div>

      {/* Bottom Nav */}
      <div className="bg-gray-900 border-t border-gray-800 p-2 flex justify-around">
        <button className="p-3 text-orange-500 flex flex-col items-center gap-1">
          <Activity size={20} />
          <span className="text-[10px]">Switcher</span>
        </button>
        <button className="p-3 text-gray-500 flex flex-col items-center gap-1">
          <Layout size={20} />
          <span className="text-[10px]">Layouts</span>
        </button>
        <button className="p-3 text-gray-500 flex flex-col items-center gap-1">
          <Settings size={20} />
          <span className="text-[10px]">Config</span>
        </button>
      </div>
    </div>
  );
}
