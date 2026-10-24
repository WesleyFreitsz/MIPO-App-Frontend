import React from "react";
import { FlatList, Pressable, View } from "react-native";
import { MessageCircle } from "lucide-react-native";
import { Avatar, Button, Card, Character, EmptyState, IconButton, MipoText } from "../../components/ui";
import { StaggerIn } from "../../motion/StaggerIn";
import { SocialUser } from "./socialFormat";

export interface AmigosTabProps {
  friends: SocialUser[];
  pendingCount: number;
  bottomReserve: number;
  onSeeRequests: () => void;
  onOpenProfile: (userId: string) => void;
  onMessage: (friend: SocialUser) => void;
  onAddFriends: () => void;
}

function PendingRequestsCard({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <Card tone="yellow" contentStyle={{ paddingRight: 88, minHeight: 96 }}>
      <MipoText variant="cardTitle" color="onColor">
        {count === 1 ? "1 pedido de amizade" : `${count} pedidos de amizade`}
      </MipoText>
      <MipoText variant="caption" color="onColor" style={{ opacity: 0.8 }}>
        Tem gente querendo jogar com você
      </MipoText>
      <Button label="Ver pedidos" variant="pink" size="sm" onPress={onPress} style={{ marginTop: 8 }} />
      <View style={{ position: "absolute", right: -4, bottom: -4 }}>
        <Character name="quebraCabeca1" size={86} />
      </View>
    </Card>
  );
}

export function AmigosTab({ friends, pendingCount, bottomReserve, onSeeRequests, onOpenProfile, onMessage, onAddFriends }: AmigosTabProps) {
  return (
    <FlatList
      data={friends}
      keyExtractor={(friend) => friend.id}
      style={{ marginHorizontal: -14 }}
      contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: bottomReserve, gap: 8 }}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={pendingCount > 0 ? <View style={{ marginBottom: 10 }}><PendingRequestsCard count={pendingCount} onPress={onSeeRequests} /></View> : null}
      ListEmptyComponent={
        <EmptyState
          character="quebraCabeca3"
          title="Nenhum amigo ainda"
          message="Adicione a galera da mesa para combinar as próximas partidas."
          action={{ label: "Adicionar amigos", onPress: onAddFriends }}
        />
      }
      renderItem={({ item, index }) => (
        <StaggerIn index={index} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ver perfil de ${item.name}`}
            onPress={() => onOpenProfile(item.id)}
            style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 }}
          >
            <Avatar id={item.id} name={item.name} uri={item.avatarUrl} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <MipoText variant="cardTitle" numberOfLines={1}>
                {item.name}
              </MipoText>
              {item.nickname ? (
                <MipoText variant="micro" numberOfLines={1}>
                  {`@${item.nickname}`}
                </MipoText>
              ) : null}
            </View>
          </Pressable>
          <IconButton icon={MessageCircle} accessibilityLabel={`Mandar mensagem para ${item.name}`} onPress={() => onMessage(item)} size={34} />
        </StaggerIn>
      )}
    />
  );
}
