/**
 * LiveCommentsPanel Component
 * Painel de Comentários ao Vivo - Conecta com YouTube Live Chat
 * Permite ver comentários em tempo real e mostrar na transmissão
 */
import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Youtube, X, Eye, EyeOff, Star, RefreshCw, Link2, Unlink } from 'lucide-react';
import { commentOverlayService } from '../services/CommentOverlayService';
import type { Comment } from '../types/comments';

interface YouTubeComment {
  id: string;
  authorDisplayName: string;
  authorProfileImageUrl: string;
  authorChannelId: string;
  textDisplay: string;
  publishedAt: string;
  likeCount: number;
  isSuperChat?: boolean;
  superChatAmount?: string;
}

interface LiveCommentsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LiveCommentsPanel({ isOpen, onClose }: LiveCommentsPanelProps) {
  const [videoId, setVideoId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [comments, setComments] = useState<YouTubeComment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pinnedCommentId, setPinnedCommentId] = useState<string | null>(null);
  const [starredComments, setStarredComments] = useState<Set<string>>(new Set());
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new comments arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const fetchComments = async () => {
    if (!videoId.trim()) return;

    try {
      const response = await fetch(`/api/youtube/comments/${videoId}`);
      
      if (!response.ok) {
        throw new Error('Falha ao buscar comentários');
      }

      const data = await response.json();
      
      if (data.comments && Array.isArray(data.comments)) {
        setComments(prev => {
          // Merge new comments, avoiding duplicates
          const existingIds = new Set(prev.map(c => c.id));
          const newComments = data.comments.filter((c: YouTubeComment) => !existingIds.has(c.id));
          return [...prev, ...newComments].slice(-100); // Keep last 100 comments
        });
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar comentários');
    }
  };

  const handleConnect = async () => {
    if (!videoId.trim()) {
      setError('Por favor, insira o Video ID do YouTube');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Initial fetch
      await fetchComments();
      
      // Start polling for new comments
      pollingRef.current = setInterval(fetchComments, 5000); // Poll every 5 seconds
      
      setIsConnected(true);
    } catch (err) {
      setError('Falha ao conectar. Verifique o Video ID.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsConnected(false);
    setComments([]);
  };

  const handleShowComment = (comment: YouTubeComment) => {
    // Create comment object for overlay service
    const overlayComment: Comment = {
      id: comment.id,
      platform: 'youtube',
      author: {
        id: comment.authorChannelId,
        name: comment.authorDisplayName,
        avatarUrl: comment.authorProfileImageUrl,
        badges: [],
      },
      message: comment.textDisplay,
      timestamp: new Date(comment.publishedAt).getTime(),
      isPinned: true,
      isStarred: false,
      isRead: true,
    };

    // Toggle pin
    if (pinnedCommentId === comment.id) {
      commentOverlayService.togglePin(comment.id);
      setPinnedCommentId(null);
    } else {
      // Unpin previous
      if (pinnedCommentId) {
        commentOverlayService.togglePin(pinnedCommentId);
      }
      // Add and pin new comment
      commentOverlayService.addComment(overlayComment);
      commentOverlayService.togglePin(comment.id);
      setPinnedCommentId(comment.id);
    }
  };

  const handleStarComment = (commentId: string) => {
    setStarredComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
        style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-600 rounded-lg">
              <Youtube size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Comentários ao Vivo</h2>
              <p className="text-xs text-gray-400">
                {isConnected ? `${comments.length} comentários` : 'Não conectado'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Connection Section */}
        <div className="p-4 border-b border-gray-700">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Video ID do YouTube
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={videoId}
              onChange={(e) => setVideoId(e.target.value)}
              placeholder="Ex: IRZKkZkcQH4"
              disabled={isConnected}
              className="flex-1 px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
            />
            {!isConnected ? (
              <button
                onClick={handleConnect}
                disabled={isLoading || !videoId.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                {isLoading ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Link2 size={16} />
                )}
                Conectar
              </button>
            ) : (
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <Unlink size={16} />
                Desconectar
              </button>
            )}
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-400">{error}</p>
          )}
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!isConnected ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <MessageSquare size={48} className="mb-4 opacity-30" />
              <p className="text-center">Insira o Video ID do YouTube<br />e clique em Conectar</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <RefreshCw size={32} className="mb-4 animate-spin opacity-30" />
              <p>Aguardando comentários...</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className={`
                  p-3 rounded-lg transition-all duration-200
                  ${pinnedCommentId === comment.id 
                    ? 'bg-cyan-900/40 border border-cyan-500' 
                    : 'bg-gray-800/50 border border-gray-700 hover:border-gray-600'
                  }
                  ${starredComments.has(comment.id) ? 'ring-1 ring-yellow-500/50' : ''}
                `}
              >
                {/* Comment Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <img
                      src={comment.authorProfileImageUrl}
                      alt={comment.authorDisplayName}
                      className="w-8 h-8 rounded-full flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        @{comment.authorDisplayName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTime(comment.publishedAt)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 flex-shrink-0">
                    {/* Show/Hide Button */}
                    <button
                      onClick={() => handleShowComment(comment)}
                      className={`
                        px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                        ${pinnedCommentId === comment.id
                          ? 'bg-cyan-500 text-white hover:bg-cyan-600'
                          : 'bg-orange-600 text-white hover:bg-orange-700'
                        }
                      `}
                    >
                      {pinnedCommentId === comment.id ? (
                        <>
                          <EyeOff size={12} className="inline mr-1" />
                          Ocultar
                        </>
                      ) : (
                        <>
                          <Eye size={12} className="inline mr-1" />
                          Mostrar
                        </>
                      )}
                    </button>

                    {/* Star Button */}
                    <button
                      onClick={() => handleStarComment(comment.id)}
                      className={`
                        p-1.5 rounded-lg transition-colors
                        ${starredComments.has(comment.id)
                          ? 'bg-yellow-500 text-white'
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }
                      `}
                      title="Destacar"
                    >
                      <Star size={14} fill={starredComments.has(comment.id) ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                </div>

                {/* Comment Text */}
                <p className="text-gray-200 text-sm break-words">
                  {comment.textDisplay}
                </p>

                {/* Super Chat Badge */}
                {comment.isSuperChat && (
                  <div className="mt-2 px-2 py-1 bg-yellow-600/30 rounded text-xs text-yellow-300 font-semibold">
                    💰 Super Chat: {comment.superChatAmount}
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-700 text-center">
          <p className="text-xs text-gray-500">
            Clique em "Mostrar" para exibir o comentário na transmissão
          </p>
        </div>
      </div>
    </div>
  );
}
