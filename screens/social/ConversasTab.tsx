import React from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { Avatar, Chip, EmptyState, LoadingState, MipoText } from "../../components/ui";
import { StaggerIn } from "../../motion/StaggerIn";
import { useTheme } from "../../theme/ThemeProvider";
import { ChatDisplay, ChatFilter, SocialChat, chatDisplay, formatChatTime } from "./socialFormat";

const filters: { value: ChatFilter; label: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: "PRIVATE", label: "Privadas" },
  { value: "GROUPS", label: "Grupos e eventos" },
];

export interface ConversasTabProps {
  chats: SocialChat[];
  loading: boolean;
  filter: ChatFilter;
  userId: string | undefined;
  bottomReserve: number;
  onFilterChange: (filter: ChatFilter) => void;
  onRefresh: () => void;
  onOpenChat: (chat: SocialChat, display: ChatDisplay) => void;
}

function ChatRow({ chat, display, onPress }: { chat: SocialChat; display: ChatDisplay; onPress: () => void }) {
  const { colors } = useTheme();
  const unread = chat.unreadCount ?? 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir conversa com ${display.title}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 10,
        borderBottomWidth: 2,
        borderStyle: "dashed",
        borderColor: colors.sunken,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Avatar id={display.targetId ?? chat.id} name={display.title} uri={display.avatar} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
          <MipoText variant="cardTitle" numberOfLines={1} style={{ flex: 1 }}>
            {display.title}
          </MipoText>
          <MipoText variant="micro" style={unread > 0 ? { color: colors.pink } : undefined}>
            {formatChatTime(chat.lastMessage?.createdAt)}
          </MipoText>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <MipoText variant="caption" numberOfLines={1} color={unread > 0 ? "text" : "muted"} style={{ flex: 1 }}>
            {chat.lastMessage?.content || "Nenhuma mensagem"}
          </MipoText>
          {unread > 0 ? <Chip label={String(unread)} tone="red" /> : null}
        </View>
      </View>
    </Pressable>
  );
}

export function ConversasTab({ chats, loading, filter, userId, bottomReserve, onFilterChange, onRefresh, onOpenChat }: ConversasTabProps) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -14, flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 10, gap: 6 }}
      >
        {filters.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            tone={filter === option.value ? "active" : "neutral"}
            selected={filter === option.value}
            onPress={() => onFilterChange(option.value)}
          />
        ))}
      </ScrollView>
      {loading ? (
        <LoadingState skeletons={3} />
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(chat) => chat.id}
          contentContainerStyle={{ paddingBottom: bottomReserve }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={colors.pink} />}
          ListEmptyComponent={<EmptyState character="carta1" title="Nenhuma conversa ainda" message="Chama alguém da mesa pra conversar." />}
          renderItem={({ item, index }) => {
            const display = chatDisplay(item, userId);
            return (
              <StaggerIn index={index}>
                <ChatRow chat={item} display={display} onPress={() => onOpenChat(item, display)} />
              </StaggerIn>
            );
          }}
        />
      )}
    </View>
  );
}
