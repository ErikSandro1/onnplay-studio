import React, { useState } from 'react';

const RecordStreamButtons: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const handleRecordToggle = () => {
    setIsRecording(!isRecording);
    // TODO: Implementar lógica de gravação
  };

  const handleStreamToggle = () => {
    setIsStreaming(!isStreaming);
    // TODO: Implementar lógica de streaming
  };

  return (
    <div className="flex items-center justify-start gap-8 h-full">
      {/* RECORD Button - Circular */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={handleRecordToggle}
          className="w-32 h-32 rounded-full transition-all duration-200 hover:scale-110 flex items-center justify-center"
          style={{
            background: '#FF6B00',
            boxShadow: isRecording
              ? '0 0 40px rgba(255, 107, 0, 0.8)'
              : '0 0 20px rgba(255, 107, 0, 0.4)',
            border: '4px solid #FF8833',
          }}
        >
          <div
            className={`w-16 h-16 rounded-full ${
              isRecording ? 'rounded-md w-12 h-12' : ''
            } transition-all duration-200`}
            style={{
              background: '#FFFFFF',
            }}
          />
        </button>
        <span
          className="text-lg font-bold tracking-wide"
          style={{ color: '#FF6B00' }}
        >
          RECORD
        </span>
      </div>

      {/* STREAM Button - Circular */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={handleStreamToggle}
          className="w-32 h-32 rounded-full transition-all duration-200 hover:scale-110 flex items-center justify-center"
          style={{
            background: '#00D9FF',
            boxShadow: isStreaming
              ? '0 0 40px rgba(0, 217, 255, 0.8)'
              : '0 0 20px rgba(0, 217, 255, 0.4)',
            border: '4px solid #00AAFF',
          }}
        >
          <div
            className="w-16 h-16 rounded-full animate-pulse"
            style={{
              background: '#FFFFFF',
              opacity: isStreaming ? 1 : 0.7,
            }}
          />
        </button>
        <span
          className="text-lg font-bold tracking-wide"
          style={{ color: '#00D9FF' }}
        >
          STREAM
        </span>
      </div>
    </div>
  );
};

export default RecordStreamButtons;
