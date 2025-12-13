import { useState } from 'react';
import { BarChart3, Settings, Clock, Zap } from 'lucide-react';
import AnalyticsDashboard from './AnalyticsDashboard';
import AdvancedMixer from './AdvancedMixer';
import TransmissionHistory from './TransmissionHistory';

type DashboardTab = 'analytics' | 'mixer' | 'history';

export default function MainDashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('analytics');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg w-full h-full max-w-7xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 size={28} className="text-orange-500" />
            OnnPlay Studio Dashboard
          </h1>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 px-4 pt-4 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 font-semibold transition-colors border-b-2 ${
              activeTab === 'analytics'
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            <BarChart3 size={18} />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('mixer')}
            className={`flex items-center gap-2 px-4 py-2 font-semibold transition-colors border-b-2 ${
              activeTab === 'mixer'
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            <Settings size={18} />
            Mixer Avançado
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 font-semibold transition-colors border-b-2 ${
              activeTab === 'history'
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            <Clock size={18} />
            Histórico
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-4">
          {activeTab === 'analytics' && <AnalyticsDashboard />}
          {activeTab === 'mixer' && <AdvancedMixer />}
          {activeTab === 'history' && <TransmissionHistory />}
        </div>
      </div>
    </div>
  );
}
