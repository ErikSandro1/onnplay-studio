import { Home as HomeIcon, Share2, Users as UsersIcon, Zap, BarChart3, Settings, Video, Smile, MessageSquare, MessageCircle, Layers, Volume2 } from 'lucide-react';
import CompactClock from './CompactClock';
import { useLocation } from 'wouter';

interface StudioHeaderProps {
  isLive: boolean;
  participantCount: number;
  onNavigateHome: () => void;
  onInvite: () => void;
  onParticipants: () => void;
  onStreamingConfig: () => void;
  onDashboard: () => void;
  onSettings: () => void;
  onRecordingVideocall: () => void;
  onReactions: () => void;
  onChat: () => void;
  onUnifiedChat?: () => void;
  onOverlayManager?: () => void;
  onAdvancedAudioMixer?: () => void;
}

export default function StudioHeader({
  isLive,
  participantCount,
  onNavigateHome,
  onInvite,
  onParticipants,
  onStreamingConfig,
  onDashboard,
  onSettings,
  onRecordingVideocall,
  onReactions,
  onChat,
  onUnifiedChat,
  onOverlayManager,
  onAdvancedAudioMixer,
}: StudioHeaderProps) {
  return (
    <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 flex-shrink-0">
      {/* Left: Navigation & Clock */}
      <div className="flex items-center gap-4">
        <button
          onClick={onNavigateHome}
          className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
          title="Voltar para Dashboard"
        >
          <HomeIcon size={20} />
        </button>
        <div className="h-6 w-px bg-gray-800"></div>
        <CompactClock isLive={isLive} />
      </div>

      {/* Right: Actions Toolbar */}
      <div className="flex items-center gap-2">
        {/* Communication Group */}
        <div className="flex items-center gap-1 bg-gray-800/50 p-1 rounded-lg border border-gray-800">
          <ActionButton icon={Share2} onClick={onInvite} title="Convidar" badge={participantCount > 1 ? participantCount : undefined} badgeColor="bg-red-600" />
          <ActionButton icon={UsersIcon} onClick={onParticipants} title="Participantes" badge={participantCount > 1 ? participantCount : undefined} badgeColor="bg-green-600" />
          <ActionButton icon={MessageSquare} onClick={onChat} title="Chat" />
          <ActionButton icon={Smile} onClick={onReactions} title="Reações" />
          <ActionButton icon={Video} onClick={onRecordingVideocall} title="Gravar Chamada" />
        </div>

        {/* Pro Features Group */}
        <div className="flex items-center gap-1 bg-gradient-to-r from-orange-900/30 to-orange-800/30 p-1 rounded-lg border border-orange-700/50 ml-2">
          {onUnifiedChat && <ActionButton icon={MessageCircle} onClick={onUnifiedChat} title="Chat Unificado" badge="PRO" badgeColor="bg-orange-600" />}
          {onOverlayManager && <ActionButton icon={Layers} onClick={onOverlayManager} title="Overlays" badge="PRO" badgeColor="bg-orange-600" />}
          {onAdvancedAudioMixer && <ActionButton icon={Volume2} onClick={onAdvancedAudioMixer} title="Mixer Avançado" badge="PRO" badgeColor="bg-orange-600" />}
        </div>

        {/* System Group */}
        <div className="flex items-center gap-1 bg-gray-800/50 p-1 rounded-lg border border-gray-800 ml-2">
          <ActionButton icon={Zap} onClick={onStreamingConfig} title="Stream Config" />
          <ActionButton icon={BarChart3} onClick={onDashboard} title="Analytics" />
          <ActionButton icon={Settings} onClick={onSettings} title="Configurações" />
        </div>
      </div>
    </div>
  );
}

function ActionButton({ icon: Icon, onClick, title, badge, badgeColor }: any) {
  const isTextBadge = typeof badge === 'string' && badge.length > 2;
  
  return (
    <button
      onClick={onClick}
      className="p-2 hover:bg-gray-700 rounded-md text-gray-400 hover:text-orange-500 transition-colors relative group"
      title={title}
    >
      <Icon size={18} />
      {badge && (
        <span className={`absolute -top-1 -right-1 ${isTextBadge ? 'px-1.5 py-0.5' : 'w-4 h-4'} ${badgeColor || 'bg-blue-600'} rounded-full text-[10px] text-white font-bold flex items-center justify-center border border-gray-900`}>
          {badge}
        </span>
      )}
    </button>
  );
}
