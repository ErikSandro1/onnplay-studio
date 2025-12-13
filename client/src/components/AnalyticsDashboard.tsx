import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, Zap, Eye } from 'lucide-react';

interface AnalyticsData {
  timestamp: number;
  viewers: number;
  bitrate: number;
  fps: number;
  quality: string;
}

interface PlatformStats {
  name: string;
  viewers: number;
  percentage: number;
  color: string;
}

const COLORS = ['#ff6b35', '#00d4ff', '#4ade80', '#fbbf24', '#a78bfa'];

export default function AnalyticsDashboard() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats[]>([
    { name: 'YouTube', viewers: 2500, percentage: 45, color: '#ff0000' },
    { name: 'Twitch', viewers: 1800, percentage: 32, color: '#9146ff' },
    { name: 'Facebook', viewers: 1200, percentage: 23, color: '#1877f2' },
  ]);

  const [stats, setStats] = useState({
    totalViewers: 5500,
    peakViewers: 6200,
    avgBitrate: 5.4,
    avgFps: 59.8,
    totalDuration: 3600,
    uptime: '100%',
  });

  // Simular dados de analytics em tempo real
  useEffect(() => {
    const interval = setInterval(() => {
      setAnalyticsData(prev => {
        const newData = [
          ...prev,
          {
            timestamp: Date.now(),
            viewers: Math.max(1000, Math.min(8000, (prev[prev.length - 1]?.viewers || 5000) + (Math.random() - 0.5) * 1000)),
            bitrate: 4.8 + Math.random() * 1.5,
            fps: 59 + Math.floor(Math.random() * 2),
            quality: Math.random() > 0.3 ? '1080p' : '720p',
          },
        ];
        return newData.slice(-60); // Manter últimos 60 pontos
      });

      // Atualizar estatísticas
      setStats(prev => ({
        ...prev,
        totalViewers: Math.max(1000, prev.totalViewers + Math.floor((Math.random() - 0.5) * 200)),
        peakViewers: Math.max(prev.peakViewers, prev.totalViewers),
        avgBitrate: 4.8 + Math.random() * 1.5,
        avgFps: 59 + Math.floor(Math.random() * 2),
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const StatCard = ({ icon: Icon, label, value, unit = '' }: any) => (
    <div className="bg-gray-900 border border-gray-700 rounded p-3 flex items-start gap-3">
      <Icon size={20} className="text-orange-500 flex-shrink-0 mt-1" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-lg font-bold text-white">
          {typeof value === 'number' ? value.toLocaleString() : value}
          <span className="text-xs text-gray-500 ml-1">{unit}</span>
        </p>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-800 rounded border border-gray-700 p-4 h-full flex flex-col overflow-y-auto">
      {/* Header */}
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <TrendingUp size={24} className="text-orange-500" />
        Analytics em Tempo Real
      </h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard icon={Users} label="Espectadores" value={stats.totalViewers} />
        <StatCard icon={Eye} label="Pico de Viewers" value={stats.peakViewers} />
        <StatCard icon={Zap} label="Bitrate Médio" value={stats.avgBitrate.toFixed(1)} unit="Mbps" />
        <StatCard icon={TrendingUp} label="FPS Médio" value={stats.avgFps} />
      </div>

      {/* Charts */}
      <div className="space-y-4 flex-1">
        {/* Viewers Chart */}
        {analyticsData.length > 0 && (
          <div className="bg-gray-900 border border-gray-700 rounded p-3">
            <p className="text-xs font-semibold text-gray-400 mb-2">Espectadores (últimos 2 minutos)</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="timestamp" hide />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                  formatter={(value: any) => value.toLocaleString()}
                />
                <Line
                  type="monotone"
                  dataKey="viewers"
                  stroke="#ff6b35"
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Bitrate Chart */}
        {analyticsData.length > 0 && (
          <div className="bg-gray-900 border border-gray-700 rounded p-3">
            <p className="text-xs font-semibold text-gray-400 mb-2">Bitrate (últimos 2 minutos)</p>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="timestamp" hide />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                  formatter={(value: any) => value.toFixed(1) + ' Mbps'}
                />
                <Bar dataKey="bitrate" fill="#00d4ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Platform Distribution */}
        <div className="bg-gray-900 border border-gray-700 rounded p-3">
          <p className="text-xs font-semibold text-gray-400 mb-2">Distribuição por Plataforma</p>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie
                data={platformStats}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={60}
                paddingAngle={2}
                dataKey="viewers"
              >
                {platformStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                formatter={(value: any) => value.toLocaleString()}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {platformStats.map((platform) => (
              <div key={platform.name} className="text-center">
                <p className="text-xs font-semibold text-white">{platform.name}</p>
                <p className="text-xs text-gray-400">{platform.percentage}%</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quality Distribution */}
        <div className="bg-gray-900 border border-gray-700 rounded p-3">
          <p className="text-xs font-semibold text-gray-400 mb-2">Qualidade de Transmissão</p>
          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-300">1080p</span>
                <span className="text-xs font-bold text-green-500">85%</span>
              </div>
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: '85%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-300">720p</span>
                <span className="text-xs font-bold text-yellow-500">15%</span>
              </div>
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500" style={{ width: '15%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
