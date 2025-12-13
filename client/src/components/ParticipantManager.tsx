import { useState } from 'react';
import { X, UserPlus, Mic, MicOff, Video, VideoOff, Volume2, VolumeX, Pin, Crown, UserX, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface Participant {
  id: string;
  name: string;
  email: string;
  avatar: string;
  isHost: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeaking: boolean;
  isPinned: boolean;
  audioLevel: number;
  joinedAt: Date;
  status: 'connected' | 'connecting' | 'disconnected';
}

interface ParticipantManagerProps {
  isOpen: boolean;
  onClose: () => void;
  maxParticipants?: number;
}

export default function ParticipantManager({ isOpen, onClose, maxParticipants = 20 }: ParticipantManagerProps) {
  const [participants, setParticipants] = useState<Participant[]>([
    {
      id: 'host-1',
      name: 'Você (Host)',
      email: 'host@onnplay.com',
      avatar: '👤',
      isHost: true,
      isMuted: false,
      isVideoOff: false,
      isSpeaking: true,
      isPinned: false,
      audioLevel: 75,
      joinedAt: new Date(),
      status: 'connected',
    },
  ]);

  const [inviteEmail, setInviteEmail] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);

  if (!isOpen) return null;

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      toast.error('Digite um email válido');
      return;
    }

    if (participants.length >= maxParticipants) {
      toast.error(`Limite de ${maxParticipants} participantes atingido`);
      return;
    }

    // Simulate invite
    const newParticipant: Participant = {
      id: `participant-${Date.now()}`,
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      avatar: '👤',
      isHost: false,
      isMuted: true,
      isVideoOff: true,
      isSpeaking: false,
      isPinned: false,
      audioLevel: 0,
      joinedAt: new Date(),
      status: 'connecting',
    };

    setParticipants((prev) => [...prev, newParticipant]);
    setInviteEmail('');
    setShowInviteForm(false);

    toast.success('Convite enviado!', {
      description: `Email enviado para ${inviteEmail}`,
    });

    // Simulate connection after 2 seconds
    setTimeout(() => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === newParticipant.id ? { ...p, status: 'connected' as const } : p
        )
      );
      toast.info(`${newParticipant.name} entrou na sala`);
    }, 2000);
  };

  const toggleMute = (id: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isMuted: !p.isMuted } : p))
    );

    const participant = participants.find((p) => p.id === id);
    toast.info(`${participant?.name} ${participant?.isMuted ? 'desmutado' : 'mutado'}`);
  };

  const toggleVideo = (id: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isVideoOff: !p.isVideoOff } : p))
    );

    const participant = participants.find((p) => p.id === id);
    toast.info(`Vídeo de ${participant?.name} ${participant?.isVideoOff ? 'ativado' : 'desativado'}`);
  };

  const togglePin = (id: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isPinned: !p.isPinned } : p))
    );

    const participant = participants.find((p) => p.id === id);
    toast.info(`${participant?.name} ${participant?.isPinned ? 'desfixado' : 'fixado'}`);
  };

  const removeParticipant = (id: string) => {
    const participant = participants.find((p) => p.id === id);
    if (participant?.isHost) {
      toast.error('Não é possível remover o host');
      return;
    }

    setParticipants((prev) => prev.filter((p) => p.id !== id));
    toast.success(`${participant?.name} removido da sala`);
  };

  const makeHost = (id: string) => {
    setParticipants((prev) =>
      prev.map((p) => ({ ...p, isHost: p.id === id }))
    );

    const participant = participants.find((p) => p.id === id);
    toast.success(`${participant?.name} agora é o host`);
  };

  const connectedCount = participants.filter((p) => p.status === 'connected').length;
  const speakingCount = participants.filter((p) => p.isSpeaking).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-full max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <UserPlus className="text-orange-500" size={24} />
              Gerenciamento de Participantes
            </h2>
            <div className="text-sm text-gray-400 mt-1">
              {connectedCount} de {maxParticipants} participantes conectados
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-800">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-500">{connectedCount}</div>
            <div className="text-xs text-gray-400">Conectados</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">{speakingCount}</div>
            <div className="text-xs text-gray-400">Falando</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500">
              {maxParticipants - connectedCount}
            </div>
            <div className="text-xs text-gray-400">Vagas Restantes</div>
          </div>
        </div>

        {/* Invite Button */}
        <div className="p-4 border-b border-gray-700">
          {!showInviteForm ? (
            <button
              onClick={() => setShowInviteForm(true)}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <UserPlus size={20} />
              Convidar Participante
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Digite o email do convidado"
                className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                autoFocus
              />
              <button
                onClick={handleInvite}
                className="bg-orange-600 hover:bg-orange-700 text-white px-6 rounded-lg transition-colors"
              >
                Enviar
              </button>
              <button
                onClick={() => {
                  setShowInviteForm(false);
                  setInviteEmail('');
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

        {/* Participants List */}
        <div className="p-4 space-y-2 max-h-[50vh] overflow-y-auto">
          {participants.map((participant) => (
            <div
              key={participant.id}
              className={`${
                participant.isPinned ? 'bg-orange-900 bg-opacity-30 border-orange-500' : 'bg-gray-800'
              } border ${
                participant.status === 'connecting' ? 'border-yellow-500' : 'border-gray-700'
              } rounded-lg p-3 flex items-center justify-between`}
            >
              {/* Left: Avatar + Info */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center text-2xl">
                    {participant.avatar}
                  </div>
                  {participant.isSpeaking && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900 animate-pulse"></div>
                  )}
                </div>
                <div>
                  <div className="text-white font-semibold flex items-center gap-2">
                    {participant.name}
                    {participant.isHost && (
                      <Crown className="text-yellow-500" size={16} title="Host" />
                    )}
                    {participant.isPinned && (
                      <Pin className="text-orange-500" size={16} title="Fixado" />
                    )}
                  </div>
                  <div className="text-xs text-gray-400">{participant.email}</div>
                  <div className="text-xs text-gray-500">
                    {participant.status === 'connecting' ? (
                      <span className="text-yellow-500">Conectando...</span>
                    ) : (
                      `Entrou ${participant.joinedAt.toLocaleTimeString()}`
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Controls */}
              <div className="flex items-center gap-2">
                {/* Audio Level */}
                {!participant.isMuted && (
                  <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        participant.audioLevel > 80
                          ? 'bg-red-500'
                          : participant.audioLevel > 50
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      } transition-all`}
                      style={{ width: `${participant.audioLevel}%` }}
                    ></div>
                  </div>
                )}

                {/* Mute Button */}
                <button
                  onClick={() => toggleMute(participant.id)}
                  className={`${
                    participant.isMuted ? 'bg-red-600' : 'bg-gray-700'
                  } hover:bg-gray-600 text-white p-2 rounded transition-colors`}
                  title={participant.isMuted ? 'Desmutar' : 'Mutar'}
                >
                  {participant.isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                </button>

                {/* Video Button */}
                <button
                  onClick={() => toggleVideo(participant.id)}
                  className={`${
                    participant.isVideoOff ? 'bg-red-600' : 'bg-gray-700'
                  } hover:bg-gray-600 text-white p-2 rounded transition-colors`}
                  title={participant.isVideoOff ? 'Ativar vídeo' : 'Desativar vídeo'}
                >
                  {participant.isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
                </button>

                {/* Pin Button */}
                <button
                  onClick={() => togglePin(participant.id)}
                  className={`${
                    participant.isPinned ? 'bg-orange-600' : 'bg-gray-700'
                  } hover:bg-gray-600 text-white p-2 rounded transition-colors`}
                  title={participant.isPinned ? 'Desfixar' : 'Fixar'}
                >
                  <Pin size={18} />
                </button>

                {/* Make Host Button (only for non-hosts) */}
                {!participant.isHost && (
                  <button
                    onClick={() => makeHost(participant.id)}
                    className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded transition-colors"
                    title="Tornar host"
                  >
                    <Crown size={18} />
                  </button>
                )}

                {/* Remove Button (only for non-hosts) */}
                {!participant.isHost && (
                  <button
                    onClick={() => removeParticipant(participant.id)}
                    className="bg-red-600 hover:bg-red-700 text-white p-2 rounded transition-colors"
                    title="Remover"
                  >
                    <UserX size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            💡 Dica: Use o botão de fixar para destacar participantes importantes
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors font-semibold"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
