import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { ChevronLeft, Plus, Check, Camera } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useQuery } from "@tanstack/react-query";

const MIPO_COLORS = {
  primary: "#E11D48",
  background: "#f8fafc",
  text: "#1e293b",
  textLighter: "#64748b",
  border: "#e2e8f0",
  white: "#ffffff",
};

const FriendCheckbox = ({ friend, isSelected, onToggle }: any) => (
  <TouchableOpacity
    style={styles.friendItem}
    onPress={() => onToggle(friend.id)}
  >
    <Image
      source={{
        uri:
          friend.avatarUrl ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${friend.name}`,
      }}
      style={styles.friendAvatar}
    />
    <View style={styles.friendInfo}>
      <Text style={styles.friendName}>{friend.nickname || friend.name}</Text>
    </View>
    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
      {isSelected && <Check color={MIPO_COLORS.white} size={16} />}
    </View>
  </TouchableOpacity>
);

export default function CreateChatGroupScreen({ navigation }: any) {
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupImage, setGroupImage] = useState<string | null>(null);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const { data: friendsData, isLoading } = useQuery({
    queryKey: ["friends", "list"],
    queryFn: async () =>
      (await api.get("/friends", { params: { skip: 0, take: 100 } })).data,
  });

  const handleToggleFriend = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId],
    );
  };

  const uploadImageAsync = async (uri: string) => {
    try {
      const formData = new FormData();
      const filename = uri.split("/").pop() || `photo-${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      // @ts-ignore
      formData.append("file", {
        uri,
        name: filename,
        type: match ? `image/${match[1]}` : "image/jpeg",
      });
      // CORRIGIDO: Agora vai para chat-content em vez de misturar com perfis
      const res = await api.post("/uploads/chat-content", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data.url;
    } catch {
      return null;
    }
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!res.canceled) setGroupImage(res.assets[0].uri);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim())
      return Alert.alert("Erro", "O nome do grupo é obrigatório");
    if (selectedFriends.length === 0)
      return Alert.alert("Erro", "Selecione pelo menos um amigo");

    setIsCreating(true);
    let finalImageUrl = null;
    if (groupImage) finalImageUrl = await uploadImageAsync(groupImage);

    try {
      const chatResponse = await api.post("/chats/group", {
        name: groupName,
        description: groupDescription || null,
        imageUrl: finalImageUrl,
      });
      await api.post(`/chats/${chatResponse.data.id}/members`, {
        memberIds: selectedFriends,
      });

      Alert.alert("Sucesso", "Grupo criado com sucesso!", [
        {
          text: "OK",
          onPress: () =>
            navigation.navigate("ChatDetail", {
              chatId: chatResponse.data.id,
              name: groupName,
              type: "GROUP",
              avatar: finalImageUrl,
            }),
        },
      ]);
    } catch (error: any) {
      Alert.alert("Erro", "Erro ao criar grupo");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft color={MIPO_COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Novo Grupo</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            {groupImage ? (
              <Image source={{ uri: groupImage }} style={styles.imagePreview} />
            ) : (
              <Camera color={MIPO_COLORS.textLighter} size={32} />
            )}
          </TouchableOpacity>
          <Text style={{ color: MIPO_COLORS.textLighter, marginTop: 8 }}>
            Foto do Grupo
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nome do Grupo *</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome do grupo"
            value={groupName}
            onChangeText={setGroupName}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descrição</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Descrição"
            value={groupDescription}
            onChangeText={setGroupDescription}
            multiline
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Selecionar Amigos ({selectedFriends.length})
          </Text>
          {isLoading ? (
            <ActivityIndicator size="large" color={MIPO_COLORS.primary} />
          ) : (
            <FlatList
              data={friendsData?.data}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <FriendCheckbox
                  friend={item}
                  isSelected={selectedFriends.includes(item.id)}
                  onToggle={handleToggleFriend}
                />
              )}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.createButton, isCreating && { opacity: 0.6 }]}
          onPress={handleCreateGroup}
          disabled={isCreating}
        >
          {isCreating ? (
            <ActivityIndicator color={MIPO_COLORS.white} />
          ) : (
            <>
              <Plus color="#fff" size={18} />
              <Text style={styles.createButtonText}>Criar Grupo</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MIPO_COLORS.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: MIPO_COLORS.white,
    borderBottomWidth: 1,
    borderColor: MIPO_COLORS.border,
  },
  headerTitle: { fontSize: 16, fontWeight: "600", color: MIPO_COLORS.text },
  content: { flex: 1, paddingVertical: 16 },
  imagePicker: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  imagePreview: { width: "100%", height: "100%" },
  section: { marginHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  input: {
    padding: 12,
    backgroundColor: MIPO_COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: MIPO_COLORS.border,
  },
  textArea: { height: 80, textAlignVertical: "top" },
  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: MIPO_COLORS.white,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: MIPO_COLORS.border,
  },
  friendAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  friendInfo: { flex: 1 },
  friendName: { fontSize: 14, fontWeight: "600" },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: MIPO_COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: {
    backgroundColor: MIPO_COLORS.primary,
    borderColor: MIPO_COLORS.primary,
  },
  footer: {
    padding: 16,
    backgroundColor: MIPO_COLORS.white,
    borderTopWidth: 1,
    borderColor: MIPO_COLORS.border,
  },
  createButton: {
    flexDirection: "row",
    justifyContent: "center",
    padding: 12,
    backgroundColor: MIPO_COLORS.primary,
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: { color: MIPO_COLORS.white, fontWeight: "600" },
});
