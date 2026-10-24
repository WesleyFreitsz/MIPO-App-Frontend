import React from "react";
import { FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Flag, Pencil, Trash2, X } from "lucide-react-native";
import { Avatar, Button, IconButton, Input, MipoText } from "../../components/ui";
import { useTheme } from "../../theme/ThemeProvider";
import { stroke } from "../../theme/tokens";
import { LikeButton } from "./LikeButton";
import { SocialPost } from "./PostCard";
import { SocialUser, relativeTime } from "./socialFormat";

export interface SocialComment {
  id: string;
  content: string;
  user: SocialUser;
}

export interface PostDetailModalProps {
  post: SocialPost | null;
  comments: SocialComment[];
  currentUser: SocialUser | null;
  commentText: string;
  editingComment: SocialComment | null;
  sending: boolean;
  onChangeComment: (text: string) => void;
  onSendComment: () => void;
  onStartEditComment: (comment: SocialComment) => void;
  onCancelEditComment: () => void;
  onDeleteComment: (comment: SocialComment) => void;
  onLike: () => void;
  onEditPost: () => void;
  onDeletePost: () => void;
  onOpenProfile: (userId: string) => void;
  onClose: () => void;
  hidePostActions?: boolean;
  onReportPost?: () => void;
}

export function PostDetailModal({
  post,
  comments,
  currentUser,
  commentText,
  editingComment,
  sending,
  onChangeComment,
  onSendComment,
  onStartEditComment,
  onCancelEditComment,
  onDeleteComment,
  onLike,
  onEditPost,
  onDeletePost,
  onOpenProfile,
  onClose,
  hidePostActions = false,
  onReportPost,
}: PostDetailModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  if (!post) return null;
  const isMine = !hidePostActions && post.user.id === currentUser?.id;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10 }}>
          <IconButton icon={X} accessibilityLabel="Fechar" onPress={onClose} />
          <MipoText variant="screenTitle" style={{ flex: 1, fontSize: 22 }}>
            Post
          </MipoText>
          {isMine ? (
            <>
              <IconButton icon={Pencil} accessibilityLabel="Editar post" onPress={onEditPost} size={34} />
              <IconButton icon={Trash2} accessibilityLabel="Excluir post" tone="red" onPress={onDeletePost} size={34} />
            </>
          ) : onReportPost && post.user.id !== currentUser?.id ? (
            <IconButton icon={Flag} accessibilityLabel="Denunciar post" onPress={onReportPost} size={34} />
          ) : null}
        </View>

        <FlatList
          data={comments}
          keyExtractor={(comment) => comment.id}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 16, gap: 10 }}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={{ paddingBottom: 12, marginBottom: 6, borderBottomWidth: 2, borderStyle: "dashed", borderColor: colors.sunken, gap: 8 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Ver perfil de ${post.user.name}`}
                onPress={() => onOpenProfile(post.user.id)}
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <Avatar id={post.user.id} name={post.user.name} uri={post.user.avatarUrl} />
                <View>
                  <MipoText variant="cardTitle">{post.user.nickname || post.user.name}</MipoText>
                  <MipoText variant="micro">{relativeTime(post.createdAt)}</MipoText>
                </View>
              </Pressable>
              {post.content ? <MipoText variant="bodyBold">{post.content}</MipoText> : null}
              {post.imageUrl ? (
                <Image
                  source={{ uri: post.imageUrl }}
                  resizeMode="contain"
                  style={{ width: "100%", height: 280, borderRadius: 16, borderWidth: stroke.regular, borderColor: colors.line, backgroundColor: colors.sunken }}
                />
              ) : null}
              <LikeButton liked={Boolean(post.likedByUser)} count={post.likeCount ?? 0} onToggle={onLike} size={24} />
            </View>
          }
          ListEmptyComponent={<MipoText variant="caption">Ninguém comentou ainda. Puxa a conversa!</MipoText>}
          renderItem={({ item }) => (
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Ver perfil de ${item.user.name}`} onPress={() => onOpenProfile(item.user.id)}>
                <Avatar id={item.user.id} name={item.user.name} uri={item.user.avatarUrl} size="sm" />
              </Pressable>
              <View style={{ flex: 1 }}>
                <MipoText variant="micro" color="text">
                  {item.user.nickname || item.user.name}
                </MipoText>
                <MipoText variant="body">{item.content}</MipoText>
              </View>
              {item.user.id === currentUser?.id ? (
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Editar comentário" hitSlop={10} onPress={() => onStartEditComment(item)}>
                    <Pencil size={16} color={colors.muted} />
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Apagar comentário" hitSlop={10} onPress={() => onDeleteComment(item)}>
                    <Trash2 size={16} color={colors.red} />
                  </Pressable>
                </View>
              ) : null}
            </View>
          )}
        />

        {editingComment ? (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.surface2 }}>
            <MipoText variant="micro" color="pink">
              Editando comentário...
            </MipoText>
            <Pressable accessibilityRole="button" accessibilityLabel="Cancelar edição" hitSlop={10} onPress={onCancelEditComment}>
              <X size={16} color={colors.pink} />
            </Pressable>
          </View>
        ) : null}

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingTop: 10, paddingBottom: insets.bottom + 10 }}>
          <Input placeholder="Adicione um comentário..." value={commentText} onChangeText={onChangeComment} containerStyle={{ flex: 1 }} />
          <Button
            label={editingComment ? "Salvar" : "Publicar"}
            variant="yellow"
            size="sm"
            disabled={!commentText.trim()}
            loading={sending}
            onPress={onSendComment}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
