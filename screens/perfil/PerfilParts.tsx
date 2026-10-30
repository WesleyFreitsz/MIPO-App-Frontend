import React from "react";
import { ActivityIndicator, FlatList, Image, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, MessageCircle } from "lucide-react-native";
import { Avatar, BottomSheet, Card, Character, Hero, IconButton, MipoText, Skeleton } from "../../components/ui";
import { useTheme } from "../../theme/ThemeProvider";
import { foregroundOn, radius, stroke } from "../../theme/tokens";

export interface PerfilPerson {
  id: string;
  name: string;
  nickname?: string | null;
  city?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
}

export interface PerfilHeroProps {
  person: PerfilPerson;
  tone: "pink" | "teal";
  topLeft?: React.ReactNode;
  topRight?: React.ReactNode;
  coins?: number;
  onCoinsPress?: () => void;
  onAvatarPress?: () => void;
  avatarUploading?: boolean;
  children?: React.ReactNode;
}

export function PerfilHero({
  person,
  tone,
  topLeft,
  topRight,
  coins,
  onCoinsPress,
  onAvatarPress,
  avatarUploading = false,
  children,
}: PerfilHeroProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const foreground = foregroundOn(tone, colors);

  return (
    <Hero tone={tone} paddingTop={insets.top + 6} style={{ alignItems: "center" }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignSelf: "stretch", minHeight: 38 }}>
        <View>{topLeft}</View>
        <View style={{ flexDirection: "row", gap: 8 }}>{topRight}</View>
      </View>
      {onAvatarPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Trocar foto de perfil"
          accessibilityState={{ busy: avatarUploading }}
          disabled={avatarUploading}
          onPress={onAvatarPress}
        >
          <Avatar id={person.id} name={person.name} uri={person.avatarUrl} size="lg" tone="yellow" />
          {avatarUploading ? (
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: radius.chip,
                backgroundColor: colors.overlay,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ActivityIndicator color={colors.onPink} />
            </View>
          ) : null}
          <View
            style={{
              position: "absolute",
              right: -4,
              bottom: -2,
              width: 32,
              height: 32,
              borderRadius: radius.chip,
              backgroundColor: colors.yellow,
              borderWidth: stroke.regular,
              borderColor: colors.line,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Camera size={16} color={colors.onColor} strokeWidth={2.6} />
          </View>
        </Pressable>
      ) : (
        <Avatar id={person.id} name={person.name} uri={person.avatarUrl} size="lg" tone="yellow" />
      )}
      <MipoText variant="screenTitle" style={{ color: foreground, marginTop: 8, textAlign: "center" }}>
        {person.name}
      </MipoText>
      <MipoText variant="caption" style={{ color: foreground, opacity: 0.85, textAlign: "center" }}>
        {[person.nickname ? `@${person.nickname}` : null, person.city].filter(Boolean).join(" · ")}
      </MipoText>
      {coins !== undefined ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={onCoinsPress ? `${coins} moedas, abrir loja de recompensas` : `${coins} moedas`}
          onPress={onCoinsPress}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            marginTop: 8,
            paddingLeft: 4,
            paddingRight: 10,
            paddingVertical: 2,
            borderRadius: radius.chip,
            backgroundColor: colors.tab,
          }}
        >
          <Character name="moeda1" size={22} motion="none" />
          <MipoText variant="cardTitle" style={{ color: colors.tabText, fontSize: 14 }}>
            {String(coins)}
          </MipoText>
        </Pressable>
      ) : null}
      {person.bio ? (
        <MipoText variant="body" style={{ color: foreground, textAlign: "center", marginTop: 8 }}>
          {person.bio}
        </MipoText>
      ) : null}
      {children ? <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>{children}</View> : null}
    </Hero>
  );
}

export interface PerfilStat {
  value: number;
  label: string;
  onPress?: () => void;
}

export function PerfilStats({ stats }: { stats: PerfilStat[] }) {
  return (
    <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
      {stats.map((stat) => (
        <Card
          key={stat.label}
          flat
          style={{ flex: 1 }}
          onPress={stat.onPress}
          accessibilityLabel={`${stat.value} ${stat.label}`}
          contentStyle={{ alignItems: "center", paddingVertical: 8 }}
        >
          <MipoText variant="section" style={{ fontSize: 20 }}>
            {String(stat.value)}
          </MipoText>
          <MipoText variant="micro">{stat.label}</MipoText>
        </Card>
      ))}
    </View>
  );
}

export interface GridPost {
  id: string;
  content: string;
  imageUrl?: string | null;
}

export function PostsGrid({ posts, loading, onOpen }: { posts: GridPost[]; loading: boolean; onOpen: (post: GridPost) => void }) {
  const { colors } = useTheme();
  if (loading) {
    return (
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <Skeleton key={index} height={104} style={{ width: "31.5%" }} />
        ))}
      </View>
    );
  }
  if (posts.length === 0) {
    return <MipoText variant="caption">Nenhum post ainda.</MipoText>;
  }
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {posts.map((post) => (
        <Pressable
          key={post.id}
          accessibilityRole="button"
          accessibilityLabel={post.content ? `Abrir post: ${post.content}` : "Abrir post"}
          onPress={() => onOpen(post)}
          style={{
            width: "31.5%",
            aspectRatio: 1,
            borderRadius: 14,
            borderWidth: stroke.regular,
            borderColor: colors.line,
            backgroundColor: colors.surface,
            overflow: "hidden",
          }}
        >
          {post.imageUrl ? (
            <Image source={{ uri: post.imageUrl }} style={{ width: "100%", height: "100%" }} />
          ) : (
            <View style={{ flex: 1, padding: 8, backgroundColor: colors.surface2 }}>
              <MipoText variant="micro" color="text" numberOfLines={5}>
                {post.content}
              </MipoText>
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );
}

export interface FriendsSheetProps {
  visible: boolean;
  friends: PerfilPerson[];
  onOpenProfile: (userId: string) => void;
  onMessage?: (friend: PerfilPerson) => void;
  onClose: () => void;
}

export function FriendsSheet({ visible, friends, onOpenProfile, onMessage, onClose }: FriendsSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <MipoText variant="screenTitle" style={{ fontSize: 22, marginBottom: 10 }}>
        Amigos
      </MipoText>
      <FlatList
        data={friends}
        keyExtractor={(friend) => friend.id}
        style={{ maxHeight: 420 }}
        ListEmptyComponent={<MipoText variant="caption">Nenhum amigo ainda.</MipoText>}
        renderItem={({ item }) => (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Ver perfil de ${item.name}`}
              onPress={() => onOpenProfile(item.id)}
              style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Avatar id={item.id} name={item.name} uri={item.avatarUrl} />
              <MipoText variant="cardTitle">{item.nickname || item.name}</MipoText>
            </Pressable>
            {onMessage ? (
              <IconButton icon={MessageCircle} size={34} accessibilityLabel={`Mandar mensagem para ${item.name}`} onPress={() => onMessage(item)} />
            ) : null}
          </View>
        )}
      />
    </BottomSheet>
  );
}
