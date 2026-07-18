// Shared type definitions for onlyfeet

export type Creator = {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  coverColor: string;
  bio: string;
  subscriberCount: number;
  postCount: number;
  shortCount: number;
  subscriptionPrice: number;
  verified: boolean;
  isSubscribed: boolean;
};

export type Post = {
  id: string;
  creatorId: string;
  type: 'image' | 'video';
  placeholderColor: string;
  caption: string;
  hashtags: string[];
  likes: number;
  comments: number;
  isLocked: boolean;
  isPPV: boolean;
  ppvPrice?: number;
  createdAt: string;
};

export type Short = {
  id: string;
  creatorId: string;
  type: 'video' | 'gallery';
  placeholderColor: string;
  images?: string[];
  slideDuration?: number;
  bgm: { title: string; artist: string };
  access: 'free' | 'partial';
  freePreviewSec?: number;
  caption: string;
  hashtags: string[];
  durationSec: number;
  stats: { views: number; likes: number; comments: number; shares: number };
  isLiked?: boolean;
};
