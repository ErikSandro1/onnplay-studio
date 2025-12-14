import { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Key, Bell, Shield, User, Zap, CreditCard } from 'lucide-react';
import StreamKeyManager from '@/components/StreamKeyManager';
import { SubscriptionManager } from '@/components/SubscriptionManager';

type SettingsTab = 'stream-keys' | 'subscription' | 'notifications' | 'security' | 'profile' | 'advanced';

interface TabConfig {
  id: SettingsTab;
  label: string;
  icon: React.ReactNode;
  description: string;
}

export default function Settings() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<SettingsTab>('stream-keys');

  const tabs: TabConfig[] = [
    {
      id: 'stream-keys',
      label: 'Stream Keys',
      icon: <Key size={20} />,
      description: 'Gerencie suas chaves de transmissão',
    },
    {
      id: 'subscription',
      label: 'Assinatura',
      icon: <CreditCard size={20} />,
      description: 'Gerencie seu plano e pagamentos',
    },
    {
      id: 'notifications',
      label: 'Notificações',
      icon: <Bell size={20} />,
      description: 'Configure alertas e notificações',
    },
    {
      id: 'security',
      label: 'Segurança',
      icon: <Shield size={20} />,
      description: 'Opções de segurança e privacidade',
    },
    {
      id: 'profile',
      label: 'Perfil',
      icon: <User size={20} />,
      description: 'Informações da sua conta',
    },
    {
      id: 'advanced',
      label: 'Avançado',
      icon: <Zap size={20} />,
      description: 'Configurações avançadas',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Configurações</h1>
              <p className="text-sm text-gray-500">Gerencie suas preferências e configurações</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="space-y-2 sticky top-20">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                    activeTab === tab.id
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-900 text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <span className={activeTab === tab.id ? 'text-white' : 'text-gray-400'}>
                    {tab.icon}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{tab.label}</p>
                    <p className="text-xs opacity-70">{tab.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            {activeTab === 'stream-keys' && (
              <StreamKeyManager />
            )}

            {activeTab === 'subscription' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-4">Assinatura</h2>
                  <p className="text-gray-400 mb-6">Gerencie seu plano e pagamentos</p>
                </div>
                <SubscriptionManager />
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-4">Notificações</h2>
                  <p className="text-gray-400 mb-6">Configure como você deseja ser notificado sobre eventos importantes</p>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
                  {[
                    { label: 'Notificações de Transmissão', description: 'Alertas quando uma transmissão inicia ou termina' },
                    { label: 'Notificações de Chat', description: 'Mensagens de novos comentários no chat' },
                    { label: 'Notificações de Espectadores', description: 'Alertas de picos de visualização' },
                    { label: 'Notificações de Sistema', description: 'Atualizações e manutenção do sistema' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0">
                      <div>
                        <p className="font-medium text-white">{item.label}</p>
                        <p className="text-sm text-gray-500">{item.description}</p>
                      </div>
                      <input type="checkbox" defaultChecked className="w-5 h-5 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-4">Segurança</h2>
                  <p className="text-gray-400 mb-6">Proteja sua conta com essas opções de segurança</p>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
                  {/* Two-Factor Authentication */}
                  <div className="pb-6 border-b border-gray-800">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-white mb-1">Autenticação de Dois Fatores</h3>
                        <p className="text-sm text-gray-500">Adicione uma camada extra de segurança à sua conta</p>
                      </div>
                      <button className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg transition-colors">
                        Ativar
                      </button>
                    </div>
                  </div>

                  {/* Session Management */}
                  <div className="pb-6 border-b border-gray-800">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-white mb-1">Gerenciar Sessões</h3>
                        <p className="text-sm text-gray-500">Veja e encerre sessões ativas</p>
                      </div>
                      <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors">
                        Gerenciar
                      </button>
                    </div>
                  </div>

                  {/* Password Change */}
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-white mb-1">Alterar Senha</h3>
                        <p className="text-sm text-gray-500">Atualize sua senha regularmente</p>
                      </div>
                      <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors">
                        Alterar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-4">Perfil</h2>
                  <p className="text-gray-400 mb-6">Gerencie as informações da sua conta</p>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Nome Completo</label>
                      <input
                        type="text"
                        placeholder="Seu nome"
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                      <input
                        type="email"
                        placeholder="seu@email.com"
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
                      <textarea
                        placeholder="Conte um pouco sobre você"
                        rows={4}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <button className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors">
                      Salvar Alterações
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'advanced' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-4">Configurações Avançadas</h2>
                  <p className="text-gray-400 mb-6">Opções avançadas para usuários experientes</p>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
                  {/* API Keys */}
                  <div className="pb-6 border-b border-gray-800">
                    <h3 className="font-semibold text-white mb-3">Chaves de API</h3>
                    <p className="text-sm text-gray-500 mb-4">Gerencie suas chaves de API para integração</p>
                    <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors">
                      Gerar Nova Chave
                    </button>
                  </div>

                  {/* Webhooks */}
                  <div className="pb-6 border-b border-gray-800">
                    <h3 className="font-semibold text-white mb-3">Webhooks</h3>
                    <p className="text-sm text-gray-500 mb-4">Configure webhooks para eventos importantes</p>
                    <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors">
                      Configurar Webhooks
                    </button>
                  </div>

                  {/* Data Export */}
                  <div>
                    <h3 className="font-semibold text-white mb-3">Exportar Dados</h3>
                    <p className="text-sm text-gray-500 mb-4">Baixe uma cópia de seus dados</p>
                    <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors">
                      Exportar Dados
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
