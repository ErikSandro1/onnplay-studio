import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  Users, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Check, 
  X, 
  Clock,
  Volume2,
  VolumeX,
  Bell,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface WaitingGuest {
  id: string;
  name: string;
  email?: string;
  joinedAt: Date;
  videoEnabled: boolean;
  audioEnabled: boolean;
}

interface GreenRoomProps {
  isOpen: boolean;
  onClose: () => void;
  onAdmitGuest: (guestId: string, destination: 'preview' | 'program', dailyRoomUrl?: string) => void;
  onRejectGuest: (guestId: string) => void;
  roomId?: string;
}

export default function GreenRoom({ 
  isOpen, 
  onClose, 
  onAdmitGuest, 
  onRejectGuest,
  roomId = 'default-room'
}: GreenRoomProps) {
  const [waitingGuests, setWaitingGuests] = useState<WaitingGuest[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [previewVolume, setPreviewVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);

  // Connect to Green Room socket
  useEffect(() => {
    if (isOpen && !socketRef.current) {
      const socket = io(window.location.origin, {
        path: '/greenroom',
      });

      socket.on('connect', () => {
        console.log('[GreenRoom Admin] Connected to server');
        setIsConnected(true);
        // Join as admin
        socket.emit('admin-join-room', { roomId });
      });

      socket.on('disconnect', () => {
        console.log('[GreenRoom Admin] Disconnected from server');
        setIsConnected(false);
      });

      // Receive initial list of waiting guests
      socket.on('waiting-guests-list', (data: { guests: WaitingGuest[] }) => {
        console.log('[GreenRoom Admin] Received waiting guests:', data.guests);
        setWaitingGuests(data.guests.map(g => ({
          ...g,
          joinedAt: new Date(g.joinedAt)
        })));
      });

      // New guest joined
      socket.on('guest-joined', (data: { guest: WaitingGuest }) => {
        console.log('[GreenRoom Admin] Guest joined:', data.guest);
        setWaitingGuests(prev => [...prev, {
          ...data.guest,
          joinedAt: new Date(data.guest.joinedAt)
        }]);
      });

      // Guest left
      socket.on('guest-left', (data: { guestId: string }) => {
        console.log('[GreenRoom Admin] Guest left:', data.guestId);
        setWaitingGuests(prev => prev.filter(g => g.id !== data.guestId));
        if (selectedGuest === data.guestId) {
          setSelectedGuest(null);
        }
      });

      // Guest status updated
      socket.on('guest-status-updated', (data: { 
        guestId: string; 
        videoEnabled: boolean; 
        audioEnabled: boolean 
      }) => {
        setWaitingGuests(prev => prev.map(g => 
          g.id === data.guestId 
            ? { ...g, videoEnabled: data.videoEnabled, audioEnabled: data.audioEnabled }
            : g
        ));
      });

      // Guest admitted confirmation
      socket.on('guest-admitted-confirm', (data: { guestId: string; destination: string; dailyRoomUrl?: string }) => {
        console.log('[GreenRoom Admin] Guest admitted:', data);
        setWaitingGuests(prev => prev.filter(g => g.id !== data.guestId));
        if (selectedGuest === data.guestId) {
          setSelectedGuest(null);
        }
        // Notify parent component with Daily room URL
        if (data.dailyRoomUrl) {
          onAdmitGuest(data.guestId, data.destination as 'preview' | 'program', data.dailyRoomUrl);
        }
      });

      // Guest rejected confirmation
      socket.on('guest-rejected-confirm', (data: { guestId: string }) => {
        console.log('[GreenRoom Admin] Guest rejected:', data);
        setWaitingGuests(prev => prev.filter(g => g.id !== data.guestId));
        if (selectedGuest === data.guestId) {
          setSelectedGuest(null);
        }
      });

      socketRef.current = socket;
    }

    return () => {
      if (socketRef.current && !isOpen) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isOpen, roomId]);

  // Update wait times every second
  useEffect(() => {
    const interval = setInterval(() => {
      setWaitingGuests(prev => [...prev]);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format time waiting
  const formatWaitTime = (joinedAt: Date) => {
    const seconds = Math.floor((Date.now() - new Date(joinedAt).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const handleAdmit = (guestId: string, destination: 'preview' | 'program') => {
    if (socketRef.current) {
      socketRef.current.emit('admin-admit-guest', { roomId, guestId, destination });
    }
    onAdmitGuest(guestId, destination);
  };

  const handleReject = (guestId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('admin-reject-guest', { roomId, guestId });
    }
    onRejectGuest(guestId);
  };

  if (!isOpen) return null;

  const selectedGuestData = waitingGuests.find(g => g.id === selectedGuest);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div 
        className={`bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden transition-all duration-300 ${
          isMinimized ? 'w-80 h-16' : 'w-[900px] max-h-[80vh]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-white" />
            <h2 className="text-lg font-bold text-white">Sala de Espera (Green Room)</h2>
            {waitingGuests.length > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                {waitingGuests.length} aguardando
              </span>
            )}
            {/* Connection status */}
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} 
                 title={isConnected ? 'Conectado' : 'Desconectado'} />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              {isMinimized ? <ChevronUp className="w-5 h-5 text-white" /> : <ChevronDown className="w-5 h-5 text-white" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <div className="flex h-[500px]">
            {/* Guest List */}
            <div className="w-72 border-r border-gray-700 overflow-y-auto">
              <div className="p-3 border-b border-gray-700">
                <h3 className="text-sm font-medium text-gray-400">Convidados Aguardando</h3>
              </div>
              
              {waitingGuests.length === 0 ? (
                <div className="p-6 text-center">
                  <Users className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                  <p className="text-gray-400 text-sm">Nenhum convidado aguardando</p>
                  <p className="text-gray-500 text-xs mt-1">
                    Compartilhe o link de convite para que convidados entrem na sala de espera
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {waitingGuests.map((guest) => (
                    <div
                      key={guest.id}
                      onClick={() => setSelectedGuest(guest.id)}
                      className={`p-3 cursor-pointer transition-colors ${
                        selectedGuest === guest.id 
                          ? 'bg-cyan-500/20 border-l-2 border-cyan-500' 
                          : 'hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold">
                            {guest.name.charAt(0).toUpperCase()}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900 ${
                            guest.videoEnabled ? 'bg-green-500' : 'bg-yellow-500'
                          }`} />
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{guest.name}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span>Aguardando {formatWaitTime(guest.joinedAt)}</span>
                          </div>
                        </div>
                        
                        {/* Device status */}
                        <div className="flex gap-1">
                          {guest.videoEnabled ? (
                            <Video className="w-4 h-4 text-green-400" />
                          ) : (
                            <VideoOff className="w-4 h-4 text-red-400" />
                          )}
                          {guest.audioEnabled ? (
                            <Mic className="w-4 h-4 text-green-400" />
                          ) : (
                            <MicOff className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preview Area */}
            <div className="flex-1 flex flex-col">
              {selectedGuestData ? (
                <>
                  {/* Video Preview */}
                  <div className="flex-1 bg-gray-950 relative">
                    {selectedGuestData.videoEnabled ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-4xl font-bold mb-4">
                              {selectedGuestData.name.charAt(0).toUpperCase()}
                            </div>
                            <p className="text-white text-lg font-medium">{selectedGuestData.name}</p>
                            <p className="text-gray-400 text-sm mt-1">Preview do vídeo</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                        <div className="text-center">
                          <VideoOff className="w-16 h-16 mx-auto text-gray-600 mb-3" />
                          <p className="text-gray-400">Câmera desligada</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Guest name overlay */}
                    <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/70 rounded-lg">
                      <p className="text-white font-medium">{selectedGuestData.name}</p>
                    </div>
                    
                    {/* Audio indicator */}
                    <div className="absolute bottom-4 right-4 flex items-center gap-2">
                      {selectedGuestData.audioEnabled ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/50 rounded-lg">
                          <Mic className="w-4 h-4 text-green-400" />
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(i => (
                              <div 
                                key={i} 
                                className="w-1 bg-green-400 rounded-full animate-pulse"
                                style={{ 
                                  height: `${Math.random() * 12 + 4}px`,
                                  animationDelay: `${i * 0.1}s`
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/50 rounded-lg">
                          <MicOff className="w-4 h-4 text-red-400" />
                          <span className="text-red-400 text-sm">Mudo</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="p-4 bg-gray-800 border-t border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-white font-medium">{selectedGuestData.name}</h3>
                        {selectedGuestData.email && (
                          <p className="text-gray-400 text-sm">{selectedGuestData.email}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span>Aguardando há {formatWaitTime(selectedGuestData.joinedAt)}</span>
                      </div>
                    </div>

                    {/* Volume control */}
                    <div className="flex items-center gap-3 mb-4 p-3 bg-gray-900 rounded-lg">
                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        className={`p-2 rounded-lg transition-colors ${
                          isMuted ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-white'
                        }`}
                      >
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={isMuted ? 0 : previewVolume}
                        onChange={(e) => setPreviewVolume(Number(e.target.value))}
                        className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        disabled={isMuted}
                      />
                      <span className="text-gray-400 text-sm w-10 text-right">
                        {isMuted ? '0' : previewVolume}%
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleReject(selectedGuestData.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                        <span>Recusar</span>
                      </button>
                      <button
                        onClick={() => handleAdmit(selectedGuestData.id, 'preview')}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 text-yellow-400 rounded-lg transition-colors"
                      >
                        <Video className="w-5 h-5" />
                        <span>Enviar p/ PREVIEW</span>
                      </button>
                      <button
                        onClick={() => handleAdmit(selectedGuestData.id, 'program')}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium"
                      >
                        <Check className="w-5 h-5" />
                        <span>Trazer p/ LIVE</span>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-gray-950">
                  <div className="text-center">
                    <Users className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                    <p className="text-gray-400 text-lg">Selecione um convidado</p>
                    <p className="text-gray-500 text-sm mt-1">
                      Clique em um convidado na lista para ver o preview
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        {!isMinimized && waitingGuests.length > 0 && (
          <div className="px-4 py-3 bg-gray-800 border-t border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Bell className="w-4 h-4" />
              <span>Notificações de novos convidados ativadas</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  waitingGuests.forEach(g => handleAdmit(g.id, 'preview'));
                }}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
              >
                Admitir todos no Preview
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
