import { ChatMessageItem, MessagesCache } from "./chatTypes";

export function upsertMessage(cache: MessagesCache | undefined, message: ChatMessageItem): MessagesCache | undefined {
  if (!cache) return cache;
  const exists = cache.pages.some((page) => page.data.some((m) => m.id === message.id));
  if (exists) return replaceMessage(cache, message);
  const [first, ...rest] = cache.pages;
  if (!first) return { ...cache, pages: [{ data: [message], hasMore: false, nextCursor: null }] };
  return { ...cache, pages: [{ ...first, data: [message, ...first.data] }, ...rest] };
}

export function replaceMessage(cache: MessagesCache | undefined, message: ChatMessageItem): MessagesCache | undefined {
  if (!cache) return cache;
  return {
    ...cache,
    pages: cache.pages.map((page) => ({
      ...page,
      data: page.data.map((m) => (m.id === message.id ? message : m)),
    })),
  };
}

export function markOwnMessagesRead(cache: MessagesCache | undefined, ownUserId: string): MessagesCache | undefined {
  if (!cache) return cache;
  return {
    ...cache,
    pages: cache.pages.map((page) => ({
      ...page,
      data: page.data.map((m) => (m.userId === ownUserId && !m.isRead ? { ...m, isRead: true } : m)),
    })),
  };
}

export function groupReactions(reactions: { userId: string; emoji: string }[] | undefined, currentUserId: string | undefined) {
  const groups = new Map<string, { emoji: string; count: number; mine: boolean }>();
  for (const reaction of reactions ?? []) {
    const group = groups.get(reaction.emoji) ?? { emoji: reaction.emoji, count: 0, mine: false };
    group.count += 1;
    group.mine ||= reaction.userId === currentUserId;
    groups.set(reaction.emoji, group);
  }
  return [...groups.values()];
}
