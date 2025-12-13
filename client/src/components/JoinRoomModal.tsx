import React, { useState } from 'react';
import { useDailyContext } from '../contexts/DailyContext';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({ isOpen, onClose }) => {
  const [roomUrl, setRoomUrl] = useState('');
  const [userName, setUserName] = useState('Host');
  const { joinRoom, isConnecting, error } = useDailyContext();

  const handleJoin = async () => {
    if (!roomUrl.trim()) {
      alert('Please enter a room URL');
      return;
    }

    try {
      await joinRoom(roomUrl.trim(), userName.trim());
      onClose();
    } catch (err) {
      console.error('Failed to join room:', err);
    }
  };

  const handleCreateTestRoom = () => {
    // For testing, use Daily.co's demo room
    setRoomUrl('https://your-domain.daily.co/test-room');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold text-white mb-4">Join Video Room</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500 bg-opacity-20 border border-red-500 rounded text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-cyan-500"
              placeholder="Enter your name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Room URL
            </label>
            <input
              type="text"
              value={roomUrl}
              onChange={(e) => setRoomUrl(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-cyan-500"
              placeholder="https://your-domain.daily.co/room-name"
            />
            <p className="mt-1 text-xs text-gray-400">
              Enter a Daily.co room URL or{' '}
              <button
                onClick={handleCreateTestRoom}
                className="text-cyan-400 hover:text-cyan-300 underline"
              >
                use test room
              </button>
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleJoin}
            disabled={isConnecting}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded font-medium hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? 'Joining...' : 'Join Room'}
          </button>
          <button
            onClick={onClose}
            disabled={isConnecting}
            className="px-4 py-2 bg-gray-700 text-white rounded font-medium hover:bg-gray-600 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>

        <div className="mt-4 p-3 bg-blue-500 bg-opacity-10 border border-blue-500 rounded">
          <p className="text-sm text-blue-300">
            <strong>💡 Tip:</strong> Create a free room at{' '}
            <a
              href="https://dashboard.daily.co/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-blue-200"
            >
              dashboard.daily.co
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
