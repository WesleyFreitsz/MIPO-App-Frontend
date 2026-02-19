/**
 * TIPOS E INTERFACES GLOBAIS
 */

export type UserRole = "ADMIN" | "USER";

export interface User {
  id: string;
  name: string;
  nickname: string | null;
  city: string | null;
  avatarUrl: string | null;
  role: UserRole;
  isProfileComplete: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * FRIENDS / AMIGOS
 */

export type FriendshipStatus = "PENDING" | "ACCEPTED" | "BLOCKED";

export interface Friend {
  id: string;
  userId: string;
  friendId: string;
  status: FriendshipStatus;
  createdAt: string;
  updatedAt: string;
  friend?: User;
  user?: User;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: FriendshipStatus;
  createdAt: string;
  fromUser?: User;
  toUser?: User;
}

/**
 * POSTS / FEED
 */

export interface Post {
  id: string;
  userId: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  user?: User;
  likes?: PostLike[];
  comments?: PostComment[];
  likeCount?: number;
  commentCount?: number;
  likedByUser?: boolean;
}

export interface PostLike {
  id: string;
  postId: string;
  userId: string;
  createdAt: string;
  user?: User;
}

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

/**
 * CHAT / MENSAGENS
 */

export type ChatType = "PRIVATE" | "GROUP";
export type ChatMemberRole = "ADMIN" | "MEMBER";

export interface ChatMessage {
  id: string;
  chatId: string;
  userId: string;
  content: string;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: User;
  isRead?: boolean;
}

export interface ChatMember {
  id: string;
  chatId: string;
  userId: string;
  role: ChatMemberRole;
  joinedAt: string;
  lastReadAt?: string;
  user?: User;
}

export interface Chat {
  id: string;
  type: ChatType;
  name: string;
  description?: string;
  imageUrl?: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  members?: ChatMember[];
  messages?: ChatMessage[];
  lastMessage?: ChatMessage;
  unreadCount?: number;
}

/**
 * NOTIFICAÇÕES
 */

export type NotificationType =
  | "FRIEND_REQUEST"
  | "FRIEND_ACCEPTED"
  | "NEW_MESSAGE"
  | "GROUP_INVITE"
  | "POST_LIKE"
  | "POST_COMMENT";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  relatedUserId?: string;
  relatedChatId?: string;
  relatedPostId?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  relatedUser?: User;
  relatedChat?: Chat;
  relatedPost?: Post;
}

/**
 * RESPOSTAS DA API
 */

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  status: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
