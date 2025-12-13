/**
 * CommentOverlay Component
 * Displays pinned comments on the broadcast screen
 * Inspired by StreamYard's Chat Overlay
 */

import { useEffect, useState } from 'react';
import { commentOverlayService } from '../services/CommentOverlayService';
import type { Comment, CommentOverlayConfig } from '../types/comments';

export function CommentOverlay() {
  const [pinnedComments, setPinnedComments] = useState<Comment[]>([]);
  const [config, setConfig] = useState<CommentOverlayConfig>(commentOverlayService.getConfig());

  useEffect(() => {
    const updateComments = () => {
      setPinnedComments(commentOverlayService.getPinnedComments());
      setConfig(commentOverlayService.getConfig());
    };

    const unsubscribe = commentOverlayService.subscribe(updateComments);
    updateComments();

    return unsubscribe;
  }, []);

  if (pinnedComments.length === 0) {
    return null;
  }

  const getPositionClasses = () => {
    const base = 'fixed z-50';
    switch (config.position) {
      case 'top-left':
        return `${base} top-4 left-4`;
      case 'top-center':
        return `${base} top-4 left-1/2 -translate-x-1/2`;
      case 'top-right':
        return `${base} top-4 right-4`;
      case 'bottom-left':
        return `${base} bottom-4 left-4`;
      case 'bottom-center':
        return `${base} bottom-4 left-1/2 -translate-x-1/2`;
      case 'bottom-right':
        return `${base} bottom-4 right-4`;
      default:
        return `${base} bottom-4 left-1/2 -translate-x-1/2`;
    }
  };

  const getDimensionClasses = () => {
    switch (config.dimension) {
      case 'tall':
        return 'w-80 max-h-96';
      case 'wide':
        return 'w-[600px] max-h-48';
      case 'regular':
      default:
        return 'w-96 max-h-64';
    }
  };

  const getFontSizeClasses = () => {
    switch (config.fontSize) {
      case 'small':
        return 'text-sm';
      case 'big':
        return 'text-lg';
      case 'medium':
      default:
        return 'text-base';
    }
  };

  const getAnimationClasses = () => {
    switch (config.animationType) {
      case 'fade':
        return 'animate-fade-in';
      case 'scale':
        return 'animate-scale-in';
      case 'slide':
        return config.position.startsWith('top') ? 'animate-slide-down' : 'animate-slide-up';
      case 'none':
      default:
        return '';
    }
  };

  return (
    <div className={`${getPositionClasses()} ${getDimensionClasses()} flex flex-col gap-2`}>
      {pinnedComments.map((comment) => (
        <div
          key={comment.id}
          className={`
            ${getAnimationClasses()}
            ${getFontSizeClasses()}
            rounded-lg shadow-2xl overflow-hidden
            transition-all duration-300
          `}
          style={{
            backgroundColor: comment.metadata?.superChat?.color || config.backgroundColor,
            color: config.textColor,
            borderLeft: `4px solid ${config.brandColor}`,
          }}
        >
          <div className="p-3 flex gap-3">
            {/* Avatar */}
            {config.showAvatar && (
              <div className="flex-shrink-0">
                <img
                  src={comment.author.avatarUrl}
                  alt={comment.author.name}
                  className="w-10 h-10 rounded-full border-2"
                  style={{ borderColor: config.brandColor }}
                />
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Author + Badges */}
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold truncate">{comment.author.name}</span>
                
                {/* Badges */}
                {config.showBadges && comment.author.badges.length > 0 && (
                  <div className="flex gap-1">
                    {comment.author.badges.map((badge) => (
                      <img
                        key={badge.id}
                        src={badge.iconUrl}
                        alt={badge.name}
                        title={badge.name}
                        className="w-4 h-4"
                      />
                    ))}
                  </div>
                )}

                {/* Super Chat Amount */}
                {comment.metadata?.superChat && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-white/20">
                    {comment.metadata.superChat.currency} {comment.metadata.superChat.amount}
                  </span>
                )}
              </div>

              {/* Message */}
              <p className="break-words">{comment.message}</p>

              {/* Timestamp */}
              {config.showTimestamp && (
                <span className="text-xs opacity-60 mt-1 block">
                  {new Date(comment.timestamp).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
