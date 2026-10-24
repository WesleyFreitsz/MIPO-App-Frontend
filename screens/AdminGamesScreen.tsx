import React, { useState, useMemo } from "react";
import {
  View,
  FlatList,
  Switch,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import {
  Plus,
  Star,
  Camera,
  Video,
  Gamepad2,
  Pencil,
  Trash,
  Search,
} from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { api } from "../services/api";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Fab,
  FieldLabel,
  IconButton,
  Input,
  LoadingState,
  MipoText,
  Screen,
  ScreenHeader,
  useBottomReserve,
} from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";
import { AccentName, foregroundOn, radius, stroke } from "../theme/tokens";

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

const THUMBNAIL_TONES: AccentName[] = ["yellow", "teal", "pink", "lime", "lilac", "orange"];

interface CatalogGame {
  id: string;
  name: string;
  description?: string;
  category?: string | string[];
  minPlayers?: number;
  maxPlayers?: number;
  imageUrl?: string | null;
  videoUrl?: string | null;
  isFeatured?: boolean;
  active: boolean;
}

interface GamePayload {
  name: string;
  description: string;
  category: string[];
  minPlayers: number;
  maxPlayers: number;
  imageUrl: string;
  videoUrl: string | null;
}

function categoriesOf(game: CatalogGame): string[] {
  return (Array.isArray(game.category) ? game.category : [game.category]).filter(
    (category): category is string => Boolean(category),
  );
}

