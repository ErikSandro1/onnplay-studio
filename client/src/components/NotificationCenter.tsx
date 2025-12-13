import { useState, useEffect } from 'react';
import { AlertCircle, Wifi, Zap, AlertTriangle, CheckCircle, X } from 'lucide-react';

interface Notification {
  id: string;
  type: 'error' | 'warning' | 'success' | 'info';
  title: string;
  message: string;
  timestamp: number;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Simular notificações de sistema
  useEffect(() => {
    const scenarios = [
      {
        type: 'warning' as const,
        title: 'Bitrate Baixo',
        message: 'Bitrate caiu para 3.2 Mbps. Considere reduzir a qualidade.',
      },
      {
        type: 'info' as const,
        title: 'Novo Espectador',
        message: 'Você atingiu 5.000 espectadores simultâneos!',
      },
      {
        type: 'warning' as const,
        title: 'Latência Alta',
        message: 'Latência de rede: 120ms. Verifique sua conexão.',
      },
      {
        type: 'success' as const,
        title: 'Gravação Salva',
        message: 'Última gravação foi salva com sucesso em HLS.',
      },
    ];

    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
        addNotification({
          ...scenario,
          id: Date.now().toString(),
          timestamp: Date.now(),
          duration: 5000,
        });
      }
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);

    if (notification.duration) {
      setTimeout(() => {
        removeNotification(notification.id);
      }, notification.duration);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertCircle size={18} className="text-red-500" />;
      case 'warning':
        return <AlertTriangle size={18} className="text-yellow-500" />;
      case 'success':
        return <CheckCircle size={18} className="text-green-500" />;
      case 'info':
        return <Wifi size={18} className="text-blue-500" />;
      default:
        return <AlertCircle size={18} className="text-gray-500" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'bg-red-900 bg-opacity-30 border-red-700';
      case 'warning':
        return 'bg-yellow-900 bg-opacity-30 border-yellow-700';
      case 'success':
        return 'bg-green-900 bg-opacity-30 border-green-700';
      case 'info':
        return 'bg-blue-900 bg-opacity-30 border-blue-700';
      default:
        return 'bg-gray-900 bg-opacity-30 border-gray-700';
    }
  };

  return (
    <div className="fixed bottom-20 right-4 z-40 space-y-2 max-w-sm">
      {/* Notification Toast List */}
      {notifications.slice(0, 3).map(notification => (
        <div
          key={notification.id}
          className={`${getBgColor(notification.type)} border rounded-lg p-3 flex items-start gap-3 animate-in fade-in slide-in-from-right-4 duration-300`}
        >
          <div className="flex-shrink-0 mt-0.5">
            {getIcon(notification.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">{notification.title}</p>
            <p className="text-xs text-gray-300 mt-0.5">{notification.message}</p>
            {notification.action && (
              <button
                onClick={notification.action.onClick}
                className="text-xs font-semibold text-orange-500 hover:text-orange-400 mt-2 transition-colors"
              >
                {notification.action.label}
              </button>
            )}
          </div>
          <button
            onClick={() => removeNotification(notification.id)}
            className="flex-shrink-0 p-1 hover:bg-black hover:bg-opacity-20 rounded transition-colors"
          >
            <X size={14} className="text-gray-400" />
          </button>
        </div>
      ))}

      {/* Notification Center Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded transition-colors"
      >
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-orange-500" />
          <span className="text-sm font-semibold text-white">Notificações</span>
          {notifications.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full">
              {notifications.length}
            </span>
          )}
        </div>
      </button>

      {/* Notification Center Modal */}
      {isOpen && (
        <div className="absolute bottom-full mb-2 right-0 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Centro de Notificações</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
            >
              <X size={16} className="text-gray-400" />
            </button>
          </div>

          {/* Notifications List */}
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              Nenhuma notificação
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className="p-3 hover:bg-gray-700 hover:bg-opacity-30 transition-colors flex items-start gap-3"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{notification.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{notification.message}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {new Date(notification.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <button
                    onClick={() => removeNotification(notification.id)}
                    className="flex-shrink-0 p-1 hover:bg-gray-600 rounded transition-colors"
                  >
                    <X size={14} className="text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Clear All Button */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-700 p-2">
              <button
                onClick={() => setNotifications([])}
                className="w-full px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs font-semibold transition-colors"
              >
                Limpar Tudo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
