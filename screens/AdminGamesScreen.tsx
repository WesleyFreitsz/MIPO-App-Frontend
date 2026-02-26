import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  Switch,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  Plus,
  Star,
  Camera,
  Video,
  Gamepad2,
  Pencil,
  Trash,
} from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { api } from "../services/api";

const PREDEFINED_CATEGORIES = [
  "Estratégia",
  "Party",
  "Cartas",
  "RPG",
  "Familiar",
  "Cooperativo",
  "Blefe",
  "Investigação",
];

export default function AdminGamesScreen() {
  const queryClient = useQueryClient();

  // Controle de Abas e Edição
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");
  const [editingGameId, setEditingGameId] = useState<string | null>(null);

  // Estados do Formulário
  const [newName, setNewName] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [customCategory, setCustomCategory] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [minPlayers, setMinPlayers] = useState("2");
  const [maxPlayers, setMaxPlayers] = useState("4");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Busca de jogos
  const { data: games = [], isLoading } = useQuery({
    queryKey: ["games", "admin-all"],
    queryFn: async () => {
      const res = await api.get("/games?active=all");
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    },
  });

  // Extrai categorias dinâmicas
  const allAvailableCategories = useMemo(() => {
    const existing = games
      .flatMap((g: any) =>
        Array.isArray(g.category) ? g.category : [g.category],
      )
      .filter(Boolean);
    return Array.from(new Set([...PREDEFINED_CATEGORIES, ...existing]));
  }, [games]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const handleAddCustomCategory = () => {
    if (
      customCategory.trim() &&
      !selectedCategories.includes(customCategory.trim())
    ) {
      setSelectedCategories([...selectedCategories, customCategory.trim()]);
      setCustomCategory("");
    }
  };

  // MUTAÇÕES DO BACKEND
  const createMutation = useMutation({
    mutationFn: (dto: any) => api.post("/games", dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["games"] });
      resetForm();
      setActiveTab("list");
      Alert.alert("Sucesso", "Jogo registrado com sucesso!");
    },
    onError: () => Alert.alert("Erro", "Falha ao registrar jogo."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/games/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["games"] });
      resetForm();
      setActiveTab("list");
      Alert.alert("Sucesso", "Jogo atualizado com sucesso!");
    },
    onError: () => Alert.alert("Erro", "Falha ao atualizar jogo."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/games/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["games"] });
      Alert.alert("Excluído", "O jogo foi removido do catálogo.");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch(`/games/${id}`, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["games"] }),
  });

  const toggleFeatureMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/games/${id}/feature`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["games"] }),
  });

  // FUNÇÕES DE CONTROLE
  const resetForm = () => {
    setEditingGameId(null);
    setNewName("");
    setSelectedCategories([]);
    setCustomCategory("");
    setNewDescription("");
    setMinPlayers("2");
    setMaxPlayers("4");
    setImageUri(null);
    setVideoUri(null);
  };

  const openNewGameForm = () => {
    resetForm();
    setActiveTab("create");
  };

  const handleEditClick = (game: any) => {
    setEditingGameId(game.id);
    setNewName(game.name);
    setNewDescription(game.description || "");
    setSelectedCategories(
      Array.isArray(game.category)
        ? game.category
        : [game.category].filter(Boolean),
    );
    setMinPlayers(game.minPlayers?.toString() || "2");
    setMaxPlayers(game.maxPlayers?.toString() || "4");
    setImageUri(game.imageUrl);
    setVideoUri(game.videoUrl);
    setActiveTab("create");
  };

  const handleDeleteClick = (id: string) => {
    Alert.alert(
      "Atenção",
      "Tem certeza que deseja excluir permanentemente este jogo?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => deleteMutation.mutate(id),
        },
      ],
    );
  };

  // UPLOADS
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.5,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      quality: 0.5,
    });
    if (!result.canceled) setVideoUri(result.assets[0].uri);
  };

  const uploadFile = async (uri: string, endpoint: string) => {
    const formData = new FormData();
    const filename = uri.split("/").pop() || `file-${Date.now()}`;
    const type =
      endpoint === "/uploads/video"
        ? `video/${/\.(\w+)$/.exec(filename)?.[1] || "mp4"}`
        : `image/${/\.(\w+)$/.exec(filename)?.[1] || "jpeg"}`;
    // @ts-ignore
    formData.append("file", { uri, name: filename, type });
    const res = await api.post(endpoint, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.url;
  };

  const handleSaveGame = async () => {
    if (!newName.trim() || selectedCategories.length === 0 || !imageUri) {
      return Alert.alert(
        "Atenção",
        "Nome, pelo menos 1 Categoria e Imagem são obrigatórios.",
      );
    }
    try {
      setIsUploading(true);

      let finalImageUrl = imageUri;
      if (imageUri.startsWith("file://")) {
        // CORRIGIDO PARA CHAT-CONTENT PARA NÃO MISTURAR COM AVATARES
        finalImageUrl = await uploadFile(imageUri, "/uploads/chat-content");
      }

      let finalVideoUrl = videoUri;
      if (videoUri && videoUri.startsWith("file://")) {
        finalVideoUrl = await uploadFile(videoUri, "/uploads/video");
      }

      const payload = {
        name: newName.trim(),
        description: newDescription.trim(),
        category: selectedCategories,
        minPlayers: parseInt(minPlayers) || 2,
        maxPlayers: parseInt(maxPlayers) || 4,
        imageUrl: finalImageUrl,
        videoUrl: finalVideoUrl,
      };

      if (editingGameId) {
        updateMutation.mutate({ id: editingGameId, data: payload });
      } else {
        createMutation.mutate(payload);
      }
    } catch (error) {
      Alert.alert("Erro", "Falha no upload dos arquivos.");
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading)
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#E11D48" />
      </View>
    );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* HEADER E TABS */}
      <View style={styles.header}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "list" && styles.activeTab]}
            onPress={() => {
              setActiveTab("list");
              resetForm();
            }}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "list" && styles.activeTabText,
              ]}
            >
              Catálogo
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "create" && styles.activeTab]}
            onPress={openNewGameForm}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "create" && styles.activeTabText,
              ]}
            >
              {editingGameId ? "Editar Jogo" : "Novo Jogo"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ABA DE CRIAR/EDITAR JOGO */}
      {activeTab === "create" && (
        <ScrollView
          style={styles.formContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionTitle}>
            {editingGameId ? "Editar Jogo ✏️" : "Cadastrar Jogo 🎲"}
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome do Jogo *</Text>
            <TextInput
              style={styles.input}
              value={newName}
              onChangeText={setNewName}
              placeholder="Ex: Catan"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Categorias * (Selecione 1 ou mais)</Text>
            <View style={styles.chipsContainer}>
              {allAvailableCategories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.chip,
                    selectedCategories.includes(cat) && styles.chipActive,
                  ]}
                  onPress={() => toggleCategory(cat)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedCategories.includes(cat) && styles.chipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.customCatRow}>
              <TextInput
                style={[styles.input, { flex: 1, height: 44 }]}
                placeholder="Nova categoria..."
                value={customCategory}
                onChangeText={setCustomCategory}
              />
              <TouchableOpacity
                style={styles.addCatBtn}
                onPress={handleAddCustomCategory}
              >
                <Plus color="#fff" size={16} />
                <Text
                  style={{ color: "#fff", fontWeight: "bold", fontSize: 12 }}
                >
                  Add
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Mín. Jogadores</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={minPlayers}
                onChangeText={setMinPlayers}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Máx. Jogadores</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={maxPlayers}
                onChangeText={setMaxPlayers}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descrição Rápida</Text>
            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: "top" }]}
              multiline
              placeholder="Como o jogo funciona..."
              value={newDescription}
              onChangeText={setNewDescription}
            />
          </View>

          <View style={styles.mediaRow}>
            <TouchableOpacity style={styles.mediaBtn} onPress={pickImage}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.mediaPreview} />
              ) : (
                <>
                  <Camera color="#64748b" size={24} />
                  <Text style={styles.mediaText}>Imagem Capa *</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaBtn} onPress={pickVideo}>
              {videoUri ? (
                <View
                  style={[
                    styles.mediaPreview,
                    {
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: "#e2e8f0",
                    },
                  ]}
                >
                  <Video color="#10b981" size={30} />
                  <Text style={styles.mediaText}>Vídeo Adicionado</Text>
                </View>
              ) : (
                <>
                  <Video color="#64748b" size={24} />
                  <Text style={styles.mediaText}>Vídeo Tutorial</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.addButton, isUploading && { opacity: 0.7 }]}
            onPress={handleSaveGame}
            disabled={
              createMutation.isPending ||
              updateMutation.isPending ||
              isUploading
            }
          >
            {isUploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.addButtonText}>
                  {editingGameId ? "Salvar Alterações" : "Salvar no Catálogo"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ABA DE LISTA (CATÁLOGO) */}
      {activeTab === "list" && (
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Gestão de Inventário</Text>
          <FlatList
            data={games}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.gameCard}>
                <View style={styles.gameInfo}>
                  <Text style={styles.gameName}>{item.name}</Text>
                  <Text style={styles.gameMeta}>
                    {Array.isArray(item.category)
                      ? item.category.join(", ")
                      : item.category}
                  </Text>
                  <Text style={styles.gameMeta}>
                    {item.minPlayers} a {item.maxPlayers} Jogadores
                  </Text>
                </View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    onPress={() => toggleFeatureMutation.mutate(item.id)}
                    style={styles.actionIconBtn}
                  >
                    <Star
                      color={item.isFeatured ? "#f59e0b" : "#cbd5e1"}
                      fill={item.isFeatured ? "#f59e0b" : "transparent"}
                      size={22}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleEditClick(item)}
                    style={styles.actionIconBtn}
                  >
                    <Pencil color="#3b82f6" size={20} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDeleteClick(item.id)}
                    style={[styles.actionIconBtn, { marginRight: 8 }]}
                  >
                    <Trash color="#ef4444" size={20} />
                  </TouchableOpacity>

                  <View style={styles.actions}>
                    <Text
                      style={[
                        styles.statusLabel,
                        { color: item.active ? "#166534" : "#94a3b8" },
                      ]}
                    >
                      {item.active ? "Ativo" : "Inativo"}
                    </Text>
                    <Switch
                      value={item.active}
                      onValueChange={() =>
                        updateStatusMutation.mutate({
                          id: item.id,
                          active: !item.active,
                        })
                      }
                      trackColor={{ false: "#cbd5e1", true: "#E11D48" }}
                    />
                  </View>
                </View>
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 40 }}
            ListEmptyComponent={
              <Text
                style={{ textAlign: "center", color: "#64748b", marginTop: 40 }}
              >
                Nenhum jogo cadastrado ainda.
              </Text>
            }
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  centered: { justifyContent: "center", alignItems: "center" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 10 },
  activeTab: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: { fontSize: 14, fontWeight: "600", color: "#64748b" },
  activeTabText: { color: "#E11D48" },
  formContainer: { flex: 1, padding: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 15,
  },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#475569", marginBottom: 8 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  chipActive: { backgroundColor: "#E11D48", borderColor: "#E11D48" },
  chipText: { fontSize: 13, color: "#475569", fontWeight: "500" },
  chipTextActive: { color: "#fff" },
  customCatRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  addCatBtn: {
    backgroundColor: "#10b981",
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  mediaRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  mediaBtn: {
    flex: 1,
    height: 100,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  mediaPreview: { width: "100%", height: "100%" },
  mediaText: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 8,
    fontWeight: "500",
  },
  addButton: {
    backgroundColor: "#E11D48",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 40,
  },
  addButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  listSection: { flex: 1, padding: 20 },
  gameCard: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  gameInfo: { flex: 1, marginRight: 15 },
  gameName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 4,
  },
  gameMeta: { fontSize: 13, color: "#64748b", marginTop: 2 },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionIconBtn: { padding: 6, backgroundColor: "#f8fafc", borderRadius: 8 },
  actions: { alignItems: "center", marginLeft: 4 },
  statusLabel: { fontSize: 10, fontWeight: "bold", marginBottom: 4 },
});
