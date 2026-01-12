import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, VideoOff, Mic, MicOff, Settings, Camera, 
  Monitor, ChevronDown, Check, RefreshCw, Send, 
  Volume2, VolumeX, Maximize2, X
} from 'lucide-react';
import { localCameraService, CameraDevice, CameraState } from '../services/LocalCameraService';
import { toast } from 'sonner';

interface CameraPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CameraPanel({ isOpen, onClose }: CameraPanelProps) {
  const [cameraState, setCameraState] = useState<CameraState>({
    isActive: false,
    stream: null,
    deviceId: null,
    deviceLabel: 'Câmera',
    error: null,
  });
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [availableMics, setAvailableMics] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [selectedMic, setSelectedMic] = useState<string>('');
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [micVolume, setMicVolume] = useState(80);
  const [showCameraDropdown, setShowCameraDropdown] = useState(false);
  const [showMicDropdown, setShowMicDropdown] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  // Carregar dispositivos disponíveis
  useEffect(() => {
    const loadDevices = async () => {
      try {
        // Solicitar permissão primeiro
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        const cameras = devices
          .filter(d => d.kind === 'videoinput')
          .map((d, i) => ({
            deviceId: d.deviceId,
            label: d.label || `Câmera ${i + 1}`,
          }));
        
        const mics = devices.filter(d => d.kind === 'audioinput');
        
        setAvailableCameras(cameras);
        setAvailableMics(mics);
        
        if (cameras.length > 0 && !selectedCamera) {
          setSelectedCamera(cameras[0].deviceId);
        }
        if (mics.length > 0 && !selectedMic) {
          setSelectedMic(mics[0].deviceId);
        }
      } catch (err) {
        console.error('Erro ao carregar dispositivos:', err);
        toast.error('Erro ao acessar câmera/microfone');
      }
    };

    if (isOpen) {
      loadDevices();
    }
  }, [isOpen]);

  // Subscrever ao serviço de câmera
  useEffect(() => {
    const unsubscribe = localCameraService.subscribe((state) => {
      setCameraState(state);
    });

    return unsubscribe;
  }, []);

  // Atualizar preview do vídeo
  useEffect(() => {
    if (videoRef.current && cameraState.stream) {
      videoRef.current.srcObject = cameraState.stream;
      
      // Configurar analisador de áudio
      setupAudioAnalyser(cameraState.stream);
    }
  }, [cameraState.stream]);

  // Configurar analisador de áudio para medidor de nível
  const setupAudioAnalyser = (stream: MediaStream) => {
    try {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Atualizar nível de áudio
      const updateLevel = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(Math.round((average / 255) * 100));
        }
        requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (err) {
      console.error('Erro ao configurar analisador de áudio:', err);
    }
  };

  // Limpar ao fechar
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleStartCamera = async () => {
    try {
      await localCameraService.startCamera(selectedCamera || undefined);
      toast.success('Câmera iniciada!');
    } catch (err) {
      toast.error('Erro ao iniciar câmera');
    }
  };

  const handleStopCamera = () => {
    localCameraService.stopCamera();
    toast.info('Câmera desligada');
  };

  const handleSwitchCamera = async (deviceId: string) => {
    setSelectedCamera(deviceId);
    setShowCameraDropdown(false);
    
    if (cameraState.isActive) {
      await localCameraService.switchCamera(deviceId);
      toast.success('Câmera alterada!');
    }
  };

