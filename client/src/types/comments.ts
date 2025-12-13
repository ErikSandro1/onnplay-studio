/**
 * Types for the Comment System
 * Inspired by StreamYard's comment overlay features
 */

export type CommentPlatform = 'youtube' | 'twitch' | 'facebook' | 'internal';

export interface Badge {
  id: string;
  name: string;
  iconUrl: string;
  color?: string; // Badge color (e.g., gold for members)
}

export interface SuperChat {
  amount: number;
  currency: string;
  color: string; // Background color based on amount
}

export interface CommentAuthor {
  id: string;
  name: string;
  avatarUrl: string;
  badges: Badge[];
}

export interface Comment {
  id: string;
  platform: CommentPlatform;
  author: CommentAuthor;
  message: string;
  timestamp: number;
  isPinned: boolean; // Shown on screen
  isStarred: boolean; // Highlighted in chat (Super Chats, etc.)
  isRead: boolean;
  metadata?: {
    superChat?: SuperChat;
    membershipMonths?: number; // For member milestones
    giftedMemberships?: number; // Number of memberships gifted
  };
}

export interface CommentOverlayConfig {
  // Layout
  position: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  dimension: 'regular' | 'tall' | 'wide';
  
  // Typography
  fontSize: 'small' | 'medium' | 'big';
  
  // Behavior
  autoShow: boolean; // Auto-show all comments (Chat Overlay mode)
  duration: number; // Auto-hide after X seconds (0 = manual)
  maxVisible: number; // Max comments visible at once
  
  // Appearance
  theme: 'light' | 'dark' | 'custom';
  brandColor: string; // Primary color
  backgroundColor: string;
  textColor: string;
  showAvatar: boolean;
  showBadges: boolean;
  showTimestamp: boolean;
  
  // Animation
  animationType: 'slide' | 'fade' | 'scale' | 'none';
  animationDuration: number; // in ms
}

export interface CommentFilter {
  platforms?: CommentPlatform[];
  onlyStarred?: boolean;
  onlyPinned?: boolean;
  searchQuery?: string;
}

export const DEFAULT_COMMENT_OVERLAY_CONFIG: CommentOverlayConfig = {
  position: 'bottom-center',
  dimension: 'regular',
  fontSize: 'medium',
  autoShow: false,
  duration: 10, // 10 seconds
  maxVisible: 3,
  theme: 'dark',
  brandColor: '#FF6B00', // OnnPlay orange
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  textColor: '#FFFFFF',
  showAvatar: true,
  showBadges: true,
  showTimestamp: false,
  animationType: 'slide',
  animationDuration: 300,
};

// Badge presets for common platforms
export const YOUTUBE_BADGES = {
  MEMBER: { id: 'yt-member', name: 'Member', iconUrl: '/badges/yt-member.svg', color: '#00FF00' },
  MODERATOR: { id: 'yt-mod', name: 'Moderator', iconUrl: '/badges/yt-mod.svg', color: '#5E84F1' },
  VERIFIED: { id: 'yt-verified', name: 'Verified', iconUrl: '/badges/yt-verified.svg', color: '#AAAAAA' },
};

export const TWITCH_BADGES = {
  SUBSCRIBER: { id: 'tw-sub', name: 'Subscriber', iconUrl: '/badges/tw-sub.svg', color: '#9147FF' },
  MODERATOR: { id: 'tw-mod', name: 'Moderator', iconUrl: '/badges/tw-mod.svg', color: '#00FF00' },
  VIP: { id: 'tw-vip', name: 'VIP', iconUrl: '/badges/tw-vip.svg', color: '#FF1493' },
  TURBO: { id: 'tw-turbo', name: 'Turbo', iconUrl: '/badges/tw-turbo.svg', color: '#6441A4' },
};

export const FACEBOOK_BADGES = {
  TOP_FAN: { id: 'fb-topfan', name: 'Top Fan', iconUrl: '/badges/fb-topfan.svg', color: '#1877F2' },
  SUPPORTER: { id: 'fb-supporter', name: 'Supporter', iconUrl: '/badges/fb-supporter.svg', color: '#FF6B00' },
};
