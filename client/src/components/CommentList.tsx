/**
 * CommentList Component
 * Displays list of comments with actions (pin, star, delete)
 * Part of the UnifiedChat system
 */

import { useEffect, useState } from 'react';
import { commentOverlayService } from '../services/CommentOverlayService';
import type { Comment, CommentFilter } from '../types/comments';
import { Eye, EyeOff, Star, Trash2 } from 'lucide-react';

interface CommentListProps {
  filter?: CommentFilter;
  showActions?: boolean;
}

export function CommentList({ filter, showActions = true }: CommentListProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [config, setConfig] = useState(commentOverlayService.getConfig());

  useEffect(() => {
    const updateComments = () => {
      setComments(commentOverlayService.getComments(filter));
      setConfig(commentOverlayService.getConfig());
    };

    const unsubscribe = commentOverlayService.subscribe(updateComments);
    updateComments();

    return unsubscribe;
  }, [filter]);

  const handleTogglePin = (commentId: string) => {
    commentOverlayService.togglePin(commentId);
  };

  const handleToggleStar = (comment: Comment) => {
    if (comment.isStarred) {
      commentOverlayService.unstarComment(comment.id);
    } else {
      commentOverlayService.starComment(comment.id);
    }
  };

  const handleDelete = (commentId: string) => {
    if (confirm('Deletar este comentário?')) {
      commentOverlayService.deleteComment(commentId);
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'youtube':
        return 'bg-red-500';
      case 'twitch':
        return 'bg-purple-500';
      case 'facebook':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (comments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <p className="text-lg">Nenhum comentário ainda</p>
        <p className="text-sm mt-2">Comentários aparecerão aqui em tempo real</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 overflow-y-auto max-h-[600px] pr-2">
      {comments.map((comment) => (
        <div
          key={comment.id}
          className={`
            bg-gray-800 rounded-lg p-3 transition-all duration-200
            ${comment.isPinned ? 'ring-2 ring-cyan-400' : ''}
            ${comment.isStarred ? 'bg-yellow-900/30' : ''}
            hover:bg-gray-750
          `}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* Avatar */}
              <img
                src={comment.author.avatarUrl}
                alt={comment.author.name}
                className="w-8 h-8 rounded-full flex-shrink-0"
              />

              {/* Author Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white truncate">
                    {comment.author.name}
                  </span>

                  {/* Badges */}
                  {comment.author.badges.length > 0 && (
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

                  {/* Platform Badge */}
                  <span className={`text-xs px-1.5 py-0.5 rounded ${getPlatformColor(comment.platform)} text-white`}>
                    {comment.platform.toUpperCase()}
                  </span>
                </div>

                <span className="text-xs text-gray-400">
                  {new Date(comment.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>

            {/* Actions */}
            {showActions && (
              <div className="flex gap-1 flex-shrink-0">
                {/* Pin/Unpin */}
                <button
                  onClick={() => handleTogglePin(comment.id)}
                  className={`
                    p-1.5 rounded transition-colors
                    ${comment.isPinned 
                      ? 'bg-cyan-500 text-white hover:bg-cyan-600' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }
                  `}
                  title={comment.isPinned ? 'Esconder da tela' : 'Mostrar na tela'}
                >
                  {comment.isPinned ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>

                {/* Star */}
                <button
                  onClick={() => handleToggleStar(comment)}
                  className={`
                    p-1.5 rounded transition-colors
                    ${comment.isStarred 
                      ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }
                  `}
                  title={comment.isStarred ? 'Remover destaque' : 'Destacar'}
                >
                  <Star size={14} fill={comment.isStarred ? 'currentColor' : 'none'} />
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="p-1.5 rounded bg-gray-700 text-gray-300 hover:bg-red-600 hover:text-white transition-colors"
                  title="Deletar comentário"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Message */}
          <p className="text-gray-200 break-words">{comment.message}</p>

          {/* Super Chat Info */}
          {comment.metadata?.superChat && (
            <div className="mt-2 px-2 py-1 rounded text-sm font-semibold"
                 style={{ backgroundColor: comment.metadata.superChat.color }}>
              💰 Super Chat: {comment.metadata.superChat.currency} {comment.metadata.superChat.amount}
            </div>
          )}

          {/* Member Milestone */}
          {comment.metadata?.membershipMonths && (
            <div className="mt-2 px-2 py-1 rounded bg-green-900/50 text-sm">
              🎖️ Membro há {comment.metadata.membershipMonths} meses!
            </div>
          )}

          {/* Gifted Memberships */}
          {comment.metadata?.giftedMemberships && (
            <div className="mt-2 px-2 py-1 rounded bg-purple-900/50 text-sm">
              🎁 Presenteou {comment.metadata.giftedMemberships} memberships!
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
