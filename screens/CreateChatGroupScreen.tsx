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
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { ChevronLeft, Plus, Check } from "lucide-react-native";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";

interface Friend {
  id: string;
  name: string;
  nickname: string;
  avatarUrl: string;
  city: string;
}

const MIPO_COLORS = {
  primary: "#E11D48",
  background: "#f8fafc",
  text: "#1e293b",
  textLighter: "#64748b",
  border: "#e2e8f0",
  white: "#ffffff",
};

const FriendCheckbox = ({ friend, isSelected, onToggle }: any) => {
  return (
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
        <Text style={styles.friendCity}>{friend.city}</Text>
      </View>
      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
        {isSelected && <Check color={MIPO_COLORS.white} size={16} />}
      </View>
    </TouchableOpacity>
  );
};

export default function CreateChatGroupScreen({ navigation }: any) {
  const { user } = useAuth();
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch amigos do usuário
  const { data: friendsData, isLoading } = useQuery({
    queryKey: ["friends", "list"],
    queryFn: async () => {
      const response = await api.get("/friends", {
        params: { skip: 0, take: 100 },
      });
      return response.data;
    },
  });

  const handleToggleFriend = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId],
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert("Erro", "O nome do grupo é obrigatório");
      return;
    }

    if (selectedFriends.length === 0) {
      Alert.alert("Erro", "Selecione pelo menos um amigo para o grupo");
      return;
    }

    setIsCreating(true);
    try {
      // Primeiro, criar o chat
      const chatResponse = await api.post("/chats/group", {
        name: groupName,
        description: groupDescription || null,
      });

      // Depois, adicionar os membros
      await api.post(`/chats/${chatResponse.data.id}/members`, {
        memberIds: selectedFriends,
      });

      Alert.alert("Sucesso", "Grupo criado com sucesso!", [
        {
          text: "OK",
          onPress: () => {
            navigation.navigate("ChatDetail", {
              chatId: chatResponse.data.id,
              name: groupName,
            });
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Erro",
        error.response?.data?.message || "Erro ao criar grupo",
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft color={MIPO_COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Criar Grupo de Chat</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* CONTEÚDO */}
      <ScrollView style={styles.content}>
        {/* INPUT DE NOME */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nome do Grupo *</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite o nome do grupo"
            value={groupName}
            onChangeText={setGroupName}
            placeholderTextColor={MIPO_COLORS.textLighter}
          />
        </View>

        {/* INPUT DE DESCRIÇÃO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descrição (Opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Descrição do grupo"
            value={groupDescription}
            onChangeText={setGroupDescription}
            placeholderTextColor={MIPO_COLORS.textLighter}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* SELEÇÃO DE AMIGOS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Selecione os Amigos ({selectedFriends.length})
          </Text>

          {isLoading ? (
            <ActivityIndicator size="large" color={MIPO_COLORS.primary} />
          ) : friendsData?.data && friendsData.data.length > 0 ? (
            <FlatList
              data={friendsData.data}
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
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Você não tem amigos adicionados
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* BOTÃO DE CRIAR */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.createButton,
            isCreating && styles.createButtonDisabled,
          ]}
          onPress={handleCreateGroup}
          disabled={isCreating}
        >
          {isCreating ? (
            <ActivityIndicator color={MIPO_COLORS.white} size="small" />
          ) : (
            <>
              <Plus color={MIPO_COLORS.white} size={18} />
              <Text style={styles.createButtonText}>Criar Grupo</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MIPO_COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: MIPO_COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: MIPO_COLORS.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: MIPO_COLORS.text,
  },
  content: {
    flex: 1,
    paddingVertical: 16,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: MIPO_COLORS.text,
    marginBottom: 8,
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: MIPO_COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: MIPO_COLORS.border,
    fontSize: 14,
    color: MIPO_COLORS.text,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: MIPO_COLORS.white,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: MIPO_COLORS.border,
  },
  friendAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 14,
    fontWeight: "600",
    color: MIPO_COLORS.text,
  },
  friendCity: {
    fontSize: 12,
    color: MIPO_COLORS.textLighter,
    marginTop: 2,
  },
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
  emptyContainer: {
    paddingVertical: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: MIPO_COLORS.textLighter,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: MIPO_COLORS.white,
    borderTopWidth: 1,
    borderTopColor: MIPO_COLORS.border,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    backgroundColor: MIPO_COLORS.primary,
    borderRadius: 8,
    gap: 8,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: MIPO_COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
});
