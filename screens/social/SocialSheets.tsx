import React from "react";
import { FlatList, Image, Pressable, View } from "react-native";
import { Camera, Search, UserPlus, Users } from "lucide-react-native";
import { Avatar, BottomSheet, Button, Card, IconBox, IconButton, Input, MipoText } from "../../components/ui";
import { useTheme } from "../../theme/ThemeProvider";
import { stroke } from "../../theme/tokens";
import { SocialUser } from "./socialFormat";

export interface ReportSheetProps {
  visible: boolean;
  reason: string;
  image: string | null;
  sending: boolean;
  onChangeReason: (reason: string) => void;
  onPickImage: () => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function ReportSheet({ visible, reason, image, sending, onChangeReason, onPickImage, onSubmit, onClose }: ReportSheetProps) {
  const { colors } = useTheme();
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <MipoText variant="screenTitle" style={{ fontSize: 22, marginBottom: 10 }}>
        Denunciar post
      </MipoText>
      <Input placeholder="Qual o motivo da denúncia?" value={reason} onChangeText={onChangeReason} multiline containerStyle={{ minHeight: 100 }} />
      <Button label="Anexar prova (opcional)" icon={Camera} variant="ghost" onPress={onPickImage} style={{ marginTop: 10 }} />
      {image ? (
        <Image source={{ uri: image }} style={{ width: 100, height: 100, marginTop: 10, borderRadius: 12, borderWidth: stroke.regular, borderColor: colors.line }} />
      ) : null}
      <Button label="Enviar denúncia" variant="red" block loading={sending} onPress={onSubmit} style={{ marginTop: 16 }} />
    </BottomSheet>
  );
}

export interface NewChatSheetProps {
  visible: boolean;
  friends: SocialUser[];
  onNewGroup: () => void;
  onPickFriend: (friend: SocialUser) => void;
  onClose: () => void;
}

export function NewChatSheet({ visible, friends, onNewGroup, onPickFriend, onClose }: NewChatSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <MipoText variant="screenTitle" style={{ fontSize: 22, marginBottom: 10 }}>
        Nova conversa
      </MipoText>
      <Card onPress={onNewGroup} accessibilityLabel="Novo grupo" contentStyle={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <IconBox icon={Users} tone="pink" />
        <MipoText variant="cardTitle">Novo grupo</MipoText>
      </Card>
      <FlatList
        data={friends}
        keyExtractor={(friend) => friend.id}
        style={{ marginTop: 12, maxHeight: 360 }}
        ListEmptyComponent={<MipoText variant="caption">Adicione amigos para conversar.</MipoText>}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Conversar com ${item.nickname || item.name}`}
            onPress={() => onPickFriend(item)}
            style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 }}
          >
            <Avatar id={item.id} name={item.name} uri={item.avatarUrl} />
            <MipoText variant="cardTitle">{item.nickname || item.name}</MipoText>
          </Pressable>
        )}
      />
    </BottomSheet>
  );
}

export interface AddFriendsSheetProps {
  visible: boolean;
  query: string;
  users: SocialUser[];
  onChangeQuery: (query: string) => void;
  onAdd: (user: SocialUser) => void;
  onClose: () => void;
}

export function AddFriendsSheet({ visible, query, users, onChangeQuery, onAdd, onClose }: AddFriendsSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <MipoText variant="screenTitle" style={{ fontSize: 22, marginBottom: 10 }}>
        Adicionar amigos
      </MipoText>
      <Input icon={Search} placeholder="Buscar @apelido" value={query} onChangeText={onChangeQuery} autoCapitalize="none" />
      <FlatList
        data={users}
        keyExtractor={(user) => user.id}
        style={{ marginTop: 12, maxHeight: 380 }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<MipoText variant="caption">Ninguém encontrado com esse nome.</MipoText>}
        renderItem={({ item }) => (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 }}>
            <Avatar id={item.id} name={item.name} uri={item.avatarUrl} />
            <View style={{ flex: 1 }}>
              <MipoText variant="cardTitle">{item.name}</MipoText>
              {item.nickname ? <MipoText variant="micro">{`@${item.nickname}`}</MipoText> : null}
            </View>
            <IconButton icon={UserPlus} tone="red" accessibilityLabel={`Adicionar ${item.name}`} onPress={() => onAdd(item)} size={36} />
          </View>
        )}
      />
    </BottomSheet>
  );
}
