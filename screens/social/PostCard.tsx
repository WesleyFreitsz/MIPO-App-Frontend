import React from "react";
import { Image, Pressable, View } from "react-native";
import { Flag, MessageCircle, Pencil, Trash2 } from "lucide-react-native";
import { Avatar, Card, MipoText } from "../../components/ui";
import { useTheme } from "../../theme/ThemeProvider";
import { stroke } from "../../theme/tokens";
import { LikeButton } from "./LikeButton";
import { SocialUser, relativeTime } from "./socialFormat";

export interface SocialPost {
  id: string;
  content: string;
  imageUrl?: string | null;
  createdAt: string;
  user: SocialUser;
  likeCount?: number;
  likedByUser?: boolean;
  commentCount?: number;
}

export interface PostCardProps {
  post: SocialPost;
  isMine: boolean;
  onOpen: () => void;
  onLike: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReport: () => void;
  onOpenProfile: () => void;
}

function SmallAction({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={10} style={{ padding: 4 }}>
      {children}
    </Pressable>
  );
}

export function PostCard({ post, isMine, onOpen, onLike, onEdit, onDelete, onReport, onOpenProfile }: PostCardProps) {
  const { colors } = useTheme();
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Ver perfil de ${post.user.name}`} onPress={onOpenProfile} hitSlop={6}>
          <Avatar id={post.user.id} name={post.user.name} uri={post.user.avatarUrl} />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <MipoText variant="cardTitle" numberOfLines={1}>
            {post.user.name}
          </MipoText>
          <MipoText variant="micro" numberOfLines={1}>
            {post.user.nickname ? `@${post.user.nickname} · ${relativeTime(post.createdAt)}` : relativeTime(post.createdAt)}
          </MipoText>
        </View>
        {isMine ? (
          <>
            <SmallAction label="Editar post" onPress={onEdit}>
              <Pencil size={18} color={colors.muted} />
            </SmallAction>
            <SmallAction label="Excluir post" onPress={onDelete}>
              <Trash2 size={18} color={colors.red} />
            </SmallAction>
          </>
        ) : (
          <SmallAction label="Denunciar post" onPress={onReport}>
            <Flag size={18} color={colors.muted} />
          </SmallAction>
        )}
      </View>

      {post.content ? (
        <MipoText variant="bodyBold" style={{ marginTop: 8 }}>
          {post.content}
        </MipoText>
      ) : null}

      {post.imageUrl ? (
        <Pressable accessibilityRole="imagebutton" accessibilityLabel="Abrir post" onPress={onOpen} style={{ marginTop: 8 }}>
          <Image
            source={{ uri: post.imageUrl }}
            resizeMode="cover"
            style={{ width: "100%", height: 200, borderRadius: 14, borderWidth: stroke.regular, borderColor: colors.line }}
          />
        </Pressable>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 18, marginTop: 8 }}>
        <LikeButton liked={Boolean(post.likedByUser)} count={post.likeCount ?? 0} onToggle={onLike} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Comentários, ${post.commentCount ?? 0}`}
          onPress={onOpen}
          hitSlop={10}
          style={{ flexDirection: "row", alignItems: "center", gap: 4, minHeight: 32 }}
        >
          <MessageCircle size={18} color={colors.muted} strokeWidth={2.4} />
          <MipoText variant="caption">{String(post.commentCount ?? 0)}</MipoText>
        </Pressable>
      </View>
    </Card>
  );
}
