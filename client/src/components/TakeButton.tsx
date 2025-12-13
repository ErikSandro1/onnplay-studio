import { useState } from 'react';

interface TakeButtonProps {
  onClick?: () => void;
  disabled?: boolean;
}

export default function TakeButton({ onClick, disabled = false }: TakeButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const handleMouseDown = () => {
    if (!disabled) setIsPressed(true);
  };

  const handleMouseUp = () => {
    setIsPressed(false);
  };

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        disabled={disabled}
        className={`take-button ${isPressed ? 'active' : ''} ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        TAKE
      </button>
      <p className="text-xs text-gray-500 font-mono">Press to switch</p>
    </div>
  );
}
