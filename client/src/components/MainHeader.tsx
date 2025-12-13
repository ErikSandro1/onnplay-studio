import React from 'react';
import { Menu } from 'lucide-react';

interface MainHeaderProps {
  onMenuClick?: () => void;
}

const MainHeader: React.FC<MainHeaderProps> = ({ onMenuClick }) => {
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

      {/* Menu Button */}
      <button
        onClick={onMenuClick}
        className="p-3 rounded-lg transition-all duration-200 hover:bg-[#1E2842]"
        style={{ color: '#B8C5D6' }}
      >
        <Menu size={28} />
      </button>
    </div>
  );
};

export default MainHeader;
