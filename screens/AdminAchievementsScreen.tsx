import React, { useState } from "react";
import { View, ScrollView, Image, Pressable } from "react-native";
import { Search, X, Pencil, Camera, Trash2, ChevronUp, ChevronDown } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ColorPicker from "react-native-wheel-color-picker";
import { api } from "../services/api";
import {
  Avatar,
  Button,
  Card,
  Character,
  Checkbox,
  Chip,
  ChipTone,
  FieldLabel,
  IconButton,
  Input,
  MipoText,
  Screen,
  ScreenHeader,
  SegmentedControl,
  useBottomReserve,
  showAlert,
} from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";
import { AccentName, stroke } from "../theme/tokens";
import { uploadMedia, UploadError } from "../services/uploads";

type Tab = "conquistas" | "raridades" | "atribuir";
type AwardAction = "conceder" | "retirar";
type ConditionType = "evento.checkin" | "user.amigos" | "loja.visitas";

const DEFAULT_RARITY_COLOR = "#E11D48";

interface Raridade {
  id: string;
  name: string;
  color: string;
}

interface Conquista {
  id: string;
  title: string;
  icon: string;
  description: string;
  eventId: string;
  condition?: string | null;
  rarity?: Raridade | null;
}

interface ConquistaForm {
  title: string;
  icon: string;
  description: string;
  rarityId: string;
  eventId: string;
  conditionType: string;
  conditionValue: string;
}

interface RaridadeForm {
  name: string;
  color: string;
}

interface AwardUser {
  id: string;
  name?: string;
  nickname?: string;
  avatarUrl?: string | null;
  achievements?: { achievement?: { id: string } }[];
}

const EMPTY_FORM: ConquistaForm = {
  title: "",
  icon: "",
  description: "",
  rarityId: "",
  eventId: "",
  conditionType: "evento.checkin",
  conditionValue: "",
};

const RARITY_TONES_BY_NAME: Record<string, ChipTone> = {
  comum: "neutral",
  rara: "teal",
  epica: "lime",
  lendaria: "pink",
};

const FALLBACK_RARITY_TONES: AccentName[] = ["orange", "lilac", "blue", "yellow"];

function raridadeTone(raridade: Raridade | null | undefined, index: number): ChipTone {
  if (!raridade) return "neutral";
  const key = raridade.name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
  return RARITY_TONES_BY_NAME[key] ?? FALLBACK_RARITY_TONES[index % FALLBACK_RARITY_TONES.length];
}

const TAB_OPTIONS: { value: Tab; label: string }[] = [
  { value: "conquistas", label: "Conquistas" },
  { value: "raridades", label: "Raridades" },
  { value: "atribuir", label: "Atribuir" },
];

const CONDITION_OPTIONS: { value: ConditionType; label: string }[] = [
  { value: "evento.checkin", label: "Eventos" },
  { value: "user.amigos", label: "Amigos" },
  { value: "loja.visitas", label: "Visitas à loja" },
];

const AWARD_OPTIONS: { value: AwardAction; label: string }[] = [
  { value: "conceder", label: "Conceder" },
  { value: "retirar", label: "Retirar" },
];

