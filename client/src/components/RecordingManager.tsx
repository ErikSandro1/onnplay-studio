import { useState, useEffect } from 'react';
import { Circle, Square, Download, Trash2, Clock, HardDrive } from 'lucide-react';

interface Recording {
  id: string;
  name: string;
  duration: number;
  size: number;
  quality: '720p' | '1080p' | '4K';
  format: 'HLS' | 'MP4' | 'WebM';
  createdAt: Date;
  status: 'recording' | 'completed' | 'failed';
}

interface RecordingManagerProps {
  isRecording?: boolean;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
}

export default function RecordingManager({
  isRecording = false,
  onStartRecording,
  onStopRecording,
}: RecordingManagerProps) {
  const [recordings, setRecordings] = useState<Recording[]>([
    {
      id: '1',
      name: 'Transmissão - 04/12/2025',
      duration: 3600,
      size: 2400,
      quality: '1080p',
      format: 'HLS',
      createdAt: new Date(),
      status: 'completed',
    },
    {
      id: '2',
      name: 'Teste - 03/12/2025',
      duration: 1200,
      size: 800,
      quality: '720p',
      format: 'MP4',
      createdAt: new Date(Date.now() - 86400000),
      status: 'completed',
    },
  ]);

  const [recordingTime, setRecordingTime] = useState(0);
  const [quality, setQuality] = useState<'720p' | '1080p' | '4K'>('1080p');
  const [format, setFormat] = useState<'HLS' | 'MP4' | 'WebM'>('HLS');
  const [showSettings, setShowSettings] = useState(false);

  // Simular tempo de gravação
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatSize = (mb: number) => {
    if (mb > 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(2)} MB`;
  };

  const handleStartRecording = () => {
    setRecordingTime(0);
    onStartRecording?.();
  };

  const handleStopRecording = () => {
    if (recordingTime > 0) {
      const newRecording: Recording = {
        id: Date.now().toString(),
        name: `Gravação - ${new Date().toLocaleDateString('pt-BR')}`,
        duration: recordingTime,
        size: Math.random() * 5000,
        quality,
        format,
        createdAt: new Date(),
        status: 'completed',
      };
      setRecordings([newRecording, ...recordings]);
      setRecordingTime(0);
    }
    onStopRecording?.();
  };

  const handleDeleteRecording = (id: string) => {
    setRecordings(recordings.filter(r => r.id !== id));
  };

  const getQualityColor = (q: string) => {
    switch (q) {
      case '4K':
        return 'text-red-500';
      case '1080p':
        return 'text-blue-500';
      case '720p':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="bg-gray-800 rounded border border-gray-700 p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Gravação</h3>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
        >
          ⚙️ Configurações
        </button>
      </div>

      {/* Recording Status */}
      <div className="mb-4 p-3 bg-gray-900 rounded border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Circle
              size={12}
              className={isRecording ? 'fill-red-600 text-red-600 animate-pulse' : 'text-gray-600'}
            />
            <span className="text-sm font-semibold text-white">
              {isRecording ? 'GRAVANDO' : 'PARADO'}
            </span>
          </div>
          <span className="text-xs font-mono text-orange-500">
            {formatDuration(recordingTime)}
          </span>
        </div>

        {/* Recording Controls */}
        <div className="flex gap-2">
          {!isRecording ? (
            <button
              onClick={handleStartRecording}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold transition-colors"
            >
              <Circle size={12} className="fill-current" />
              Iniciar
            </button>
          ) : (
            <button
              onClick={handleStopRecording}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs font-semibold transition-colors"
            >
              <Square size={12} />
              Parar
            </button>
          )}
        </div>
      </div>

      {/* Settings */}
      {showSettings && (
        <div className="mb-4 p-3 bg-gray-900 rounded border border-gray-700">
          <div className="space-y-2">
            <div>
              <label className="text-xs font-semibold text-gray-400 block mb-1">Qualidade</label>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value as any)}
                className="w-full px-2 py-1 bg-gray-800 text-white rounded text-xs border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="720p">720p (HD)</option>
                <option value="1080p">1080p (Full HD)</option>
                <option value="4K">4K (Ultra HD)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 block mb-1">Formato</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
                className="w-full px-2 py-1 bg-gray-800 text-white rounded text-xs border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="HLS">HLS (Streaming)</option>
                <option value="MP4">MP4 (Compatível)</option>
                <option value="WebM">WebM (Web)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Recordings List */}
      <div className="flex-1 overflow-y-auto">
        <p className="text-xs font-semibold text-gray-400 mb-2">Histórico</p>
        {recordings.length === 0 ? (
          <div className="text-center text-gray-500 text-xs py-4">
            Nenhuma gravação salva
          </div>
        ) : (
          <div className="space-y-2">
            {recordings.map((recording) => (
              <div
                key={recording.id}
                className="p-2 bg-gray-900 rounded border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">
                      {recording.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-bold ${getQualityColor(recording.quality)}`}>
                        {recording.quality}
                      </span>
                      <span className="text-xs text-gray-500">{recording.format}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteRecording(recording.id)}
                    className="p-1 hover:bg-red-600 rounded transition-colors flex-shrink-0"
                  >
                    <Trash2 size={12} className="text-red-500" />
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <Clock size={10} />
                    {formatDuration(recording.duration)}
                  </div>
                  <div className="flex items-center gap-2">
                    <HardDrive size={10} />
                    {formatSize(recording.size)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Download Button */}
      {recordings.length > 0 && (
        <button className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-semibold transition-colors">
          <Download size={14} />
          Download Último
        </button>
      )}
    </div>
  );
}
