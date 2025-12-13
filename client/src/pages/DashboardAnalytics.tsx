import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { 
  ArrowLeft, 
  Play, 
  Users, 
  Clock, 
  TrendingUp, 
  Radio, 
  Calendar,
  Eye,
  Zap,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';

type PeriodFilter = 7 | 30 | 90;

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [period, setPeriod] = useState<PeriodFilter>(30);

  // Fetch analytics data
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = trpc.analytics.summary.useQuery();
  const { data: viewersByDay, isLoading: viewersLoading, refetch: refetchViewers } = trpc.analytics.viewersByDay.useQuery({ days: period });
  const { data: platformStats, isLoading: platformLoading, refetch: refetchPlatform } = trpc.analytics.platformStats.useQuery();
  const { data: transmissions, isLoading: transmissionsLoading, refetch: refetchTransmissions } = trpc.analytics.transmissionsByPeriod.useQuery({ days: period });

  const isLoading = summaryLoading || viewersLoading || platformLoading || transmissionsLoading;

  const handleRefresh = () => {
    refetchSummary();
    refetchViewers();
    refetchPlatform();
    refetchTransmissions();
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Chart colors
  const COLORS = ['#f97316', '#06b6d4', '#8b5cf6', '#10b981', '#f43f5e', '#eab308'];

  // Prepare chart data with demo data if empty
  const chartData = useMemo(() => {
    if (viewersByDay && viewersByDay.length > 0) {
      return viewersByDay.map(d => ({
        ...d,
        date: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      }));
    }
    // Demo data
    const demoData = [];
    for (let i = period; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      demoData.push({
        date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        viewers: Math.floor(Math.random() * 2000) + 500,
        peakViewers: Math.floor(Math.random() * 3000) + 1000,
        transmissions: Math.floor(Math.random() * 3) + 1,
      });
    }
    return demoData;
  }, [viewersByDay, period]);

  const platformData = useMemo(() => {
    if (platformStats && platformStats.length > 0) {
      return platformStats;
    }
    // Demo data
    return [
      { platform: 'YouTube', count: 45, totalViewers: 125000 },
      { platform: 'Twitch', count: 32, totalViewers: 89000 },
      { platform: 'Facebook', count: 18, totalViewers: 45000 },
      { platform: 'Instagram', count: 12, totalViewers: 28000 },
    ];
  }, [platformStats]);

  const summaryData = summary || {
    totalTransmissions: 107,
    totalDurationSeconds: 432000,
    totalViewers: 287000,
    avgViewers: 2682,
    peakViewers: 8543,
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-400" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <BarChart3 className="text-orange-500" size={24} />
                  Analytics Dashboard
                </h1>
                <p className="text-sm text-gray-500">Métricas e estatísticas de transmissão</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Period Filter */}
              <div className="flex bg-gray-800 rounded-lg p-1">
                {([7, 30, 90] as PeriodFilter[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      period === p
                        ? 'bg-orange-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {p} dias
                  </button>
                ))}
              </div>
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw size={18} className={`text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-orange-500/50 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Radio size={20} className="text-orange-500" />
              </div>
              <span className="text-gray-400 text-sm">Transmissões</span>
            </div>
            <p className="text-3xl font-bold text-white">{summaryData.totalTransmissions}</p>
            <p className="text-xs text-gray-500 mt-1">Total no período</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-cyan-500/50 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <Clock size={20} className="text-cyan-500" />
              </div>
              <span className="text-gray-400 text-sm">Tempo Total</span>
            </div>
            <p className="text-3xl font-bold text-white">{formatDuration(summaryData.totalDurationSeconds)}</p>
            <p className="text-xs text-gray-500 mt-1">De transmissão</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-green-500/50 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Users size={20} className="text-green-500" />
              </div>
              <span className="text-gray-400 text-sm">Total Viewers</span>
            </div>
            <p className="text-3xl font-bold text-white">{(summaryData.totalViewers / 1000).toFixed(1)}K</p>
            <p className="text-xs text-gray-500 mt-1">Espectadores únicos</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-purple-500/50 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <TrendingUp size={20} className="text-purple-500" />
              </div>
              <span className="text-gray-400 text-sm">Média/Stream</span>
            </div>
            <p className="text-3xl font-bold text-white">{summaryData.avgViewers.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">Espectadores médios</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-red-500/50 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Zap size={20} className="text-red-500" />
              </div>
              <span className="text-gray-400 text-sm">Pico Máximo</span>
            </div>
            <p className="text-3xl font-bold text-white">{summaryData.peakViewers.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">Espectadores simultâneos</p>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Viewers Over Time - Area Chart */}
          <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Espectadores ao Longo do Tempo</h3>
                <p className="text-sm text-gray-500">Visualizações diárias nos últimos {period} dias</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span className="text-gray-400">Total</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
                  <span className="text-gray-400">Pico</span>
                </div>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorViewers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPeak" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280" 
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#6b7280" 
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="viewers" 
                    stroke="#f97316" 
                    fillOpacity={1} 
                    fill="url(#colorViewers)" 
                    strokeWidth={2}
                    name="Total Viewers"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="peakViewers" 
                    stroke="#06b6d4" 
                    fillOpacity={1} 
                    fill="url(#colorPeak)" 
                    strokeWidth={2}
                    name="Pico"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Platform Distribution - Pie Chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white">Distribuição por Plataforma</h3>
              <p className="text-sm text-gray-500">Transmissões por destino</p>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={platformData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="platform"
                  >
                    {platformData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {platformData.slice(0, 4).map((p, i) => (
                <div key={p.platform} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  ></div>
                  <span className="text-sm text-gray-400">{p.platform}</span>
                  <span className="text-sm text-white font-medium ml-auto">{p.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Transmissions Bar Chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white">Transmissões por Dia</h3>
              <p className="text-sm text-gray-500">Quantidade de lives realizadas</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.slice(-14)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280" 
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#6b7280" 
                    fontSize={12}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Bar 
                    dataKey="transmissions" 
                    fill="#8b5cf6" 
                    radius={[4, 4, 0, 0]}
                    name="Transmissões"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Peak Viewers Line Chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white">Evolução do Pico de Espectadores</h3>
              <p className="text-sm text-gray-500">Máximo de espectadores simultâneos</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.slice(-14)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280" 
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#6b7280" 
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="peakViewers" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ fill: '#10b981', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#10b981' }}
                    name="Pico de Espectadores"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Transmissions Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Transmissões Recentes</h3>
              <p className="text-sm text-gray-500">Últimas {period} dias</p>
            </div>
            <button
              onClick={() => navigate('/studio')}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Play size={16} />
              Nova Transmissão
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Título</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Data</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Plataformas</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Duração</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Viewers</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Pico</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {(transmissions && transmissions.length > 0 ? transmissions.slice(0, 10) : [
                  { id: 1, title: 'Live de Lançamento', createdAt: new Date(), platforms: ['youtube', 'twitch'], durationSeconds: 7200, totalViewers: 4500, peakViewers: 2100, status: 'ended' },
                  { id: 2, title: 'Podcast Semanal #45', createdAt: new Date(Date.now() - 86400000), platforms: ['youtube'], durationSeconds: 5400, totalViewers: 3200, peakViewers: 1800, status: 'ended' },
                  { id: 3, title: 'Q&A com a Comunidade', createdAt: new Date(Date.now() - 172800000), platforms: ['twitch', 'facebook'], durationSeconds: 3600, totalViewers: 2800, peakViewers: 1500, status: 'ended' },
                  { id: 4, title: 'Tutorial de Streaming', createdAt: new Date(Date.now() - 259200000), platforms: ['youtube'], durationSeconds: 4800, totalViewers: 5100, peakViewers: 2400, status: 'ended' },
                  { id: 5, title: 'Evento Especial', createdAt: new Date(Date.now() - 345600000), platforms: ['youtube', 'twitch', 'facebook'], durationSeconds: 10800, totalViewers: 12000, peakViewers: 5500, status: 'ended' },
                ]).map((t: any) => (
                  <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <span className="text-white font-medium">{t.title}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-gray-400 text-sm">
                        {new Date(t.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        {(t.platforms as string[]).map((p: string) => (
                          <span 
                            key={p} 
                            className="px-2 py-0.5 bg-gray-800 text-gray-300 text-xs rounded capitalize"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-gray-300">{formatDuration(t.durationSeconds ?? 0)}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-white font-medium">{(t.totalViewers ?? 0).toLocaleString()}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-orange-500 font-medium">{(t.peakViewers ?? 0).toLocaleString()}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        t.status === 'live' 
                          ? 'bg-red-500/20 text-red-400' 
                          : t.status === 'ended'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {t.status === 'live' ? '🔴 AO VIVO' : t.status === 'ended' ? 'Finalizada' : t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