export default function AdminAchievementsScreen() {
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const bottomReserve = useBottomReserve(false);
  const [activeTab, setActiveTab] = useState<Tab>("conquistas");

  // Estados Form Conquista
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ConquistaForm>(EMPTY_FORM);

  // Estados Form Raridade
  const [editingRarityId, setEditingRarityId] = useState<string | null>(null);
  const [rarityForm, setRarityForm] = useState<RaridadeForm>({ name: "", color: DEFAULT_RARITY_COLOR });

  // Estados Atribuição
  const [userSearch, setUserSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedAchForAward, setSelectedAchForAward] = useState<string | null>(
    null,
  );
  const [awardAction, setAwardAction] = useState<AwardAction>("conceder");

  // Queries
  const { data: achievements = [] } = useQuery<Conquista[]>({
    queryKey: ["achievements"],
    queryFn: async () => (await api.get("/achievements")).data,
  });

  const { data: rarities = [] } = useQuery<Raridade[]>({
    queryKey: ["rarities"],
    queryFn: async () => (await api.get("/achievements/rarities")).data,
  });

  const { data: usersData } = useQuery<{ data?: AwardUser[] }>({
    queryKey: ["admin-users-list"],
    queryFn: async () => (await api.get("/users/admin/list")).data,
  });

  // Mutations
  const uploadMutation = useMutation({
    mutationFn: (uri: string) => uploadMedia({ uri }, "/uploads/avatar"),
  });

  const saveAchMutation = useMutation({
    mutationFn: (data: ConquistaForm) => {
      const condition = data.conditionValue
        ? `${data.conditionType}.${data.conditionValue}`
        : null;

      const payload = {
        title: data.title,
        icon: data.icon,
        description: data.description,
        rarityId: data.rarityId || undefined,
        eventId: data.eventId || undefined,
        condition,
      };

      return editingId
        ? api.patch(`/achievements/${editingId}`, payload)
        : api.post("/achievements", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      resetAchForm();
      showAlert(
        "Sucesso",
        editingId ? "Conquista atualizada!" : "Conquista criada!",
      );
    },
  });

  const saveRarityMutation = useMutation({
    mutationFn: (data: RaridadeForm) =>
      editingRarityId
        ? api.patch(`/achievements/rarities/${editingRarityId}`, data)
        : api.post("/achievements/rarities", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rarities"] });
      resetRarityForm();
      showAlert(
        "Sucesso",
        editingRarityId ? "Raridade atualizada!" : "Raridade criada!",
      );
    },
  });

  const reorderRaritiesMutation = useMutation({
    mutationFn: (rarityIds: string[]) =>
      api.patch("/achievements/rarities/order", { rarityIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rarities"] });
    },
  });

  const processAwardMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAchForAward) throw new Error("Selecione uma conquista");

      if (awardAction === "conceder") {
        await api.post("/achievements/award", {
          userIds: selectedUsers,
          achievementId: selectedAchForAward,
        });
      } else {
        // Retirar conquista de todos os selecionados
        await Promise.all(
          selectedUsers.map((userId) =>
            api.delete(`/achievements/${selectedAchForAward}/user/${userId}`),
          ),
        );
      }
    },
    onSuccess: () => {
      showAlert(
        "Sucesso",
        awardAction === "conceder"
          ? "Conquistas atribuídas com sucesso!"
          : "Conquistas removidas com sucesso!",
      );
      setSelectedUsers([]);
      // Recarrega lista de usuários para atualizar a listagem local
      queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
    },
  });

  // Resets
  const resetAchForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const resetRarityForm = () => {
    setEditingRarityId(null);
    setRarityForm({ name: "", color: DEFAULT_RARITY_COLOR });
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      try {
        const url = await uploadMutation.mutateAsync(result.assets[0].uri);
        setForm({ ...form, icon: url });
      } catch (error) {
        showAlert("Erro", error instanceof UploadError ? error.message : "Não foi possível enviar o ícone.");
      }
    }
  };

  const handleMoveRarity = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === rarities.length - 1) return;

    const newRarities = [...rarities];
    const temp = newRarities[index];
    newRarities[index] = newRarities[index + (direction === "up" ? -1 : 1)];
    newRarities[index + (direction === "up" ? -1 : 1)] = temp;

    reorderRaritiesMutation.mutate(newRarities.map((r) => r.id));
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  // Filtro inteligente de usuários
  const filteredUsers =
    usersData?.data?.filter((u) => {
      // 1. Proteção contra nomes/nicks vazios (Evita que o .toLowerCase quebre a lista inteira)
      const name = u.name || "";
      const nick = u.nickname || "";
      const search = userSearch.toLowerCase();

      const matchesSearch =
        name.toLowerCase().includes(search) ||
        nick.toLowerCase().includes(search);

      if (!matchesSearch) return false;

      // 2. Filtro por Ação Inteligente
      if (selectedAchForAward) {
        // Verifica se a array de conquistas do usuário tem o ID da conquista selecionada
        const hasAchievement = u.achievements?.some(
          (ua) => ua.achievement?.id === selectedAchForAward,
        );

        if (awardAction === "retirar") {
          // Se for RETIRAR, mostra APENAS quem TEM a conquista
          return hasAchievement;
        }

        if (awardAction === "conceder") {
          // Se for CONCEDER, mostra APENAS quem AINDA NÃO TEM a conquista
          return !hasAchievement;
        }
      }

      return true;
    }) || [];

  const selectedRarityIndex = rarities.findIndex((r) => r.id === form.rarityId);
  const selectedRarity = selectedRarityIndex >= 0 ? rarities[selectedRarityIndex] : null;
  const showAwardButton = activeTab === "atribuir" && selectedUsers.length > 0 && Boolean(selectedAchForAward);

  return (
    <Screen>
      <ScreenHeader title="Conquistas" />
      <SegmentedControl options={TAB_OPTIONS} value={activeTab} onChange={setActiveTab} />

      <ScrollView
        style={{ marginHorizontal: -14, marginTop: 12 }}
        contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 4, paddingBottom: bottomReserve + 80 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "conquistas" && (
          <View>
            <Card tone="yellow" contentStyle={{ alignItems: "center", gap: 6, paddingVertical: 16 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Escolher imagem da conquista"
                onPress={handlePickImage}
              >
                {form.icon ? (
                  <Image
                    source={{ uri: form.icon }}
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: 50,
                      borderWidth: stroke.thick,
                      borderColor: selectedRarity?.color ?? colors.line,
                    }}
                  />
                ) : (
                  <Character name="trofeu1" size={100} motion="wiggle" />
                )}
                <View
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    borderWidth: stroke.regular,
                    borderColor: colors.line,
                    backgroundColor: colors.pink,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {form.icon ? <Pencil size={14} color={colors.onPink} /> : <Camera size={14} color={colors.onPink} />}
                </View>
              </Pressable>
              <MipoText variant="section" color="onColor" numberOfLines={2} style={{ textAlign: "center" }}>
                {form.title || (editingId ? "Editar conquista" : "Nova conquista")}
              </MipoText>
              <Chip
                label={selectedRarity?.name ?? "Padrão"}
                tone={raridadeTone(selectedRarity, selectedRarityIndex)}
                style={{ alignSelf: "center" }}
              />
            </Card>

            <FieldLabel>Nome</FieldLabel>
            <Input
              placeholder="Título"
              value={form.title}
              onChangeText={(t) => setForm({ ...form, title: t })}
            />
            <FieldLabel>Descrição</FieldLabel>
            <Input
              placeholder="Descrição"
              multiline
              containerStyle={{ minHeight: 70 }}
              value={form.description}
              onChangeText={(t) => setForm({ ...form, description: t })}
            />

            <FieldLabel>Raridade</FieldLabel>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <Chip
                label="Padrão"
                tone={!form.rarityId ? "active" : "neutral"}
                selected={!form.rarityId}
                onPress={() => setForm({ ...form, rarityId: "" })}
              />
              {rarities.map((r, index) => {
                const selected = form.rarityId === r.id;
                const tone = raridadeTone(r, index);
                return (
                  <Chip
                    key={r.id}
                    label={r.name}
                    tone={selected ? (tone === "neutral" ? "active" : tone) : "neutral"}
                    selected={selected}
                    onPress={() => setForm({ ...form, rarityId: r.id })}
                  />
                );
              })}
            </View>

            <FieldLabel>Condição automática</FieldLabel>
            <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <SegmentedControl<string>
                  options={CONDITION_OPTIONS}
                  value={form.conditionType}
                  onChange={(type) => setForm({ ...form, conditionType: type })}
                />
              </View>
              <Input
                containerStyle={{ width: 90 }}
                placeholder="Qtd"
                keyboardType="numeric"
                value={form.conditionValue}
                onChangeText={(v) => setForm({ ...form, conditionValue: v })}
              />
            </View>

            <View style={{ flexDirection: "row", gap: 10, alignItems: "center", marginTop: 16 }}>
              <Button
                label={editingId ? "Salvar alterações" : "Criar conquista"}
                variant="red"
                block
                loading={saveAchMutation.isPending}
                style={{ flex: 1 }}
                onPress={() => saveAchMutation.mutate(form)}
              />
              {editingId && (
                <IconButton icon={X} size={44} accessibilityLabel="Cancelar edição" onPress={resetAchForm} />
              )}
            </View>

            <View style={{ gap: 10, marginTop: 20 }}>
              {achievements.map((item) => {
                const rarityIndex = rarities.findIndex((r) => r.id === item.rarity?.id);
                return (
                  <Card key={item.id} contentStyle={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 25,
                        overflow: "hidden",
                        backgroundColor: colors.sunken,
                        borderWidth: stroke.thick,
                        borderColor: item.rarity?.color || colors.line,
                      }}
                    >
                      <Image source={{ uri: item.icon }} style={{ width: "100%", height: "100%" }} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <MipoText variant="cardTitle" numberOfLines={1}>
                        {item.title}
                      </MipoText>
                      <MipoText variant="micro" numberOfLines={1}>
                        {item.condition ? `Auto: ${item.condition}` : "Entrega manual"}
                      </MipoText>
                      {item.rarity && <Chip label={item.rarity.name} tone={raridadeTone(item.rarity, rarityIndex)} />}
                    </View>
                    <IconButton
                      icon={Pencil}
                      size={36}
                      accessibilityLabel={`Editar ${item.title}`}
                      onPress={() => {
                        const [type, val] = (item.condition || "").split(".");
                        setEditingId(item.id);
                        setForm({
                          ...item,
                          rarityId: item.rarity?.id || "",
                          conditionType: type || "evento.checkin",
                          conditionValue: val || "",
                        });
                      }}
                    />
                    <IconButton
                      icon={Trash2}
                      size={36}
                      tone="red"
                      accessibilityLabel={`Excluir ${item.title}`}
                      onPress={() =>
                        api.delete(`/achievements/${item.id}`).then(() =>
                          queryClient.invalidateQueries({
                            queryKey: ["achievements"],
                          }),
                        )
                      }
                    />
                  </Card>
                );
              })}
            </View>
          </View>
        )}

        {activeTab === "raridades" && (
          <View>
            <Card>
              <MipoText variant="cardTitle">{editingRarityId ? "Editar raridade" : "Nova raridade"}</MipoText>
              <FieldLabel>Nome</FieldLabel>
              <Input
                placeholder="Nome (Ex: Lendária)"
                value={rarityForm.name}
                onChangeText={(t) => setRarityForm({ ...rarityForm, name: t })}
              />

              <FieldLabel>Cor da raridade</FieldLabel>
              <View style={{ height: 250, marginBottom: 16 }}>
                <ColorPicker
                  color={rarityForm.color}
                  onColorChangeComplete={(color) =>
                    setRarityForm({ ...rarityForm, color })
                  }
                  thumbSize={30}
                  sliderSize={20}
                  noSnap={true}
                  row={false}
                />
              </View>

              <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                <Button
                  label={editingRarityId ? "Salvar raridade" : "Adicionar raridade"}
                  variant="red"
                  block
                  loading={saveRarityMutation.isPending}
                  style={{ flex: 1 }}
                  onPress={() => saveRarityMutation.mutate(rarityForm)}
                />
                {editingRarityId && (
                  <IconButton icon={X} size={44} accessibilityLabel="Cancelar edição" onPress={resetRarityForm} />
                )}
              </View>
            </Card>

            <View style={{ gap: 10, marginTop: 20 }}>
              {rarities.map((item, index) => (
                <Card key={item.id} contentStyle={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      borderWidth: stroke.regular,
                      borderColor: colors.line,
                      backgroundColor: item.color,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <MipoText variant="cardTitle" numberOfLines={1}>
                      {item.name}
                    </MipoText>
                    <MipoText variant="micro">{item.color}</MipoText>
                  </View>
                  <IconButton
                    icon={ChevronUp}
                    size={32}
                    accessibilityLabel={`Subir ${item.name}`}
                    disabled={index === 0}
                    onPress={() => handleMoveRarity(index, "up")}
                  />
                  <IconButton
                    icon={ChevronDown}
                    size={32}
                    accessibilityLabel={`Descer ${item.name}`}
                    disabled={index === rarities.length - 1}
                    onPress={() => handleMoveRarity(index, "down")}
                  />
                  <IconButton
                    icon={Pencil}
                    size={32}
                    accessibilityLabel={`Editar ${item.name}`}
                    onPress={() => {
                      setEditingRarityId(item.id);
                      setRarityForm({ name: item.name, color: item.color });
                    }}
                  />
                  <IconButton
                    icon={Trash2}
                    size={32}
                    tone="red"
                    accessibilityLabel={`Excluir ${item.name}`}
                    onPress={() =>
                      api.delete(`/achievements/rarities/${item.id}`).then(() =>
                        queryClient.invalidateQueries({
                          queryKey: ["rarities"],
                        }),
                      )
                    }
                  />
                </Card>
              ))}
            </View>
          </View>
        )}

        {activeTab === "atribuir" && (
          <View>
            <FieldLabel>1. Selecione a conquista</FieldLabel>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -14 }}
              contentContainerStyle={{ gap: 10, paddingHorizontal: 14, paddingVertical: 4, paddingBottom: 8 }}
            >
              {achievements.map((item) => (
                <Card
                  key={item.id}
                  tone={selectedAchForAward === item.id ? "yellow" : "neutral"}
                  accessibilityLabel={item.title}
                  style={{ width: 96 }}
                  contentStyle={{ alignItems: "center", gap: 6, height: 100, justifyContent: "center" }}
                  onPress={() => {
                    setSelectedAchForAward(item.id);
                    setSelectedUsers([]); // Limpa usuários ao trocar de conquista
                  }}
                >
                  <Image source={{ uri: item.icon }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                  <MipoText
                    variant="micro"
                    color={selectedAchForAward === item.id ? "onColor" : "text"}
                    numberOfLines={1}
                    style={{ textAlign: "center" }}
                  >
                    {item.title}
                  </MipoText>
                </Card>
              ))}
            </ScrollView>

            {selectedAchForAward && (
              <>
                <FieldLabel>2. O que deseja fazer?</FieldLabel>
                <SegmentedControl
                  options={AWARD_OPTIONS}
                  value={awardAction}
                  onChange={(action) => {
                    setAwardAction(action);
                    setSelectedUsers([]);
                  }}
                />
              </>
            )}

            {selectedAchForAward && (
              <>
                <FieldLabel>3. Selecione os usuários</FieldLabel>
                {awardAction === "retirar" && (
                  <MipoText variant="caption" color="red" style={{ marginBottom: 8 }}>
                    Mostrando apenas usuários que já possuem esta conquista.
                  </MipoText>
                )}
                <Input
                  icon={Search}
                  placeholder="Buscar por nome ou @nickname..."
                  value={userSearch}
                  onChangeText={setUserSearch}
                  autoCapitalize="none"
                />

                {filteredUsers.length === 0 ? (
                  <MipoText variant="caption" style={{ textAlign: "center", marginTop: 20 }}>
                    Nenhum usuário encontrado.
                  </MipoText>
                ) : (
                  <View style={{ gap: 8, marginTop: 12 }}>
                    {filteredUsers.map((u) => (
                      <Pressable
                        key={u.id}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selectedUsers.includes(u.id) }}
                        accessibilityLabel={u.name || u.nickname || "Usuário"}
                        onPress={() => toggleUser(u.id)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                          padding: 10,
                          borderRadius: 16,
                          borderWidth: stroke.regular,
                          borderColor: colors.line,
                          backgroundColor: selectedUsers.includes(u.id) ? colors.surface2 : colors.surface,
                        }}
                      >
                        <Checkbox
                          checked={selectedUsers.includes(u.id)}
                          onChange={() => toggleUser(u.id)}
                          accessibilityLabel={`Selecionar ${u.name || u.nickname || "usuário"}`}
                        />
                        <Avatar id={u.id} name={u.name || u.nickname || "?"} uri={u.avatarUrl} />
                        <View style={{ flex: 1 }}>
                          <MipoText variant="cardTitle" numberOfLines={1}>
                            {u.name}
                          </MipoText>
                          <MipoText variant="micro" numberOfLines={1}>
                            @{u.nickname}
                          </MipoText>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>

      {showAwardButton && (
        <View style={{ position: "absolute", left: 14, right: 14, bottom: bottomReserve }}>
          <Button
            label={`${awardAction === "conceder" ? "Atribuir a" : "Retirar de"} ${selectedUsers.length} selecionados`}
            variant={awardAction === "retirar" ? "red" : "teal"}
            block
            loading={processAwardMutation.isPending}
            onPress={() => processAwardMutation.mutate()}
          />
        </View>
      )}
    </Screen>
  );
}
