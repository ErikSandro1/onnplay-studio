import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Camera, CameraOff, Mic, MicOff, LogOut, Loader2 } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

// Daily.co types
declare global {
  interface Window {
    DailyIframe: any;
  }
}

interface JoinRoomProps {}

const JoinRoom: React.FC<JoinRoomProps> = () => {
  const [location, setLocation] = useLocation();
  const roomId = new URLSearchParams(window.location.search).get('room') || '';
  
  // States
  const [step, setStep] = useState<'entry' | 'waiting' | 'admitted'>('entry');
  const [name, setName] = useState('');
  const [guestId] = useState(() => `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [waitingMessage, setWaitingMessage] = useState('Aguardando o apresentador admitir você...');
  const [admittedDestination, setAdmittedDestination] = useState<'preview' | 'program' | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<Array<{id: string; name: string; videoTrack?: MediaStreamTrack; audioTrack?: MediaStreamTrack}>>([]);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const dailyCallRef = useRef<any>(null);
  const remoteAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  
  // Load Daily.co script
  useEffect(() => {
    // Check if script already exists
    const existingScript = document.querySelector('script[src*="daily-co/daily-js"]');
    if (existingScript) {
      return; // Script already loaded
    }
    
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@daily-co/daily-js';
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      // Only remove if script is still in the DOM
      if (script.parentNode === document.body) {
        try {
          document.body.removeChild(script);
        } catch (e) {
          // Script already removed, ignore
        }
      }
    };
  }, []);
  
  // Initialize camera preview
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoEnabled,
          audio: audioEnabled
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        setError('Não foi possível acessar câmera/microfone. Verifique as permissões.');
      }
    };
    
    // Initialize camera for entry and waiting steps
    if (step === 'entry' || step === 'waiting') {
      initCamera();
    }
    
    // Only cleanup when leaving the page, not when changing steps
    return () => {
      // Don't stop tracks when transitioning between steps
    };
  }, [step, videoEnabled, audioEnabled]);
  
  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  // Toggle video
  const toggleVideo = useCallback(async () => {
    // Se está conectado ao Daily.co, usar a API do Daily
    if (dailyCallRef.current) {
      const newState = !videoEnabled;
      try {
        await dailyCallRef.current.setLocalVideo(newState);
        setVideoEnabled(newState);
        console.log('[Daily] Video toggled:', newState);
        
        // Atualizar o preview local
        if (newState && videoRef.current) {
          const localParticipant = dailyCallRef.current.participants()?.local;
          if (localParticipant?.tracks?.video?.track) {
            const stream = new MediaStream([localParticipant.tracks.video.track]);
            videoRef.current.srcObject = stream;
          }
        }
      } catch (err) {
        console.error('[Daily] Error toggling video:', err);
      }
    } else if (streamRef.current) {
      // Fallback para stream local (antes de entrar no Daily)
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
    
    // Notify server of status change
    if (socketRef.current) {
      socketRef.current.emit('guest-update-status', {
        guestId,
        videoEnabled: !videoEnabled
      });
    }
  }, [guestId, videoEnabled]);
  
  // Toggle audio
  const toggleAudio = useCallback(async () => {
    // Se está conectado ao Daily.co, usar a API do Daily
    if (dailyCallRef.current) {
      const newState = !audioEnabled;
      try {
        await dailyCallRef.current.setLocalAudio(newState);
        setAudioEnabled(newState);
        console.log('[Daily] Audio toggled:', newState);
      } catch (err) {
        console.error('[Daily] Error toggling audio:', err);
      }
    } else if (streamRef.current) {
      // Fallback para stream local (antes de entrar no Daily)
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
    
    // Notify server of status change
    if (socketRef.current) {
      socketRef.current.emit('guest-update-status', {
        guestId,
        audioEnabled: !audioEnabled
      });
    }
  }, [guestId, audioEnabled]);
  
  // Connect to Green Room socket
  const connectToGreenRoom = useCallback(() => {
    const serverUrl = window.location.origin;
    const socket = io(serverUrl, {
      path: '/greenroom',
      transports: ['websocket', 'polling']
    });
    
    socketRef.current = socket;
    
    socket.on('connect', () => {
      console.log('[GreenRoom] Connected to server');
      
      // Join waiting room
      socket.emit('guest-join-waiting-room', {
        roomId,
        guestId,
        name,
        videoEnabled,
        audioEnabled
      });
    });
    
    socket.on('joined-waiting-room', (data: { success: boolean; position: number }) => {
      console.log('[GreenRoom] Joined waiting room, position:', data.position);
      setIsConnecting(false);
    });
    
    socket.on('guest-admitted', (data: { destination: 'preview' | 'program'; roomId: string; dailyRoomUrl?: string }) => {
      console.log('[GreenRoom] Admitted to:', data.destination, 'Daily URL:', data.dailyRoomUrl);
      setAdmittedDestination(data.destination);
      setWaitingMessage(`Você foi admitido! Entrando no ${data.destination === 'program' ? 'PROGRAMA AO VIVO' : 'PREVIEW'}...`);
      setStep('admitted');
      
      // Connect to Daily.co room using the URL from server
      if (data.dailyRoomUrl) {
        connectToDaily(data.dailyRoomUrl);
      } else {
        connectToDaily(`https://onnplay.daily.co/live-${data.roomId}`);
      }
    });
    
    socket.on('guest-rejected', () => {
      console.log('[GreenRoom] Rejected by admin');
      setWaitingMessage('O apresentador recusou sua entrada.');
      setTimeout(() => {
        setLocation('/');
      }, 3000);
    });
    
    socket.on('room-expired', (data: { message: string }) => {
      console.log('[GreenRoom] Room expired');
      setError(data.message || 'Este link de convite expirou.');
    });
    
    // Host control commands
    socket.on('host-mute-command', () => {
      console.log('[GreenRoom] Host requested mute');
      if (dailyCallRef.current) {
        dailyCallRef.current.setLocalAudio(false);
        setAudioEnabled(false);
      }
    });
    
    socket.on('host-toggle-camera-command', () => {
      console.log('[GreenRoom] Host requested toggle camera');
      if (dailyCallRef.current) {
        const newState = !videoEnabled;
        dailyCallRef.current.setLocalVideo(newState);
        setVideoEnabled(newState);
      }
    });
    
    socket.on('host-remove-command', (data: { message: string }) => {
      console.log('[GreenRoom] Host removed you from room');
      setWaitingMessage(data.message || 'Você foi removido da sala.');
      // Disconnect from Daily.co
      if (dailyCallRef.current) {
        dailyCallRef.current.leave();
        dailyCallRef.current.destroy();
        dailyCallRef.current = null;
      }
      // Redirect after showing message
      setTimeout(() => {
        setLocation('/');
      }, 3000);
    });
    
    socket.on('disconnect', () => {
      console.log('[GreenRoom] Disconnected from server');
    });
    
    socket.on('connect_error', (err: Error) => {
      console.error('[GreenRoom] Connection error:', err);
      setError('Erro ao conectar com o servidor. Tente novamente.');
      setIsConnecting(false);
    });
  }, [roomId, guestId, name, videoEnabled, audioEnabled, setLocation]);
  
  // Connect to Daily.co room
  const connectToDaily = useCallback(async (dailyRoomUrlOrId: string) => {
    try {
      if (!window.DailyIframe) {
        console.error('Daily.co SDK not loaded');
        return;
      }
      
      // Check if it's already a full URL or just an ID
      const dailyRoomUrl = dailyRoomUrlOrId.startsWith('https://') 
        ? dailyRoomUrlOrId 
        : `https://onnplay.daily.co/${dailyRoomUrlOrId}`;
      
      console.log('[Daily] Creating call object for:', dailyRoomUrl);
      
      const callObject = window.DailyIframe.createCallObject({
        audioSource: true,
        videoSource: true,
      });
      
      dailyCallRef.current = callObject;
      
      // Função para atualizar o preview local
      const updateLocalPreview = () => {
        const local = callObject.participants()?.local;
        if (local?.tracks?.video?.track && videoRef.current) {
          console.log('[Daily] Updating local video preview');
          const stream = new MediaStream([local.tracks.video.track]);
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.warn('[Daily] Autoplay blocked:', e));
        }
      };
      
      // Função para atualizar participantes remotos
      const updateRemoteParticipants = () => {
        const participants = callObject.participants();
        const remotes: Array<{id: string; name: string; videoTrack?: MediaStreamTrack; audioTrack?: MediaStreamTrack}> = [];
        
        Object.entries(participants).forEach(([id, p]: [string, any]) => {
          if (!p.local) {
            remotes.push({
              id,
              name: p.user_name || 'Participante',
              videoTrack: p.tracks?.video?.track,
              audioTrack: p.tracks?.audio?.track
            });
            
            // Reproduzir áudio do participante remoto
            if (p.tracks?.audio?.track) {
              let audioEl = remoteAudioRefs.current.get(id);
              if (!audioEl) {
                audioEl = document.createElement('audio');
                audioEl.autoplay = true;
                audioEl.id = `remote-audio-${id}`;
                document.body.appendChild(audioEl);
                remoteAudioRefs.current.set(id, audioEl);
              }
              const audioStream = new MediaStream([p.tracks.audio.track]);
              if (audioEl.srcObject !== audioStream) {
                audioEl.srcObject = audioStream;
                audioEl.play().catch(e => console.warn('[Daily] Audio autoplay blocked:', e));
              }
            }
          }
        });
        
        setRemoteParticipants(remotes);
        console.log('[Daily] Remote participants updated:', remotes.length);
      };
      
      // Listen for track events
      callObject.on('track-started', (event: any) => {
        console.log('[Daily] Track started:', event.participant?.user_name, event.track?.kind, 'local:', event.participant?.local);
        if (event.participant?.local && event.track?.kind === 'video') {
          // Pequeno delay para garantir que o track está pronto
          setTimeout(updateLocalPreview, 100);
        }
        // Atualizar participantes remotos quando um track começa
        if (!event.participant?.local) {
          setTimeout(updateRemoteParticipants, 100);
        }
      });
      
      callObject.on('participant-joined', (event: any) => {
        console.log('[Daily] Participant joined:', event.participant?.user_name);
        setTimeout(updateRemoteParticipants, 100);
      });
      
      callObject.on('participant-left', (event: any) => {
        console.log('[Daily] Participant left:', event.participant?.user_name);
        // Remover elemento de áudio do participante que saiu
        const audioEl = remoteAudioRefs.current.get(event.participant?.session_id);
        if (audioEl) {
          audioEl.srcObject = null;
          audioEl.remove();
          remoteAudioRefs.current.delete(event.participant?.session_id);
        }
        setTimeout(updateRemoteParticipants, 100);
      });
      
      callObject.on('participant-updated', (event: any) => {
        if (event.participant?.local) {
          console.log('[Daily] Local participant updated');
          updateLocalPreview();
        } else {
          updateRemoteParticipants();
        }
      });
      
      callObject.on('joined-meeting', () => {
        console.log('[Daily] Successfully joined meeting');
        // Atualizar preview após entrar
        setTimeout(updateLocalPreview, 500);
        setTimeout(updateRemoteParticipants, 500);
      });
      
      // Join the room
      await callObject.join({
        url: dailyRoomUrl,
        userName: name,
      });
      
      console.log('[Daily] Joined room:', dailyRoomUrl);
      
      // Tentar atualizar o preview imediatamente
      updateLocalPreview();
      
      // E novamente após um delay para garantir
      setTimeout(updateLocalPreview, 1000);
      
      // Update step to show participant view
      setStep('connected');
      setWaitingMessage('Você está na live!');
      
      // Register as admitted guest to receive host commands
      // Get the Daily session ID to link with GreenRoom
      const dailyParticipants = callObject.participants();
      const localParticipant = dailyParticipants?.local;
      const dailySessionId = localParticipant?.session_id || null;
      
      if (socketRef.current) {
        socketRef.current.emit('guest-register-admitted', {
          guestId,
          roomId,
          name,
          dailySessionId
        });
        console.log('[GreenRoom] Registered as admitted guest with dailySessionId:', dailySessionId);
      }
      
    } catch (err) {
      console.error('[Daily] Error joining room:', err);
      setError('Erro ao entrar na sala. Tente novamente.');
    }
  }, [name, videoEnabled, audioEnabled, guestId, roomId]);
  
  // Handle enter room
  const handleEnterRoom = useCallback(() => {
    if (!name.trim()) {
      setError('Por favor, digite seu nome');
      return;
    }
    
    setIsConnecting(true);
    setError(null);
    setStep('waiting');
    
    // Connect to Green Room
    connectToGreenRoom();
  }, [name, connectToGreenRoom]);
  
  // Handle leave room
  const handleLeaveRoom = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    if (dailyCallRef.current) {
      dailyCallRef.current.leave();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setLocation('/');
  }, [setLocation]);
  
  // Render entry step
  if (step === 'entry') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 max-w-md w-full">
          {/* Logo */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">OnnPlay Studio</h1>
            <p className="text-gray-400">Você foi convidado para uma transmissão</p>
          </div>
          
          {/* Camera Preview */}
          <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden mb-6">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${!videoEnabled ? 'hidden' : ''}`}
            />
            {!videoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-purple-600 flex items-center justify-center">
                  <span className="text-4xl text-white font-bold">
                    {name ? name.charAt(0).toUpperCase() : '?'}
                  </span>
                </div>
              </div>
            )}
            
            {/* Camera/Mic Controls */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full transition-colors ${
                  videoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                {videoEnabled ? <Camera className="w-5 h-5 text-white" /> : <CameraOff className="w-5 h-5 text-white" />}
              </button>
              <button
                onClick={toggleAudio}
                className={`p-3 rounded-full transition-colors ${
                  audioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                {audioEnabled ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-white" />}
              </button>
            </div>
            
            {error && (
              <div className="absolute top-4 left-4 right-4 bg-red-600/90 text-white text-sm p-2 rounded">
                {error}
              </div>
            )}
          </div>
          
          {/* Name Input */}
          <div className="mb-6">
            <label className="block text-gray-400 text-sm mb-2">Seu nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite seu nome"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              onKeyDown={(e) => e.key === 'Enter' && handleEnterRoom()}
            />
          </div>
          
          {/* Enter Button */}
          <button
            onClick={handleEnterRoom}
            disabled={isConnecting || !name.trim()}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Conectando...
              </>
            ) : (
              'Entrar na Sala'
            )}
          </button>
          
          {/* Room Info */}
          <p className="text-center text-gray-500 text-sm mt-4">
            Sala: {roomId || 'Não especificada'}
          </p>
        </div>
      </div>
    );
  }
  
  // Render waiting step
  if (step === 'waiting' || step === 'admitted') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 max-w-lg w-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
                <span className="text-lg text-white font-bold">
                  {name.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-white font-medium">{name}</span>
            </div>
            <button
              onClick={handleLeaveRoom}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Sair da sala"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
          
          {/* Camera Preview */}
          <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden mb-6">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${!videoEnabled ? 'hidden' : ''}`}
            />
            {!videoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-purple-600 flex items-center justify-center">
                  <span className="text-4xl text-white font-bold">
                    {name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
            )}
            
            {/* Camera/Mic Controls */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full transition-colors ${
                  videoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                {videoEnabled ? <Camera className="w-5 h-5 text-white" /> : <CameraOff className="w-5 h-5 text-white" />}
              </button>
              <button
                onClick={toggleAudio}
                className={`p-3 rounded-full transition-colors ${
                  audioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                {audioEnabled ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-white" />}
              </button>
            </div>
          </div>
          
          {/* Waiting Message */}
          <div className="text-center">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 ${
              step === 'admitted' ? 'bg-green-600/20 text-green-400' : 'bg-purple-600/20 text-purple-400'
            }`}>
              {step === 'waiting' && (
                <>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>Sala de Espera</span>
                </>
              )}
              {step === 'admitted' && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Entrando...</span>
                </>
              )}
            </div>
            
            <p className="text-gray-400">{waitingMessage}</p>
            
            {step === 'admitted' && admittedDestination && (
              <p className="text-green-400 mt-2 font-medium">
                Destino: {admittedDestination === 'program' ? 'PROGRAMA AO VIVO' : 'PREVIEW'}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // Render connected step - participant is in the live
  if (step === 'connected') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
                <span className="text-lg text-white font-bold">
                  {name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <span className="text-white font-medium">{name}</span>
                <div className="flex items-center gap-1 text-green-400 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span>Ao Vivo</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                if (dailyCallRef.current) {
                  dailyCallRef.current.leave();
                }
                setLocation('/');
              }}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
          
          {/* Video Preview - Olho de preview igual ao YOU do Studio */}
          <div className="relative aspect-video bg-gray-900 rounded-xl mb-6 border-2 border-green-500" style={{ overflow: 'hidden' }}>
            {/* Label YOU igual ao Studio */}
            <div className="absolute top-3 left-3 px-2 py-1 bg-blue-600 rounded text-xs text-white font-bold z-20">
              YOU
            </div>
            
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)', display: 'block' }}
            />
            
            {/* Nome do participante - canto inferior esquerdo */}
            <div className="absolute bottom-3 left-3 z-10">
              <span className="text-white text-sm font-medium bg-black/50 px-2 py-1 rounded">{name}</span>
            </div>
            
            {/* Indicadores de status - canto inferior direito */}
            <div className="absolute bottom-3 right-3 flex gap-1 z-10">
              {!audioEnabled && <div className="bg-red-600 p-1 rounded"><MicOff className="w-4 h-4 text-white" /></div>}
              {!videoEnabled && <div className="bg-red-600 p-1 rounded"><CameraOff className="w-4 h-4 text-white" /></div>}
            </div>
          </div>
          
          {/* Controls - fora do vídeo */}
          <div className="flex justify-center gap-3 mb-6">
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-full transition-colors ${
                videoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-500'
              }`}
            >
              {videoEnabled ? <Camera className="w-5 h-5 text-white" /> : <CameraOff className="w-5 h-5 text-white" />}
            </button>
            <button
              onClick={toggleAudio}
              className={`p-3 rounded-full transition-colors ${
                audioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-500'
              }`}
            >
              {audioEnabled ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-white" />}
            </button>
          </div>
          
          {/* Outros Participantes */}
          {remoteParticipants.length > 0 && (
            <div className="mb-6">
              <h3 className="text-white text-sm font-medium mb-3">Outros na live ({remoteParticipants.length})</h3>
              <div className="grid grid-cols-2 gap-3">
                {remoteParticipants.map((participant) => (
                  <div key={participant.id} className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                    {participant.videoTrack ? (
                      <video
                        ref={(el) => {
                          if (el && participant.videoTrack) {
                            try {
                              const stream = new MediaStream([participant.videoTrack]);
                              // Only update if srcObject is different
                              const currentSrc = el.srcObject as MediaStream | null;
                              if (!currentSrc || currentSrc.id !== stream.id) {
                                el.srcObject = stream;
                                el.play().catch(e => console.warn('Video autoplay blocked:', e));
                              }
                            } catch (e) {
                              console.warn('Error setting video srcObject:', e);
                            }
                          }
                        }}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center">
                          <span className="text-xl text-white font-bold">
                            {participant.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <span className="text-white text-xs">{participant.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Status */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-600/20 text-green-400 mb-4">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span>Você está na live!</span>
            </div>
            
            <p className="text-gray-400">Seu vídeo e áudio estão sendo transmitidos para o apresentador.</p>
            <p className="text-gray-500 text-sm mt-2">Use os botões acima para controlar sua câmera e microfone.</p>
          </div>
        </div>
      </div>
    );
  }
  
  return null;
};

export default JoinRoom;
