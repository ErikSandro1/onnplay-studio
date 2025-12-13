import { useState } from 'react';
import { Download, Trash2, Eye, Clock, HardDrive, TrendingUp } from 'lucide-react';

interface Transmission {
  id: string;
  title: string;
  date: Date;
  duration: number;
  viewers: number;
  peakViewers: number;
  bitrate: number;
  quality: string;
  size: number;
  status: 'completed' | 'failed' | 'archived';
}

const MOCK_TRANSMISSIONS: Transmission[] = [
  {
    id: '1',
    title: 'Transmissão ao Vivo - 04/12/2025',
    date: new Date(),
    duration: 3600,
    viewers: 5500,
    peakViewers: 6200,
    bitrate: 5.4,
    quality: '1080p',
    size: 2400,
    status: 'completed',
  },
  {
    id: '2',
    title: 'Evento Especial - 03/12/2025',
    date: new Date(Date.now() - 86400000),
    duration: 7200,
    viewers: 8200,
    peakViewers: 9800,
    bitrate: 6.0,
    quality: '1080p',
    size: 4800,
    status: 'completed',
  },
  {
    id: '3',
    title: 'Teste de Transmissão - 02/12/2025',
    date: new Date(Date.now() - 172800000),
    duration: 1200,
    viewers: 150,
    peakViewers: 200,
    bitrate: 3.5,
    quality: '720p',
    size: 600,
    status: 'completed',
  },
];

export default function TransmissionHistory() {
  const [transmissions, setTransmissions] = useState<Transmission[]>(MOCK_TRANSMISSIONS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const formatSize = (mb: number) => {
    if (mb > 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(2)} MB`;
  };

  const handleDelete = (id: string) => {
    setTransmissions(transmissions.filter(t => t.id !== id));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-900 bg-opacity-30 border-green-700 text-green-400';
      case 'failed':
        return 'bg-red-900 bg-opacity-30 border-red-700 text-red-400';
      case 'archived':
        return 'bg-gray-900 bg-opacity-30 border-gray-700 text-gray-400';
      default:
        return 'bg-gray-900 bg-opacity-30 border-gray-700 text-gray-400';
    }
  };

  return (
    <div className="bg-gray-800 rounded border border-gray-700 p-4 h-full flex flex-col">
      {/* Header */}
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Clock size={24} className="text-orange-500" />
        Histórico de Transmissões
      </h2>

      {/* Transmissions List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {transmissions.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">
            Nenhuma transmissão registrada
          </div>
        ) : (
          transmissions.map(transmission => (
            <div
              key={transmission.id}
              onClick={() => setSelectedId(selectedId === transmission.id ? null : transmission.id)}
              className="bg-gray-900 border border-gray-700 rounded p-3 cursor-pointer hover:border-gray-600 transition-colors"
            >
              {/* Main Info */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {transmission.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {transmission.date.toLocaleDateString('pt-BR')} às{' '}
                    {transmission.date.toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-bold border ${getStatusColor(transmission.status)}`}>
                  {transmission.status === 'completed' && '✓ Completo'}
                  {transmission.status === 'failed' && '✗ Falha'}
                  {transmission.status === 'archived' && '📦 Arquivado'}
                </span>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="bg-gray-800 rounded p-1.5">
                  <p className="text-gray-500">Duração</p>
                  <p className="text-white font-bold">{formatDuration(transmission.duration)}</p>
                </div>
                <div className="bg-gray-800 rounded p-1.5">
                  <p className="text-gray-500">Espectadores</p>
                  <p className="text-white font-bold">{transmission.viewers.toLocaleString()}</p>
                </div>
                <div className="bg-gray-800 rounded p-1.5">
                  <p className="text-gray-500">Qualidade</p>
                  <p className="text-white font-bold">{transmission.quality}</p>
                </div>
                <div className="bg-gray-800 rounded p-1.5">
                  <p className="text-gray-500">Tamanho</p>
                  <p className="text-white font-bold">{formatSize(transmission.size)}</p>
                </div>
              </div>

              {/* Expanded Details */}
              {selectedId === transmission.id && (
                <div className="mt-3 pt-3 border-t border-gray-700 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={14} className="text-orange-500" />
                      <div>
                        <p className="text-gray-500">Pico de Viewers</p>
                        <p className="text-white font-bold">{transmission.peakViewers.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trash2 size={14} className="text-orange-500" />
                      <div>
                        <p className="text-gray-500">Bitrate Médio</p>
                        <p className="text-white font-bold">{transmission.bitrate.toFixed(1)} Mbps</p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-3">
                    <button className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-semibold transition-colors">
                      <Download size={12} />
                      Download
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(transmission.id);
                      }}
                      className="flex items-center justify-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Summary Stats */}
      {transmissions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-3 gap-2 text-xs">
          <div className="bg-gray-900 rounded p-2">
            <p className="text-gray-500">Total de Transmissões</p>
            <p className="text-lg font-bold text-orange-500">{transmissions.length}</p>
          </div>
          <div className="bg-gray-900 rounded p-2">
            <p className="text-gray-500">Tempo Total</p>
            <p className="text-lg font-bold text-orange-500">
              {formatDuration(transmissions.reduce((acc, t) => acc + t.duration, 0))}
            </p>
          </div>
          <div className="bg-gray-900 rounded p-2">
            <p className="text-gray-500">Espaço Usado</p>
            <p className="text-lg font-bold text-orange-500">
              {formatSize(transmissions.reduce((acc, t) => acc + t.size, 0))}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
