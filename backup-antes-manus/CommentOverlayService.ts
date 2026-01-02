/**
 * CommentOverlayService
 * Manages comment overlays on the broadcast screen
 * Inspired by StreamYard's Chat Overlay feature
 */

import type {
  Comment,
  CommentOverlayConfig,
  CommentFilter,
} from '../types/comments';
import { DEFAULT_COMMENT_OVERLAY_CONFIG } from '../types/comments';

type Observer = () => void;

export class CommentOverlayService {
  private static instance: CommentOverlayService;
  
  // State
  private comments: Comment[] = [];
  private pinnedComments: Comment[] = [];
  private config: CommentOverlayConfig = { ...DEFAULT_COMMENT_OVERLAY_CONFIG };
  private observers: Set<Observer> = new Set();
  
  // Auto-hide timers
  private hideTimers: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    // Singleton pattern
  }

  static getInstance(): CommentOverlayService {
    if (!CommentOverlayService.instance) {
      CommentOverlayService.instance = new CommentOverlayService();
    }
    return CommentOverlayService.instance;
  }

  // Observer pattern
  subscribe(observer: Observer): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  private notify(): void {
    this.observers.forEach(observer => observer());
  }

  // Comment management
  addComment(comment: Comment): void {
    this.comments.push(comment);
    
    // Auto-show if enabled
    if (this.config.autoShow) {
      this.pinComment(comment.id);
    }
    
    this.notify();
  }

  addComments(comments: Comment[]): void {
    comments.forEach(comment => this.addComment(comment));
  }

  getComments(filter?: CommentFilter): Comment[] {
    let filtered = [...this.comments];

    if (filter) {
      if (filter.platforms) {
        filtered = filtered.filter(c => filter.platforms!.includes(c.platform));
      }
      if (filter.onlyStarred) {
        filtered = filtered.filter(c => c.isStarred);
      }
      if (filter.onlyPinned) {
        filtered = filtered.filter(c => c.isPinned);
      }
      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        filtered = filtered.filter(c =>
          c.message.toLowerCase().includes(query) ||
          c.author.name.toLowerCase().includes(query)
        );
      }
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  getPinnedComments(): Comment[] {
    return [...this.pinnedComments];
  }

  pinComment(commentId: string): void {
    const comment = this.comments.find(c => c.id === commentId);
    if (!comment) return;

    // Check max visible limit
    if (this.pinnedComments.length >= this.config.maxVisible) {
      // Remove oldest pinned comment
      const oldest = this.pinnedComments[0];
      this.unpinComment(oldest.id);
    }

    comment.isPinned = true;
    this.pinnedComments.push(comment);

    // Auto-hide after duration
    if (this.config.duration > 0) {
      const timer = setTimeout(() => {
        this.unpinComment(commentId);
      }, this.config.duration * 1000);
      
      this.hideTimers.set(commentId, timer);
    }

    this.notify();
  }

  unpinComment(commentId: string): void {
    const comment = this.comments.find(c => c.id === commentId);
    if (!comment) return;

    comment.isPinned = false;
    this.pinnedComments = this.pinnedComments.filter(c => c.id !== commentId);

    // Clear timer
    const timer = this.hideTimers.get(commentId);
    if (timer) {
      clearTimeout(timer);
      this.hideTimers.delete(commentId);
    }

    this.notify();
  }

  togglePin(commentId: string): void {
    const comment = this.comments.find(c => c.id === commentId);
    if (!comment) return;

    if (comment.isPinned) {
      this.unpinComment(commentId);
    } else {
      this.pinComment(commentId);
    }
  }

  starComment(commentId: string): void {
    const comment = this.comments.find(c => c.id === commentId);
    if (comment) {
      comment.isStarred = true;
      this.notify();
    }
  }

  unstarComment(commentId: string): void {
    const comment = this.comments.find(c => c.id === commentId);
    if (comment) {
      comment.isStarred = false;
      this.notify();
    }
  }

  deleteComment(commentId: string): void {
    this.unpinComment(commentId);
    this.comments = this.comments.filter(c => c.id !== commentId);
    this.notify();
  }

  clearAllComments(): void {
    // Clear all timers
    this.hideTimers.forEach(timer => clearTimeout(timer));
    this.hideTimers.clear();

    this.comments = [];
    this.pinnedComments = [];
    this.notify();
  }

  clearPinnedComments(): void {
    this.pinnedComments.forEach(comment => {
      this.unpinComment(comment.id);
    });
  }

  // Configuration
  getConfig(): CommentOverlayConfig {
    return { ...this.config };
  }

  updateConfig(partial: Partial<CommentOverlayConfig>): void {
    this.config = { ...this.config, ...partial };
    this.notify();
  }

  resetConfig(): void {
    this.config = { ...DEFAULT_COMMENT_OVERLAY_CONFIG };
    this.notify();
  }

  // Auto-show toggle (Chat Overlay mode)
  setAutoShow(enabled: boolean): void {
    this.config.autoShow = enabled;
    this.notify();
  }

  // Statistics
  getStats() {
    const total = this.comments.length;
    const pinned = this.pinnedComments.length;
    const starred = this.comments.filter(c => c.isStarred).length;
    
    const byPlatform = this.comments.reduce((acc, comment) => {
      acc[comment.platform] = (acc[comment.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      pinned,
      starred,
      byPlatform,
    };
  }
}

// Export singleton instance
export const commentOverlayService = CommentOverlayService.getInstance();
