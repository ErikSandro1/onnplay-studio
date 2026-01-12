import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react';
import { mediaSourceService, MediaSource } from '../services/MediaSourceService';

interface MediaControlsProps {
  source: MediaSource | null;
  target: 'preview' | 'program';
  videoRef?: React.RefObject<HTMLVideoElement>;
}

export const MediaControls: React.FC<MediaControlsProps> = ({ source, target, videoRef }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  // Atualizar estado quando a fonte mudar
  useEffect(() => {
    if (!source || source.type !== 'video') {
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    const video = source.element as HTMLVideoElement;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration || 0);
    const updatePlaying = () => setIsPlaying(!video.paused);

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('play', updatePlaying);
    video.addEventListener('pause', updatePlaying);

    // Estado inicial
    setDuration(video.duration || 0);
    setCurrentTime(video.currentTime || 0);
    setIsPlaying(!video.paused);
    setIsMuted(video.muted);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('play', updatePlaying);
      video.removeEventListener('pause', updatePlaying);
    };
  }, [source]);

  // Também escutar o videoRef se fornecido
  useEffect(() => {
    if (!videoRef?.current) return;

    const video = videoRef.current;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration || 0);
    const updatePlaying = () => setIsPlaying(!video.paused);

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('play', updatePlaying);
    video.addEventListener('pause', updatePlaying);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('play', updatePlaying);
      video.removeEventListener('pause', updatePlaying);
    };
  }, [videoRef]);

  const handlePlayPause = () => {
    if (!source || source.type !== 'video') return;

    if (isPlaying) {
      mediaSourceService.pauseVideo(source.id);
    } else {
      mediaSourceService.playVideo(source.id);
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!source || source.type !== 'video' || !progressRef.current) return;

    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;

    mediaSourceService.seekVideo(source.id, newTime);
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    
    if (source?.type === 'video') {
      const video = source.element as HTMLVideoElement;
      if (video) {
        video.volume = newVolume;
        video.muted = newVolume === 0;
        setIsMuted(newVolume === 0);
      }
    }
  };

  const toggleMute = () => {
    if (source?.type === 'video') {
      const video = source.element as HTMLVideoElement;
      if (video) {
        video.muted = !video.muted;
        setIsMuted(video.muted);
      }
    }
  };

  const skipBackward = () => {
    if (!source || source.type !== 'video') return;
    const newTime = Math.max(0, currentTime - 10);
    mediaSourceService.seekVideo(source.id, newTime);
    setCurrentTime(newTime);
  };

  const skipForward = () => {
    if (!source || source.type !== 'video') return;
    const newTime = Math.min(duration, currentTime + 10);
    mediaSourceService.seekVideo(source.id, newTime);
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Não mostrar controles se não for vídeo
  if (!source || source.type !== 'video') {
    return null;
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 opacity-0 hover:opacity-100 transition-opacity duration-300"
      style={{ zIndex: 50 }}
    >
      {/* Barra de progresso */}
      <div 
        ref={progressRef}
        className="w-full h-1.5 bg-gray-700 rounded-full cursor-pointer mb-2 group"
        onClick={handleSeek}
      >
        <div 
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full relative"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Controles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Skip backward */}
          <button
            onClick={skipBackward}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white"
            title="Voltar 10s"
          >
            <SkipBack size={16} />
          </button>

          {/* Play/Pause */}
          <button
            onClick={handlePlayPause}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white"
            title={isPlaying ? 'Pausar' : 'Reproduzir'}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>

          {/* Skip forward */}
          <button
            onClick={skipForward}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white"
            title="Avançar 10s"
          >
            <SkipForward size={16} />
          </button>

          {/* Volume */}
          <div 
            className="relative flex items-center"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <button
              onClick={toggleMute}
              className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white"
              title={isMuted ? 'Ativar som' : 'Mutar'}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            
            {showVolumeSlider && (
              <div className="absolute left-full ml-2 bg-black/80 rounded-lg px-2 py-1">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 accent-cyan-500"
                />
              </div>
            )}
          </div>

          {/* Tempo */}
          <span className="text-white text-xs font-mono ml-2">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Label do target */}
        <span 
          className="text-xs font-bold px-2 py-0.5 rounded"
          style={{ 
            background: target === 'preview' ? 'rgba(0, 217, 255, 0.3)' : 'rgba(255, 107, 0, 0.3)',
            color: target === 'preview' ? '#00D9FF' : '#FF6B00'
          }}
        >
          {target.toUpperCase()}
        </span>
      </div>
    </div>
  );
};

export default MediaControls;
