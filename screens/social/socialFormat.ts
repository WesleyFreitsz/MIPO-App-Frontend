export interface SocialUser {
  id: string;
  name: string;
  nickname?: string | null;
  avatarUrl?: string | null;
}

export interface SocialChat {
  id: string;
  type: string;
  name?: string;
  imageUrl?: string | null;
  members?: { userId: string; user?: SocialUser }[];
  unreadCount?: number;
  lastMessage?: { content?: string | null; createdAt: string } | null;
}

export interface ChatDisplay {
  title: string;
  avatar: string | null | undefined;
  targetId: string | undefined;
}

export type ChatFilter = "ALL" | "PRIVATE" | "GROUPS";

export function chatDisplay(chat: SocialChat, userId: string | undefined): ChatDisplay {
  if (chat.type !== "PRIVATE") return { title: chat.name ?? "", avatar: chat.imageUrl, targetId: chat.id };
  const other = chat.members?.find((member) => member.userId !== userId)?.user;
  return { title: other?.nickname || other?.name || "Usuário", avatar: other?.avatarUrl, targetId: other?.id };
}

export function filterChats<T extends { type: string }>(chats: T[] | undefined, filter: ChatFilter): T[] {
  return (chats ?? []).filter((chat) => {
    if (filter === "PRIVATE") return chat.type === "PRIVATE";
    if (filter === "GROUPS") return chat.type === "GROUP" || chat.type === "EVENT";
    return true;
  });
}

export function filterAvailableUsers<T extends { name?: string | null; nickname?: string | null }>(users: T[] | undefined, query: string): T[] {
  const term = query.trim().replace(/^@/, "").toLowerCase();
  if (!term) return users ?? [];
  return (users ?? []).filter(
    (user) => user.nickname?.toLowerCase().includes(term) || user.name?.toLowerCase().includes(term),
  );
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

const pad = (value: number) => String(value).padStart(2, "0");

function dayDifference(date: Date, now: Date): number {
  return Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
}

export function relativeTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  const days = dayDifference(date, now);
  if (days === 0) {
    if (minutes < 1) return "agora";
    if (minutes < 60) return `há ${minutes} min`;
    return `há ${Math.floor(minutes / 60)} h`;
  }
  if (days === 1) return "ontem";
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}

export function formatChatTime(iso: string | undefined, now: Date = new Date()): string {
  if (!iso) return "";
  const date = new Date(iso);
  const days = dayDifference(date, now);
  if (days === 0) return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  if (days === 1) return "ontem";
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}

interface LikeablePost {
  id: string;
  likedByUser?: boolean;
  likeCount?: number;
}

export function toggleLike<T extends LikeablePost>(post: T): T {
  const count = post.likeCount ?? 0;
  return { ...post, likedByUser: !post.likedByUser, likeCount: post.likedByUser ? Math.max(0, count - 1) : count + 1 };
}

export function toggleLikeInFeed<T extends LikeablePost>(feed: { data: T[] } | undefined, postId: string): { data: T[] } | undefined {
  if (!feed) return feed;
  return { ...feed, data: feed.data.map((post) => (post.id === postId ? toggleLike(post) : post)) };
}
