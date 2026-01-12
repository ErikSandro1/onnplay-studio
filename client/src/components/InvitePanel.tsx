import { useState, useEffect } from 'react';
import { Copy, Mail, MessageSquare, Share2, QrCode, Link as LinkIcon, X, Users, Clock, Video, Send, UserPlus, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Guest {
  id: string;
  name: string;
  email: string;
  status: 'pending' | 'sent' | 'joined';
  sentAt?: Date;
}

interface InvitePanelProps {
  roomName: string;
  roomUrl: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function InvitePanel({ roomName, roomUrl, isOpen = false, onClose }: InvitePanelProps) {
  const [inviteLink, setInviteLink] = useState(roomUrl);
  const [showQR, setShowQR] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guests, setGuests] = useState<Guest[]>([]);
  const [activeTab, setActiveTab] = useState<'invite' | 'guests'>('invite');
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  // Gerar QR Code usando API gratuita
  useEffect(() => {
    if (inviteLink) {
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteLink)}&bgcolor=ffffff&color=000000`;
      setQrCodeUrl(qrApiUrl);
    }
  }, [inviteLink]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Link copiado para a área de transferência!');
  };

  const addGuest = () => {
    if (!guestEmail || !guestName) {
      toast.error('Preencha nome e email do convidado');
      return;
    }

    const newGuest: Guest = {
      id: Date.now().toString(),
      name: guestName,
      email: guestEmail,
      status: 'pending'
    };

    setGuests([...guests, newGuest]);
    setGuestEmail('');
    setGuestName('');
    toast.success(`${guestName} adicionado à lista de convidados`);
  };

  const sendInviteToGuest = (guestId: string) => {
    const guest = guests.find(g => g.id === guestId);
    if (!guest) return;

    const subject = `🎬 Convite para transmissão ao vivo - ${roomName}`;
    const body = `Olá ${guest.name}!\n\nVocê foi convidado para participar de uma transmissão ao vivo no OnnPlay Studio.\n\n📺 Sala: ${roomName}\n🔗 Link de acesso: ${inviteLink}\n\nClique no link acima para entrar na sala de transmissão.\n\nAté já!\n\n---\nOnnPlay Studio - Transmissão Profissional`;
    const mailtoLink = `mailto:${guest.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    window.location.href = mailtoLink;
    
    setGuests(guests.map(g => 
      g.id === guestId 
        ? { ...g, status: 'sent', sentAt: new Date() }
        : g
    ));
    
    toast.success(`Convite enviado para ${guest.name}`);
  };

  const sendAllInvites = () => {
    const pendingGuests = guests.filter(g => g.status === 'pending');
    if (pendingGuests.length === 0) {
      toast.info('Não há convites pendentes');
      return;
    }

    pendingGuests.forEach(guest => {
      sendInviteToGuest(guest.id);
    });
  };

  const removeGuest = (guestId: string) => {
    setGuests(guests.filter(g => g.id !== guestId));
    toast.success('Convidado removido');
  };

  const handleShareWhatsApp = () => {
    const message = `🎬 Você foi convidado para uma transmissão ao vivo!\n\n📺 Sala: ${roomName}\n🔗 Acesse: ${inviteLink}\n\nOnnPlay Studio`;
    const whatsappLink = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappLink, '_blank');
    toast.success('WhatsApp aberto!');
  };

  const handleShareTelegram = () => {
    const message = `🎬 Convite para transmissão ao vivo - ${roomName}`;
    const telegramLink = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(message)}`;
    window.open(telegramLink, '_blank');
    toast.success('Telegram aberto!');
  };

  const handleShareTwitter = () => {
    const message = `🎬 Participe da transmissão ao vivo no OnnPlay Studio! ${inviteLink}`;
    const twitterLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`;
    window.open(twitterLink, '_blank');
    toast.success('Twitter aberto!');
  };

  const handleShareLinkedIn = () => {
    const linkedInLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(inviteLink)}`;
    window.open(linkedInLink, '_blank');
    toast.success('LinkedIn aberto!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0F1419] border border-[#1E2842] rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1E2842] bg-gradient-to-r from-orange-600/20 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/20">
              <Share2 size={24} className="text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Convidar Participantes</h2>
              <p className="text-xs text-gray-400">Convide pessoas para sua transmissão</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1E2842] rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#1E2842]">
          <button
            onClick={() => setActiveTab('invite')}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'invite' 
                ? 'text-orange-500 border-b-2 border-orange-500 bg-orange-500/10' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <LinkIcon size={16} />
            Link de Convite
          </button>
          <button
            onClick={() => setActiveTab('guests')}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'guests' 
                ? 'text-orange-500 border-b-2 border-orange-500 bg-orange-500/10' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users size={16} />
            Lista de Convidados
            {guests.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white text-xs">
                {guests.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'invite' ? (
            <>
              {/* Room Info */}
              <div className="bg-[#1E2842]/50 border border-[#2D3A5C] rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/20">
                    <Video size={20} className="text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold">SALA DE TRANSMISSÃO</p>
                    <p className="text-lg font-bold text-white">{roomName}</p>
                  </div>
                </div>
              </div>

              {/* Invite Link */}
              <div>
                <label className="text-sm font-semibold text-gray-400 block mb-2">
                  Link de Convite
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="flex-1 px-4 py-3 bg-[#1E2842] text-white rounded-lg border border-[#2D3A5C] focus:outline-none focus:border-orange-500 text-sm font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(inviteLink)}
                    className="px-5 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                  >
                    <Copy size={16} />
                    Copiar
                  </button>
                </div>
              </div>

              {/* Share Methods */}
              <div>
                <p className="text-sm font-semibold text-gray-400 mb-3">Compartilhar via:</p>
                <div className="grid grid-cols-4 gap-3">
                  <button
                    onClick={handleShareWhatsApp}
                    className="px-3 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold transition-colors flex flex-col items-center justify-center gap-1"
                  >
                    <MessageSquare size={20} />
                    <span className="text-xs">WhatsApp</span>
                  </button>
                  <button
                    onClick={handleShareTelegram}
                    className="px-3 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors flex flex-col items-center justify-center gap-1"
                  >
                    <Send size={20} />
                    <span className="text-xs">Telegram</span>
                  </button>
                  <button
                    onClick={handleShareTwitter}
                    className="px-3 py-3 bg-sky-500 hover:bg-sky-400 text-white rounded-lg font-semibold transition-colors flex flex-col items-center justify-center gap-1"
                  >
                    <MessageSquare size={20} />
                    <span className="text-xs">Twitter</span>
                  </button>
                  <button
                    onClick={handleShareLinkedIn}
                    className="px-3 py-3 bg-blue-700 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors flex flex-col items-center justify-center gap-1"
                  >
                    <LinkIcon size={20} />
                    <span className="text-xs">LinkedIn</span>
                  </button>
                </div>
              </div>

              {/* QR Code */}
              <div>
                <button
                  onClick={() => setShowQR(!showQR)}
                  className="w-full px-4 py-3 bg-[#1E2842] hover:bg-[#2D3A5C] text-gray-300 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 border border-[#2D3A5C]"
                >
                  <QrCode size={18} />
                  {showQR ? 'Ocultar' : 'Mostrar'} QR Code
                </button>
                {showQR && (
                  <div className="mt-4 p-6 bg-[#1E2842] rounded-lg border border-[#2D3A5C] flex flex-col items-center">
                    <div className="p-4 bg-white rounded-lg">
                      <img 
                        src={qrCodeUrl} 
                        alt="QR Code" 
                        className="w-48 h-48"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-3 text-center">
                      Escaneie o QR Code para entrar na sala
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Add Guest Form */}
              <div className="bg-[#1E2842]/50 border border-[#2D3A5C] rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                  <UserPlus size={16} />
                  Adicionar Convidado
                </p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input
                    type="text"
                    placeholder="Nome do convidado"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="px-4 py-2 bg-[#0F1419] text-white rounded-lg border border-[#2D3A5C] focus:outline-none focus:border-orange-500 text-sm"
                  />
                  <input
                    type="email"
                    placeholder="Email do convidado"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="px-4 py-2 bg-[#0F1419] text-white rounded-lg border border-[#2D3A5C] focus:outline-none focus:border-orange-500 text-sm"
                  />
                </div>
                <button
                  onClick={addGuest}
                  className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <UserPlus size={16} />
                  Adicionar à Lista
                </button>
              </div>

              {/* Guests List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-400 flex items-center gap-2">
                    <Users size={16} />
                    Convidados ({guests.length})
                  </p>
                  {guests.filter(g => g.status === 'pending').length > 0 && (
                    <button
                      onClick={sendAllInvites}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <Mail size={14} />
                      Enviar Todos
                    </button>
                  )}
                </div>

                {guests.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users size={40} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum convidado adicionado</p>
                    <p className="text-xs">Adicione convidados usando o formulário acima</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {guests.map((guest) => (
                      <div 
                        key={guest.id}
                        className="flex items-center justify-between p-3 bg-[#1E2842]/50 border border-[#2D3A5C] rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                            guest.status === 'joined' 
                              ? 'bg-green-500/20 text-green-400' 
                              : guest.status === 'sent'
                                ? 'bg-cyan-500/20 text-cyan-400'
                                : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {guest.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{guest.name}</p>
                            <p className="text-xs text-gray-400">{guest.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {guest.status === 'pending' && (
                            <button
                              onClick={() => sendInviteToGuest(guest.id)}
                              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-semibold transition-colors flex items-center gap-1"
                            >
                              <Mail size={12} />
                              Enviar
                            </button>
                          )}
                          {guest.status === 'sent' && (
                            <span className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded text-xs font-semibold flex items-center gap-1">
                              <Clock size={12} />
                              Enviado
                            </span>
                          )}
                          {guest.status === 'joined' && (
                            <span className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded text-xs font-semibold flex items-center gap-1">
                              <CheckCircle size={12} />
                              Na sala
                            </span>
                          )}
                          <button
                            onClick={() => removeGuest(guest.id)}
                            className="p-1.5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Info Box */}
          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 flex gap-3">
            <LinkIcon size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-300">
              <p className="font-semibold mb-1">💡 Dica:</p>
              <p>
                Compartilhe o link de convite com seus participantes. Eles poderão entrar na sala
                de videochamada clicando no link ou escaneando o QR Code. Os convidados precisam
                apenas de um navegador moderno para participar.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#1E2842] p-4 flex justify-end gap-2 bg-[#0F1419]">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#1E2842] hover:bg-[#2D3A5C] text-gray-300 rounded-lg font-semibold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