export default function AdminGamesScreen() {
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const bottomReserve = useBottomReserve(false);

  // Controle de Abas e Edição
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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
  const { data: games = [], isLoading } = useQuery<CatalogGame[]>({
    queryKey: ["games", "admin-all"],
    queryFn: async () => {
      const res = await api.get("/games?active=all");
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    },
  });

  // Extrai categorias dinâmicas
  const allAvailableCategories = useMemo(() => {
    const existing = games.flatMap(categoriesOf);
    return Array.from(new Set([...PREDEFINED_CATEGORIES, ...existing]));
  }, [games]);

  const filteredGames = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("pt-BR");
    if (!query) return games;
    return games.filter((game) => game.name.toLocaleLowerCase("pt-BR").includes(query));
  }, [games, searchQuery]);

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
    mutationFn: (dto: GamePayload) => api.post("/games", dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["games"] });
      resetForm();
      setActiveTab("list");
      Alert.alert("Sucesso", "Jogo registrado com sucesso!");
    },
    onError: () => Alert.alert("Erro", "Falha ao registrar jogo."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: GamePayload }) =>
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

  const closeForm = () => {
    setActiveTab("list");
    resetForm();
  };

  const handleEditClick = (game: CatalogGame) => {
    setEditingGameId(game.id);
    setNewName(game.name);
    setNewDescription(game.description || "");
    setSelectedCategories(categoriesOf(game));
    setMinPlayers(game.minPlayers?.toString() || "2");
    setMaxPlayers(game.maxPlayers?.toString() || "4");
    setImageUri(game.imageUrl ?? null);
    setVideoUri(game.videoUrl ?? null);
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

      const payload: GamePayload = {
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

  const mediaBoxStyle = {
    flex: 1,
    height: 100,
    borderRadius: radius.tile,
    borderWidth: stroke.regular,
    borderColor: colors.line,
    borderStyle: "dashed" as const,
    backgroundColor: colors.surface,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    overflow: "hidden" as const,
    gap: 6,
  };

  if (isLoading)
    return (
      <Screen>
        <ScreenHeader title="Acervo" />
        <LoadingState />
      </Screen>
    );

  if (activeTab === "create") {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Screen scroll>
          <ScreenHeader title={editingGameId ? "Editar jogo" : "Novo jogo"} onBack={closeForm} />

          <FieldLabel>Nome do jogo *</FieldLabel>
          <Input value={newName} onChangeText={setNewName} placeholder="Ex: Catan" />

          <FieldLabel>Categorias * (selecione 1 ou mais)</FieldLabel>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            {allAvailableCategories.map((cat) => (
              <Chip
                key={cat}
                label={cat}
                tone={selectedCategories.includes(cat) ? "active" : "neutral"}
                selected={selectedCategories.includes(cat)}
                onPress={() => toggleCategory(cat)}
              />
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <Input
              containerStyle={{ flex: 1 }}
              placeholder="Nova categoria..."
              value={customCategory}
              onChangeText={setCustomCategory}
            />
            <Button label="Adicionar" icon={Plus} variant="teal" onPress={handleAddCustomCategory} />
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <FieldLabel>Mín. jogadores</FieldLabel>
              <Input keyboardType="numeric" value={minPlayers} onChangeText={setMinPlayers} />
            </View>
            <View style={{ flex: 1 }}>
              <FieldLabel>Máx. jogadores</FieldLabel>
              <Input keyboardType="numeric" value={maxPlayers} onChangeText={setMaxPlayers} />
            </View>
          </View>

          <FieldLabel>Descrição rápida</FieldLabel>
          <Input
            multiline
            containerStyle={{ minHeight: 100 }}
            placeholder="Como o jogo funciona..."
            value={newDescription}
            onChangeText={setNewDescription}
          />

          <View style={{ flexDirection: "row", gap: 12, marginTop: 16, marginBottom: 20 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Escolher imagem de capa" style={mediaBoxStyle} onPress={pickImage}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={{ width: "100%", height: "100%" }} />
              ) : (
                <>
                  <Camera color={colors.muted} size={24} />
                  <MipoText variant="caption">Imagem de capa *</MipoText>
                </>
              )}
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Escolher vídeo tutorial" style={mediaBoxStyle} onPress={pickVideo}>
              {videoUri ? (
                <View style={{ flex: 1, alignSelf: "stretch", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.teal }}>
                  <Video color={colors.onColor} size={28} />
                  <MipoText variant="caption" color="onColor">
                    Vídeo adicionado
                  </MipoText>
                </View>
              ) : (
                <>
                  <Video color={colors.muted} size={24} />
                  <MipoText variant="caption">Vídeo tutorial</MipoText>
                </>
              )}
            </Pressable>
          </View>

          <Button
            label={editingGameId ? "Salvar alterações" : "Salvar no acervo"}
            variant="red"
            block
            loading={isUploading}
            disabled={createMutation.isPending || updateMutation.isPending}
            onPress={handleSaveGame}
          />
        </Screen>
      </KeyboardAvoidingView>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Acervo" subtitle={`${games.length} jogos`} />
      <Input icon={Search} placeholder="Buscar jogo" value={searchQuery} onChangeText={setSearchQuery} />
      <FlatList
        data={filteredGames}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        style={{ marginHorizontal: -14, marginTop: 12 }}
        contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 4, paddingBottom: bottomReserve + 80, gap: 12 }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item, index }) => {
          const tone = THUMBNAIL_TONES[index % THUMBNAIL_TONES.length];
          return (
            <Card style={item.active ? undefined : { opacity: 0.7 }} contentStyle={{ gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View
                  style={{
                    width: 40,
                    height: 48,
                    borderRadius: 12,
                    borderWidth: stroke.regular,
                    borderColor: colors.line,
                    backgroundColor: colors[tone],
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={{ width: "100%", height: "100%" }} />
                  ) : (
                    <Gamepad2 size={20} color={foregroundOn(tone, colors)} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <MipoText variant="cardTitle" numberOfLines={1}>
                    {item.name}
                  </MipoText>
                  <MipoText variant="micro" numberOfLines={1}>
                    {categoriesOf(item).join(", ")}
                  </MipoText>
                  <MipoText variant="micro" numberOfLines={1}>
                    {item.minPlayers} a {item.maxPlayers} jogadores
                  </MipoText>
                </View>
                <IconButton icon={Pencil} accessibilityLabel={`Editar ${item.name}`} onPress={() => handleEditClick(item)} />
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <IconButton
                  icon={Star}
                  tone={item.isFeatured ? "yellow" : "neutral"}
                  size={36}
                  accessibilityLabel={item.isFeatured ? `Tirar ${item.name} dos destaques` : `Destacar ${item.name}`}
                  onPress={() => toggleFeatureMutation.mutate(item.id)}
                />
                <IconButton
                  icon={Trash}
                  tone="red"
                  size={36}
                  accessibilityLabel={`Excluir ${item.name}`}
                  onPress={() => handleDeleteClick(item.id)}
                />
                <View style={{ flex: 1 }} />
                <Chip label={item.active ? "Ativo" : "Inativo"} tone={item.active ? "lime" : "neutral"} />
                <Switch
                  accessibilityLabel={`${item.name} ativo`}
                  value={item.active}
                  onValueChange={() =>
                    updateStatusMutation.mutate({
                      id: item.id,
                      active: !item.active,
                    })
                  }
                  trackColor={{ false: colors.sunken, true: colors.pink }}
                  thumbColor={colors.surface}
                />
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={<EmptyState character="dado2" title="Nenhum jogo cadastrado ainda." />}
      />
      <View pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
        <Fab icon={Plus} accessibilityLabel="Cadastrar jogo" onPress={openNewGameForm} />
      </View>
    </Screen>
  );
}
