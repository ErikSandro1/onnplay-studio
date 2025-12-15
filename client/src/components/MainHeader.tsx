import React from 'react';
import { Menu, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'wouter';

interface MainHeaderProps {
  onMenuClick?: () => void;
}

const MainHeader: React.FC<MainHeaderProps> = ({ onMenuClick }) => {
  const { logout, user } = useAuth();
  const [, setLocation] = useLocation();
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [showMainMenu, setShowMainMenu] = React.useState(false);

  const handleLogout = () => {
    logout();
    setLocation('/login-new');
  };

  return (
    <div
      className="px-6 py-4 flex items-center justify-between"
      style={{
        background: '#0A0E1A',
        borderBottom: '2px solid #1E2842',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <img
          src="/logo-onnplay.png"
          alt="OnnPlay"
          className="h-10"
          style={{ filter: 'drop-shadow(0 0 10px rgba(255, 107, 0, 0.5))' }}
        />
        <span
          className="text-2xl font-bold tracking-wide"
          style={{
            background: 'linear-gradient(135deg, #FF6B00 0%, #FFB800 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          OnnPlay
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        {/* User Profile */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-[#1E2842]"
              style={{ color: '#B8C5D6' }}
            >
              {/* Avatar */}
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-8 h-8 rounded-full border-2"
                  style={{ borderColor: '#FF6B00' }}
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: '#FF6B00', color: '#0A0E1A' }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              {/* Name */}
              <span className="text-sm font-medium">{user.name}</span>
            </button>

            {/* User Menu Dropdown */}
            {showUserMenu && (
              <div
                className="absolute right-0 mt-2 w-64 rounded-lg shadow-lg z-50"
                style={{ background: '#1E2842', border: '1px solid #2A3F5F' }}
              >
                <div className="p-4 border-b" style={{ borderColor: '#2A3F5F' }}>
                  <p className="text-sm font-medium" style={{ color: '#FFFFFF' }}>
                    {user.name}
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#B8C5D6' }}>
                    {user.email}
                  </p>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setLocation('/settings');
                    }}
                    className="text-xs mt-2 px-2 py-1 rounded inline-block transition-all duration-200 hover:opacity-80 cursor-pointer"
                    style={{ background: '#FF6B00', color: '#FFFFFF' }}
                    title="Clique para gerenciar assinatura"
                  >
                    {user.plan.toUpperCase()} {user.plan === 'free' && '→ UPGRADE'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 hover:bg-[#1E2842]"
          style={{ color: '#B8C5D6' }}
          title="Sair"
        >
          <LogOut size={20} />
          <span className="text-sm font-medium">Sair</span>
        </button>

        {/* Menu Button */}
        <div className="relative">
          <button
            onClick={() => setShowMainMenu(!showMainMenu)}
            className="p-3 rounded-lg transition-all duration-200 hover:bg-[#1E2842]"
            style={{ color: '#B8C5D6' }}
            title="Menu"
          >
            <Menu size={28} />
          </button>

          {/* Main Menu Dropdown */}
          {showMainMenu && (
            <div
              className="absolute right-0 mt-2 w-56 rounded-lg shadow-lg z-50"
              style={{ background: '#1E2842', border: '1px solid #2A3F5F' }}
            >
              <div className="py-2">
                <button
                  onClick={() => {
                    setShowMainMenu(false);
                    setLocation('/settings');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 transition-all duration-200 hover:bg-[#0A0E1A]"
                  style={{ color: '#B8C5D6' }}
                >
                  <Settings size={20} />
                  <span className="text-sm font-medium">Configurações</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MainHeader;
