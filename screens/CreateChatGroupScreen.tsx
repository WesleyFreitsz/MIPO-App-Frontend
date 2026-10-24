import React, { useState } from "react";
import { Alert, Image, Pressable, ScrollView, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Camera, Plus } from "lucide-react-native";
import { api } from "../services/api";
import {
  Avatar,
  Button,
  Checkbox,
  Chip,
  FieldLabel,
  IconBox,
  Input,
  LoadingState,
  MipoText,
  Screen,
  ScreenHeader,
  avatarTone,
} from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";
import { stroke } from "../theme/tokens";

interface Friend {
  id: string;
  name: string;
  nickname?: string | null;
  avatarUrl?: string | null;
}

interface CreateChatGroupScreenProps {
  navigation: { navigate: (screen: string, params?: object) => void; goBack: () => void };
}

const friendLabel = (friend: Friend) => friend.nickname || friend.name;

export default function CreateChatGroupScreen({ navigation }: CreateChatGroupScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupImage, setGroupImage] = useState<string | null>(null);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const { data: friendsData, isLoading } = useQuery<{ data: Friend[] }>({
    queryKey: ["friends", "list"],
    queryFn: async () => (await api.get("/friends", { params: { skip: 0, take: 100 } })).data,
  });

  const friends = friendsData?.data ?? [];

  const handleToggleFriend = (friendId: string) => {
    setSelectedFriends((prev) => (prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]));
  };

  const uploadImageAsync = async (uri: string) => {
    try {
      const formData = new FormData();
      const filename = uri.split("/").pop() || `photo-${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      formData.append("file", { uri, name: filename, type: match ? `image/${match[1]}` : "image/jpeg" } as unknown as Blob);
      const res = await api.post("/uploads/chat-content", formData, { headers: { "Content-Type": "multipart/form-data" } });
      return res.data.url;
    } catch {
      return null;
    }
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.5 });
    if (!res.canceled) setGroupImage(res.assets[0].uri);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return Alert.alert("Erro", "O nome do grupo é obrigatório");
    if (selectedFriends.length === 0) return Alert.alert("Erro", "Selecione pelo menos um amigo");

    setIsCreating(true);
    let finalImageUrl = null;
    if (groupImage) finalImageUrl = await uploadImageAsync(groupImage);

    try {
      const chatResponse = await api.post("/chats/group", { name: groupName, description: groupDescription || null, imageUrl: finalImageUrl });
      await api.post(`/chats/${chatResponse.data.id}/members`, { memberIds: selectedFriends });
      Alert.alert("Sucesso", "Grupo criado com sucesso!", [
        {
          text: "OK",
          onPress: () =>
            navigation.navigate("ChatDetail", { chatId: chatResponse.data.id, name: groupName, type: "GROUP", avatar: finalImageUrl }),
        },
      ]);
    } catch {
      Alert.alert("Erro", "Erro ao criar grupo");
    } finally {
      setIsCreating(false);
    }
  };

  const selected = friends.filter((friend) => selectedFriends.includes(friend.id));

  return (
    <Screen>
      <ScreenHeader title="Novo grupo" onBack={() => navigation.goBack()} />
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={groupImage ? "Trocar foto do grupo" : "Adicionar foto do grupo"} onPress={pickImage}>
            {groupImage ? (
              <Image source={{ uri: groupImage }} style={{ width: 64, height: 64, borderRadius: 32, borderWidth: stroke.regular, borderColor: colors.line }} />
            ) : (
              <IconBox icon={Camera} tone="yellow" size={64} round />
            )}
          </Pressable>
          <Input placeholder="Nome do grupo" value={groupName} onChangeText={setGroupName} containerStyle={{ flex: 1 }} />
        </View>

        <FieldLabel>Descrição</FieldLabel>
        <Input placeholder="Sobre o que é o grupo?" value={groupDescription} onChangeText={setGroupDescription} multiline containerStyle={{ minHeight: 80 }} />

        <FieldLabel>{`Participantes (${selectedFriends.length})`}</FieldLabel>
        {selected.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
            {selected.map((friend) => (
              <Chip key={friend.id} label={`${friendLabel(friend)} ✕`} tone={avatarTone(friend.id)} onPress={() => handleToggleFriend(friend.id)} />
            ))}
          </View>
        ) : null}

        {isLoading ? (
          <LoadingState skeletons={2} />
        ) : friends.length === 0 ? (
          <MipoText variant="caption">Adicione amigos para criar um grupo.</MipoText>
        ) : (
          <View style={{ gap: 4 }}>
            {friends.map((friend) => (
              <Pressable
                key={friend.id}
                onPress={() => handleToggleFriend(friend.id)}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 }}
              >
                <Avatar id={friend.id} name={friend.name} uri={friend.avatarUrl} />
                <MipoText variant="cardTitle" style={{ flex: 1 }}>
                  {friendLabel(friend)}
                </MipoText>
                <Checkbox checked={selectedFriends.includes(friend.id)} onChange={() => handleToggleFriend(friend.id)} accessibilityLabel={friendLabel(friend)} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={{ position: "absolute", left: 14, right: 14, bottom: insets.bottom + 14 }}>
        <Button label="Criar grupo" icon={Plus} variant="red" block loading={isCreating} onPress={handleCreateGroup} />
      </View>
    </Screen>
  );
}
