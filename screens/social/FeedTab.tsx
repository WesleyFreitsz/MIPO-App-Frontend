import React from "react";
import { ActivityIndicator, FlatList, RefreshControl, View } from "react-native";
import { Image as ImageIcon } from "lucide-react-native";
import { Avatar, Card, EmptyState, IconBox, LoadingState, MipoText } from "../../components/ui";
import { StaggerIn } from "../../motion/StaggerIn";
import { useTheme } from "../../theme/ThemeProvider";
import { PostCard, SocialPost } from "./PostCard";
import { SocialUser } from "./socialFormat";

export interface FeedTabProps {
  posts: SocialPost[] | undefined;
  loading: boolean;
  currentUser: SocialUser | null;
  canModerate?: boolean;
  bottomReserve: number;
  onRefresh: () => void;
  onEndReached: () => void;
  loadingMore: boolean;
  onCompose: () => void;
  onOpenPost: (post: SocialPost) => void;
  onLike: (post: SocialPost) => void;
  onEdit: (post: SocialPost) => void;
  onDelete: (post: SocialPost) => void;
  onReport: (post: SocialPost) => void;
  onOpenProfile: (userId: string) => void;
}

function PostComposer({ user, onPress }: { user: SocialUser | null; onPress: () => void }) {
  return (
    <Card onPress={onPress} accessibilityLabel="Escrever um post" contentStyle={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 8 }}>
      {user ? <Avatar id={user.id} name={user.name} uri={user.avatarUrl} /> : null}
      <MipoText variant="caption" style={{ flex: 1 }}>
        Conta como foi a jogatina...
      </MipoText>
      <IconBox icon={ImageIcon} tone="pink" size={32} />
    </Card>
  );
}

export function FeedTab({
  posts,
  loading,
  currentUser,
  canModerate = false,
  bottomReserve,
  onRefresh,
  onEndReached,
  loadingMore,
  onCompose,
  onOpenPost,
  onLike,
  onEdit,
  onDelete,
  onReport,
  onOpenProfile,
}: FeedTabProps) {
  const { colors } = useTheme();
  if (loading) return <LoadingState skeletons={2} />;

  return (
    <FlatList
      data={posts ?? []}
      keyExtractor={(post) => post.id}
      style={{ marginHorizontal: -14 }}
      contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: bottomReserve, gap: 14 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={colors.pink} />}
      ListHeaderComponent={<PostComposer user={currentUser} onPress={onCompose} />}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.pink} style={{ margin: 16 }} /> : undefined}
      ListEmptyComponent={
        <EmptyState character="peao14" title="Nenhum post ainda" message="Seja a primeira pessoa a contar da jogatina." />
      }
      renderItem={({ item, index }) => (
        <StaggerIn index={index}>
          <PostCard
            post={item}
            isMine={item.user.id === currentUser?.id}
            canModerate={canModerate}
            onOpen={() => onOpenPost(item)}
            onLike={() => onLike(item)}
            onEdit={() => onEdit(item)}
            onDelete={() => onDelete(item)}
            onReport={() => onReport(item)}
            onOpenProfile={() => onOpenProfile(item.user.id)}
          />
        </StaggerIn>
      )}
      ItemSeparatorComponent={() => <View />}
    />
  );
}
