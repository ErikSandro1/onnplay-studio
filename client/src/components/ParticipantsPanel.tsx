import { useState, useEffect } from 'react';
import { Users, Mic, MicOff, Video, VideoOff, Trash2, Crown, X } from 'lucide-react';
import { toast } from 'sonner';

interface Participant {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role: 'host' | 'guest';
  audio_enabled: boolean;
  video_enabled: boolean;
  joined_at: Date;
}

interface ParticipantsPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
  onParticipantRemove?: (participantId: string) => void;
}

const MOCK_PARTICIPANTS: Participant[] = [
  {
    id: '1',
    name: 'Você (Host)',
    email: 'host@onnplay.com',
    role: 'host',
    audio_enabled: true,
    video_enabled: true,
    joined_at: new Date(Date.now() - 600000),
  },
  {
    id: '2',
    name: 'João Silva',
    email: 'joao@example.com',
    role: 'guest',
    audio_enabled: true,
    video_enabled: true,
    joined_at: new Date(Date.now() - 300000),
  },
  {
    id: '3',
    name: 'Maria Santos',
    email: 'maria@example.com',
    role: 'guest',
    audio_enabled: true,
    video_enabled: false,
    joined_at: new Date(Date.now() - 120000),
  },
];

export default function ParticipantsPanel({
  isOpen = false,
  onClose,
  onParticipantRemove,
}: ParticipantsPanelProps) {
  const [participants, setParticipants] = useState<Participant[]>(MOCK_PARTICIPANTS);

  const formatJoinTime = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'Agora';
    if (diff < 3600) return `${Math.floor(diff / 60)}m atrás`;
    return `${Math.floor(diff / 3600)}h atrás`;
  };

  const handleToggleAudio = (participantId: string) => {
    setParticipants(
      participants.map(p =>
        p.id === participantId ? { ...p, audio_enabled: !p.audio_enabled } : p
      )
    );
    toast.info('Áudio alterado');
  };

  const handleToggleVideo = (participantId: string) => {
    setParticipants(
      participants.map(p =>
        p.id === participantId ? { ...p, video_enabled: !p.video_enabled } : p
      )
    );
    toast.info('Vídeo alterado');
  };

  const handleRemoveParticipant = (participantId: string, name: string) => {
    setParticipants(participants.filter(p => p.id !== participantId));
    onParticipantRemove?.(participantId);
    toast.success(`${name} foi removido da sala`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 sticky top-0 bg-gray-800">
          <div className="flex items-center gap-2">
            <Users size={24} className="text-orange-500" />
            <div>
              <h2 className="text-lg font-bold text-white">Participantes</h2>
              <p className="text-xs text-gray-400">{participants.length} pessoa{participants.length !== 1 ? 's' : ''} na sala</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Participants List */}
        <div className="divide-y divide-gray-700">
          {participants.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Users size={32} className="mx-auto mb-2 opacity-50" />
              <p>Nenhum participante na sala</p>
            </div>
          ) : (
            participants.map(participant => (
              <div
                key={participant.id}
                className="p-4 hover:bg-gray-700 hover:bg-opacity-30 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Participant Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-white truncate">{participant.name}</p>
                      {participant.role === 'host' && (
                        <Crown size={14} className="text-orange-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{participant.email}</p>
                    <p className="text-xs text-gray-600 mt-1">Entrou {formatJoinTime(participant.joined_at)}</p>
                  </div>

                  {/* Status Indicators */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex gap-1">
                      {participant.audio_enabled ? (
                        <div className="w-8 h-8 bg-green-900 bg-opacity-30 border border-green-700 rounded flex items-center justify-center">
                          <Mic size={14} className="text-green-400" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-red-900 bg-opacity-30 border border-red-700 rounded flex items-center justify-center">
                          <MicOff size={14} className="text-red-400" />
                        </div>
                      )}

                      {participant.video_enabled ? (
                        <div className="w-8 h-8 bg-green-900 bg-opacity-30 border border-green-700 rounded flex items-center justify-center">
                          <Video size={14} className="text-green-400" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-red-900 bg-opacity-30 border border-red-700 rounded flex items-center justify-center">
                          <VideoOff size={14} className="text-red-400" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Controls (only for host) */}
                {participant.role === 'guest' && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleToggleAudio(participant.id)}
                      className={`flex-1 px-3 py-1.5 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${
                        participant.audio_enabled
                          ? 'bg-green-900 bg-opacity-30 text-green-400 hover:bg-opacity-50'
                          : 'bg-red-900 bg-opacity-30 text-red-400 hover:bg-opacity-50'
                      }`}
                    >
                      {participant.audio_enabled ? (
                        <>
                          <Mic size={12} />
                          Mutar
                        </>
                      ) : (
                        <>
                          <MicOff size={12} />
                          Desmutar
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleToggleVideo(participant.id)}
                      className={`flex-1 px-3 py-1.5 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${
                        participant.video_enabled
                          ? 'bg-green-900 bg-opacity-30 text-green-400 hover:bg-opacity-50'
                          : 'bg-red-900 bg-opacity-30 text-red-400 hover:bg-opacity-50'
                      }`}
                    >
                      {participant.video_enabled ? (
                        <>
                          <Video size={12} />
                          Desativar
                        </>
                      ) : (
                        <>
                          <VideoOff size={12} />
                          Ativar
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleRemoveParticipant(participant.id, participant.name)}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                    >
                      <Trash2 size={12} />
                      Remover
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Statistics */}
        {participants.length > 0 && (
          <div className="border-t border-gray-700 p-4 bg-gray-900 grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-lg font-bold text-orange-500">{participants.length}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Com Áudio</p>
              <p className="text-lg font-bold text-green-500">
                {participants.filter(p => p.audio_enabled).length}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Com Vídeo</p>
              <p className="text-lg font-bold text-green-500">
                {participants.filter(p => p.video_enabled).length}
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-700 p-4 flex justify-end gap-2 bg-gray-800 sticky bottom-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded font-semibold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