  const handleToggleMic = () => {
    if (cameraState.stream) {
      const audioTracks = cameraState.stream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !isMicEnabled;
      });
      setIsMicEnabled(!isMicEnabled);
      toast.info(isMicEnabled ? 'Microfone desativado' : 'Microfone ativado');
    }
  };

  const handleSendToPreview = () => {
    if (cameraState.isActive && cameraState.stream) {
      localCameraService.sendToPreview();
      toast.success('Câmera enviada para PREVIEW');
    } else {
      toast.error('Inicie a câmera primeiro');
    }
  };

  const handleSendToProgram = () => {
    if (cameraState.isActive && cameraState.stream) {
      // Disparar evento para enviar direto ao PROGRAM
      window.dispatchEvent(new CustomEvent('camera:program', {
        detail: {
          id: 'local-camera',
          type: 'camera',
          name: cameraState.deviceLabel || 'Minha Câmera',
          stream: cameraState.stream,
        }
      }));
      toast.success('Câmera enviada para PROGRAM (AO VIVO)');
    } else {
      toast.error('Inicie a câmera primeiro');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-[#0F1419] border border-[#1E2842] rounded-xl shadow-2xl transition-all ${
        isFullscreen ? 'w-full h-full max-w-none' : 'max-w-2xl w-full'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1E2842]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <Camera size={24} className="text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Câmera & Microfone</h2>
              <p className="text-xs text-gray-400">Configure sua câmera e áudio para o programa</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-[#1E2842] rounded-lg transition-colors"
            >
              <Maximize2 size={18} className="text-gray-400" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#1E2842] rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Video Preview */}
          <div className="space-y-4">
            <div className="relative aspect-video bg-[#1E2842] rounded-lg overflow-hidden border border-[#2D3A5C]">
              {cameraState.isActive && cameraState.stream ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                  <VideoOff size={48} className="mb-2 opacity-50" />
                  <p className="text-sm">Câmera desligada</p>
                </div>
              )}
              
              {/* Status indicator */}
              {cameraState.isActive && (
                <div className="absolute top-3 left-3 flex items-center gap-2 px-2 py-1 rounded-lg bg-black/50">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-white font-medium">AO VIVO</span>
                </div>
              )}

              {/* Audio level indicator */}
              {cameraState.isActive && (
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="flex items-center gap-2">
                    {isMicEnabled ? (
                      <Mic size={14} className="text-green-400" />
                    ) : (
                      <MicOff size={14} className="text-red-400" />
                    )}
                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all duration-75 rounded-full"
                        style={{ 
                          width: `${isMicEnabled ? audioLevel : 0}%`,
                          background: audioLevel > 80 
                            ? 'linear-gradient(to right, #00FF88, #FFD700, #FF3366)' 
                            : 'linear-gradient(to right, #00FF88, #00D9FF)'
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Camera Controls */}
            <div className="flex gap-2">
              {!cameraState.isActive ? (
                <button
                  onClick={handleStartCamera}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Video size={18} />
                  Iniciar Câmera
                </button>
              ) : (
                <button
                  onClick={handleStopCamera}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <VideoOff size={18} />
                  Parar Câmera
                </button>
              )}
              
              <button
                onClick={handleToggleMic}
                className={`px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                  isMicEnabled 
                    ? 'bg-[#1E2842] text-white hover:bg-[#2D3A5C]' 
                    : 'bg-red-600 text-white hover:bg-red-500'
                }`}
                disabled={!cameraState.isActive}
              >
                {isMicEnabled ? <Mic size={18} /> : <MicOff size={18} />}
              </button>
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            {/* Camera Selection */}
            <div>
              <label className="text-sm font-semibold text-gray-400 block mb-2">
                Selecionar Câmera
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowCameraDropdown(!showCameraDropdown)}
                  className="w-full px-4 py-3 bg-[#1E2842] text-white rounded-lg border border-[#2D3A5C] flex items-center justify-between hover:border-cyan-500 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Video size={16} className="text-cyan-400" />
                    <span className="text-sm truncate">
                      {availableCameras.find(c => c.deviceId === selectedCamera)?.label || 'Selecione uma câmera'}
                    </span>
                  </div>
                  <ChevronDown size={16} className={`transition-transform ${showCameraDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showCameraDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#1E2842] border border-[#2D3A5C] rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
                    {availableCameras.map((camera) => (
                      <button
                        key={camera.deviceId}
                        onClick={() => handleSwitchCamera(camera.deviceId)}
                        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-[#2D3A5C] flex items-center justify-between"
                      >
                        <span className="truncate">{camera.label}</span>
                        {selectedCamera === camera.deviceId && (
                          <Check size={14} className="text-cyan-400" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Microphone Selection */}
            <div>
              <label className="text-sm font-semibold text-gray-400 block mb-2">
                Selecionar Microfone
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowMicDropdown(!showMicDropdown)}
                  className="w-full px-4 py-3 bg-[#1E2842] text-white rounded-lg border border-[#2D3A5C] flex items-center justify-between hover:border-orange-500 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Mic size={16} className="text-orange-400" />
                    <span className="text-sm truncate">
                      {availableMics.find(m => m.deviceId === selectedMic)?.label || 'Selecione um microfone'}
                    </span>
                  </div>
                  <ChevronDown size={16} className={`transition-transform ${showMicDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showMicDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#1E2842] border border-[#2D3A5C] rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
                    {availableMics.map((mic, index) => (
                      <button
                        key={mic.deviceId}
                        onClick={() => {
                          setSelectedMic(mic.deviceId);
                          setShowMicDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-[#2D3A5C] flex items-center justify-between"
                      >
                        <span className="truncate">{mic.label || `Microfone ${index + 1}`}</span>
                        {selectedMic === mic.deviceId && (
                          <Check size={14} className="text-orange-400" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Volume Control */}
            <div>
              <label className="text-sm font-semibold text-gray-400 block mb-2">
                Volume do Microfone
              </label>
              <div className="flex items-center gap-3">
                <Volume2 size={16} className="text-gray-400" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={micVolume}
                  onChange={(e) => setMicVolume(parseInt(e.target.value))}
                  className="flex-1 h-2 appearance-none bg-gray-700 rounded-full cursor-pointer accent-orange-500"
                />
                <span className="text-sm text-gray-400 w-10 text-right">{micVolume}%</span>
              </div>
            </div>

            {/* Send Buttons */}
            <div className="pt-4 space-y-2">
              <button
                onClick={handleSendToPreview}
                disabled={!cameraState.isActive}
                className="w-full px-4 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Send size={18} />
                Enviar para PREVIEW
              </button>
              
              <button
                onClick={handleSendToProgram}
                disabled={!cameraState.isActive}
                className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Monitor size={18} />
                Enviar para PROGRAM (AO VIVO)
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#1E2842] p-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <RefreshCw size={14} />
            <span>Clique em "Iniciar Câmera" para começar</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#1E2842] hover:bg-[#2D3A5C] text-gray-300 rounded-lg font-semibold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
