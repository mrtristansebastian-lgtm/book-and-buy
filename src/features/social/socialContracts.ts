export type SocialContentType = 'image' | 'video' | 'vertical' | 'text';
export type SocialPublicationState = 'draft' | 'scheduled' | 'published' | 'archived' | 'deleted';
export type SocialModerationState = 'pending' | 'visible' | 'limited' | 'hidden' | 'removed';
export type SocialMediaState = 'legacy' | 'uploading' | 'processing' | 'ready' | 'failed' | 'blocked' | 'deleted';

export type SocialCounts = {
  likes: number;
  comments: number;
  shares: number;
  saves?: number;
  plays?: number;
};

export type MediaAsset = {
  provider: 'firebase' | 'cloudflare';
  assetId: string;
  state: SocialMediaState;
  playbackUrl?: string;
  posterUrl?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
};

export type SocialPost = {
  id: string;
  legacyId?: string;
  ownerId: string;
  businessSlug: string;
  businessName: string;
  type: SocialContentType;
  title?: string;
  caption?: string;
  status: SocialPublicationState;
  moderationState: SocialModerationState;
  media?: MediaAsset;
  counts: SocialCounts;
  rankScore?: number;
  createdAtMs: number;
  publishedAtMs?: number;
  updatedAtMs: number;
  deletedAtMs?: number;
  version: number;
};

export type SocialComment = {
  id: string;
  postId: string;
  parentId?: string;
  authorUid: string;
  authorName: string;
  body: string;
  likeCount: number;
  replyCount: number;
  moderationState: SocialModerationState;
  createdAtMs: number;
  updatedAtMs?: number;
};

export type SocialNotification = {
  id: string;
  type: string;
  actorUid: string;
  actorName: string;
  businessSlug?: string;
  postId?: string;
  commentId?: string;
  groupedCount: number;
  createdAtMs: number;
  readAtMs: number | null;
};

export type FeedCursor = { id: string; createdAtMs?: number; publishedAtMs?: number; score?: number };
export type PaginatedResult<T> = { items: T[]; nextCursor: FeedCursor | null; hasMore: boolean };

export type MutationRequest<T extends object = Record<string, never>> = T & { mutationId: string };
export type MutationResult<T extends object = Record<string, never>> = T & {
  ok: boolean;
  mutationId: string;
  version: number;
  retryable?: boolean;
};

export type ModerationCase = {
  id: string;
  subjectType: 'post' | 'comment' | 'profile' | 'business';
  subjectId: string;
  reporterUid: string;
  reason: string;
  status: 'open' | 'reviewing' | 'actioned' | 'dismissed' | 'appealed' | 'resolved';
  createdAtMs: number;
  updatedAtMs: number;
};

export type NotificationPreference = {
  inApp: boolean;
  push: boolean;
  likes: boolean;
  shares: boolean;
  comments: boolean;
  replies: boolean;
  follows: boolean;
  quietHours?: { start: string; end: string; timezone: string } | null;
};
