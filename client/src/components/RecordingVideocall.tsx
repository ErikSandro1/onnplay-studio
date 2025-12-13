import { useState, useEffect } from 'react';
import { Video, Square, Download, Trash2, Clock, HardDrive } from 'lucide-react';
import { toast } from 'sonner';

interface Recording {
  id: string;
  name: string;
  duration: number;
  size: string;
  date: Date;
  status: 'recording' | 'completed' | 'processing';
  participants: string[];
}

interface RecordingVideocallProps {
  isOpen?: boolean;
  onClose?: () => void;
  isLive?: boolean;
}

const MOCK_RECORDINGS: Recording[] = [
  {
    id: '1',
    name: 'Transmissão 04/12/2024 - 17:00',
    duration: 3600,
    size: '2.5 GB',
    date: new Date(Date.now() - 86400000),
    status: 'completed',
    participants: ['João Silva', 'Maria Santos', 'Pedro Costa'],
  },
  {
    id: '2',
    name: 'Transmissão 03/12/2024 - 19:30',
    duration: 5400,
    size: '3.8 GB',
    date: new Date(Date.now() - 172800000),
    status: 'completed',
    participants: ['João Silva', 'Ana Costa'],
  },
];

export default function RecordingVideocall({
  isOpen = false,
  onClose,
  isLive = false,
}: RecordingVideocallProps) {
  const [recordings, setRecordings] = useState<Recording[]>(MOCK_RECORDINGS);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [autoRecord, setAutoRecord] = useState(true);

  // Update recording time
  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    toast.success('Gravação iniciada!');
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    const newRecording: Recording = {
      id: Date.now().toString(),
      name: `Transmissão ${new Date().toLocaleDateString('pt-BR')} - ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      duration: recordingTime,
      size: `${(recordingTime * 0.7 / 1024).toFixed(2)} GB`,
      date: new Date(),
      status: 'processing',
      participants: ['Você', 'João Silva'],
    };

    setRecordings([newRecording, ...recordings]);
    toast.success('Gravação salva!');
  };

  const handleDownloadRecording = (recordingId: string) => {
    const recording = recordings.find(r => r.id === recordingId);
    if (recording) {
      toast.success(`Baixando: ${recording.name}`);
    }
  };

  const handleDeleteRecording = (recordingId: string) => {
    setRecordings(recordings.filter(r => r.id !== recordingId));
    toast.success('Gravação deletada');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 sticky top-0 bg-gray-800">
          <div className="flex items-center gap-2">
            <Video size={24} className="text-orange-500" />
            <div>
              <h2 className="text-lg font-bold text-white">Gravação de Videochamadas</h2>
              <p className="text-xs text-gray-400">{recordings.length} gravações</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <Square size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Recording Controls */}
        <div className="border-b border-gray-700 p-4 bg-gray-900">
          <div className="space-y-3">
            {/* Recording Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-600'}`}></div>
                <p className="text-sm font-semibold text-white">
                  {isRecording ? 'Gravando...' : 'Parado'}
                </p>
                {isRecording && (
                  <p className="text-sm font-mono text-red-400">{formatDuration(recordingTime)}</p>
                )}
              </div>

              {/* Recording Buttons */}
              <div className="flex gap-2">
                {!isRecording ? (
                  <button
                    onClick={handleStartRecording}
                    disabled={!isLive}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-600 text-white rounded font-semibold transition-colors flex items-center gap-2"
                  >
                    <Video size={16} />
                    Iniciar Gravação
                  </button>
                ) : (
                  <button
                    onClick={handleStopRecording}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded font-semibold transition-colors flex items-center gap-2"
                  >
                    <Square size={16} />
                    Parar Gravação
                  </button>
                )}
              </div>
            </div>

            {/* Auto Record Toggle */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-700">
              <input
                type="checkbox"
                id="autoRecord"
                checked={autoRecord}
                onChange={(e) => setAutoRecord(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 text-orange-500"
              />
              <label htmlFor="autoRecord" className="text-sm text-gray-300">
                Gravar automaticamente quando a transmissão começar
              </label>
            </div>

            {!isLive && (
              <p className="text-xs text-yellow-600 bg-yellow-900 bg-opacity-30 border border-yellow-700 rounded p-2">
                ⚠️ Você precisa estar ao vivo para gravar videochamadas
              </p>
            )}
          </div>
        </div>

        {/* Recordings List */}
        <div className="flex-1 overflow-y-auto p-4">
          {recordings.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <HardDrive size={32} className="mx-auto mb-2 opacity-50" />
                <p>Nenhuma gravação ainda</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {recordings.map(recording => (
                <div
                  key={recording.id}
                  className="p-3 bg-gray-900 border border-gray-700 rounded hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{recording.name}</p>
                      <div className="flex gap-4 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatDuration(recording.duration)}
                        </span>
                        <span className="flex items-center gap-1">
                          <HardDrive size={12} />
                          {recording.size}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {recording.date.toLocaleDateString('pt-BR')} às{' '}
                        {recording.date.toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <div className={`px-2 py-1 rounded text-xs font-semibold flex-shrink-0 ${
                      recording.status === 'completed'
                        ? 'bg-green-900 text-green-400'
                        : recording.status === 'processing'
                          ? 'bg-yellow-900 text-yellow-400'
                          : 'bg-red-900 text-red-400'
                    }`}>
                      {recording.status === 'completed' ? '✓ Pronto' : '⏳ Processando'}
                    </div>
                  </div>

                  {/* Participants */}
                  <div className="mb-2 text-xs text-gray-500">
                    <p>Participantes: {recording.participants.join(', ')}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownloadRecording(recording.id)}
                      disabled={recording.status !== 'completed'}
                      className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-600 text-white rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                    >
                      <Download size={12} />
                      Baixar
                    </button>
                    <button
                      onClick={() => handleDeleteRecording(recording.id)}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                    >
                      <Trash2 size={12} />
                      Deletar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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
