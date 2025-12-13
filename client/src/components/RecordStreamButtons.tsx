import React, { useState } from 'react';
import { Circle, Radio } from 'lucide-react';

const RecordStreamButtons: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [recordTime, setRecordTime] = useState('00:00:00');
  const [streamTime, setStreamTime] = useState('00:00:00');

  const handleRecordToggle = () => {
    setIsRecording(!isRecording);
    // TODO: Implementar lógica de gravação
  };

  const handleStreamToggle = () => {
    setIsStreaming(!isStreaming);
    // TODO: Implementar lógica de streaming
  };

  return (
    <div className="flex items-center gap-4">
      {/* RECORD Button */}
      <div className="flex-1">
        <button
          onClick={handleRecordToggle}
          className="w-full px-8 py-6 rounded-xl font-bold text-xl transition-all duration-200 hover:scale-105 flex items-center justify-center gap-3"
          style={{
            background: isRecording
              ? 'linear-gradient(135deg, #FF3366 0%, #FF6B00 100%)'
              : 'linear-gradient(135deg, #FF6B00 0%, #FF8833 100%)',
            color: '#FFFFFF',
            boxShadow: isRecording
              ? '0 0 30px rgba(255, 51, 102, 0.6)'
              : '0 0 30px rgba(255, 107, 0, 0.4)',
            border: isRecording ? '2px solid #FF3366' : '2px solid #FF8833',
          }}
        >
          <Circle
            size={24}
            fill={isRecording ? '#FFFFFF' : 'transparent'}
            className={isRecording ? 'animate-pulse' : ''}
          />
          <div className="flex flex-col items-start">
            <span>{isRecording ? 'STOP RECORDING' : 'START RECORD'}</span>
            {isRecording && (
              <span className="text-sm font-normal opacity-90">{recordTime}</span>
            )}
          </div>
        </button>
      </div>

      {/* STREAM Button */}
      <div className="flex-1">
        <button
          onClick={handleStreamToggle}
          className="w-full px-8 py-6 rounded-xl font-bold text-xl transition-all duration-200 hover:scale-105 flex items-center justify-center gap-3"
          style={{
            background: isStreaming
              ? 'linear-gradient(135deg, #FF3366 0%, #FF0055 100%)'
              : 'linear-gradient(135deg, #00D9FF 0%, #0099FF 100%)',
            color: '#FFFFFF',
            boxShadow: isStreaming
              ? '0 0 30px rgba(255, 51, 102, 0.6)'
              : '0 0 30px rgba(0, 217, 255, 0.4)',
            border: isStreaming ? '2px solid #FF3366' : '2px solid #00D9FF',
          }}
        >
          <Radio
            size={24}
            className={isStreaming ? 'animate-pulse' : ''}
          />
          <div className="flex flex-col items-start">
            <span>{isStreaming ? 'STOP STREAM' : 'GO LIVE'}</span>
            {isStreaming && (
              <span className="text-sm font-normal opacity-90">{streamTime}</span>
            )}
          </div>
        </button>
      </div>
    </div>
  );
};

export default RecordStreamButtons;
