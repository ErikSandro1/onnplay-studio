import { useState } from 'react';
import { Copy, Mail, MessageSquare, Share2, QrCode, Link as LinkIcon, X } from 'lucide-react';
import { toast } from 'sonner';

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência!');
  };

  const handleSendEmail = () => {
    if (!guestEmail || !guestName) {
      toast.error('Preencha nome e email');
      return;
    }

    const subject = `Convite para transmissão ao vivo no OnnPlay Studio`;
    const body = `Olá ${guestName},\n\nVocê foi convidado para participar de uma transmissão ao vivo.\n\nClique no link abaixo para entrar:\n${inviteLink}\n\nSala: ${roomName}`;
    const mailtoLink = `mailto:${guestEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    window.location.href = mailtoLink;
    setGuestEmail('');
    setGuestName('');
    toast.success('Email de convite preparado!');
  };

  const handleShareWhatsApp = () => {
    const message = `Olá! Você foi convidado para uma transmissão ao vivo no OnnPlay Studio. Acesse: ${inviteLink}`;
    const whatsappLink = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappLink, '_blank');
    toast.success('WhatsApp aberto!');
  };

  const handleShareTelegram = () => {
    const message = `Convite para transmissão ao vivo no OnnPlay Studio: ${inviteLink}`;
    const telegramLink = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent('Transmissão ao vivo')}`;
    window.open(telegramLink, '_blank');
    toast.success('Telegram aberto!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Share2 size={24} className="text-orange-500" />
            <h2 className="text-lg font-bold text-white">Convidar Participantes</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Room Info */}
          <div className="bg-gray-900 border border-gray-700 rounded p-4">
            <p className="text-xs text-gray-400 font-semibold mb-2">SALA DE TRANSMISSÃO</p>
            <p className="text-lg font-bold text-white">{roomName}</p>
            <p className="text-xs text-gray-500 mt-1">Transmissão ao vivo em tempo real</p>
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
                className="flex-1 px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:outline-none text-sm font-mono"
              />
              <button
                onClick={() => copyToClipboard(inviteLink)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded font-semibold transition-colors flex items-center gap-2"
              >
                <Copy size={16} />
                Copiar
              </button>
            </div>
          </div>

          {/* Share Methods */}
          <div>
            <p className="text-sm font-semibold text-gray-400 mb-3">Compartilhar por:</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleShareWhatsApp}
                className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <MessageSquare size={18} />
                WhatsApp
              </button>
              <button
                onClick={handleShareTelegram}
                className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <MessageSquare size={18} />
                Telegram
              </button>
            </div>
          </div>

          {/* Email Invite */}
          <div>
            <p className="text-sm font-semibold text-gray-400 mb-3">Enviar por Email:</p>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Nome do convidado"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              />
              <input
                type="email"
                placeholder="Email do convidado"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              />
              <button
                onClick={handleSendEmail}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Mail size={16} />
                Enviar Convite por Email
              </button>
            </div>
          </div>

          {/* QR Code */}
          <div>
            <button
              onClick={() => setShowQR(!showQR)}
              className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <QrCode size={16} />
              {showQR ? 'Ocultar' : 'Mostrar'} QR Code
            </button>
            {showQR && (
              <div className="mt-4 p-4 bg-gray-900 rounded border border-gray-700 flex justify-center">
                <div className="w-48 h-48 bg-white rounded flex items-center justify-center">
                  <div className="text-center text-gray-800 text-sm">
                    <p className="font-bold mb-2">QR Code</p>
                    <p className="text-xs">{roomName}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded p-3 flex gap-2">
            <LinkIcon size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-300">
              <p className="font-semibold mb-1">💡 Dica:</p>
              <p>
                Compartilhe o link de convite com seus participantes. Eles poderão entrar na sala
                de videochamada clicando no link ou escaneando o QR Code.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-4 flex justify-end gap-2 bg-gray-800">
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
