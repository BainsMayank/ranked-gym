import type { DiscoverFilter } from './types';

export const socialKeys = {
  all: ['social'] as const,
  feed: ['social', 'feed'] as const,
  discover: (filters: readonly DiscoverFilter[]) =>
    ['social', 'discover', [...filters].sort()] as const,
  post: (id: string) => ['social', 'post', id] as const,
  userPosts: (userId: string) => ['social', 'user-posts', userId] as const,
  profile: (username: string) => ['social', 'profile', username.toLowerCase()] as const,
  suggestions: ['social', 'suggestions'] as const,
  search: (q: string) => ['social', 'search', q.toLowerCase()] as const,
  requests: ['social', 'requests'] as const,
  friends: ['social', 'friends'] as const,
  notifications: ['social', 'notifications'] as const,
  unread: ['social', 'unread'] as const,
  milestoneMode: ['social', 'milestone-mode'] as const,
};
