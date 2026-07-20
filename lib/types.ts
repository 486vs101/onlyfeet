// Shared type definitions for onlyfeet

export type Creator = {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  avatarUrl?: string | null;
  coverColor: string;
  coverUrl?: string | null;
  bio: string;
  subscriberCount: number;
  postCount: number;
  shortCount: number;
  subscriptionPrice: number;
  verified: boolean;
  isSubscribed: boolean;
  ownerId?: string | null;
};

export type MediaItem = { url: string; duration: number };

export type Post = {
  id: string;
  creatorId: string;
  type: 'image' | 'video' | 'gallery';
  placeholderColor: string;
  caption: string;
  hashtags: string[];
  likes: number;
  comments: number;
  isLocked: boolean;
  isPPV: boolean;
  ppvPrice?: number;
  createdAt: string;
  mediaUrl?: string | null;
  coverUrl?: string | null;
  thumbnailUrl?: string | null;
  images?: MediaItem[] | null;
  bgmUrl?: string | null;
  bgmTitle?: string | null;
  bgmArtist?: string | null;
  isPinned?: boolean;
};

export type Short = {
  id: string;
  creatorId: string;
  type: 'video' | 'gallery';
  placeholderColor: string;
  images?: MediaItem[] | null;
  slideDuration?: number;
  bgm: { title: string; artist: string };
  access: 'free' | 'partial';
  freePreviewSec?: number;
  caption: string;
  hashtags: string[];
  durationSec: number;
  stats: { views: number; likes: number; comments: number; shares: number };
  isLiked?: boolean;
  mediaUrl?: string | null;
  coverUrl?: string | null;
  thumbnailUrl?: string | null;
  bgmUrl?: string | null;
  isLocked?: boolean;
  ppvPrice?: number;
  isPinned?: boolean;
};
