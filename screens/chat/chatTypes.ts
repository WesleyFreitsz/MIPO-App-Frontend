import { chatNameColors, contrastRatio, palettes } from "../../theme/tokens";

export interface ChatUser {
  id: string;
  name: string;
  nickname?: string | null;
  avatarUrl?: string | null;
}

export interface ChatMessageItem {
  id: string;
  chatId: string;
  userId: string;
  content: string;
  createdAt: string;
  isRead?: boolean;
  isDeleted?: boolean;
  isEdited?: boolean;
  user?: ChatUser;
  member?: { customColor?: string | null };
}

export interface ChatMemberItem {
  id: string;
  userId: string;
  role: string;
  user?: ChatUser;
  backgroundTheme?: string | null;
  customColor?: string | null;
}

export interface ChatDetails {
  id: string;
  type: string;
  name?: string;
  description?: string | null;
  imageUrl?: string | null;
  createdAt?: string;
  members?: ChatMemberItem[];
}

export function colorForName(name: string | undefined | null): string {
  if (!name) return chatNameColors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return chatNameColors[Math.abs(hash) % chatNameColors.length];
}

export function readableOn(background: string): string {
  const dark = palettes.light.text;
  const light = palettes.light.onPink;
  if (!/^#[0-9a-fA-F]{6}$/.test(background)) return dark;
  return contrastRatio(dark, background) >= contrastRatio(light, background) ? dark : light;
}

export function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function displayLabel(user: ChatUser | undefined): string {
  return user?.nickname || user?.name || "";
}
