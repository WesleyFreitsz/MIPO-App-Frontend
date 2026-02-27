import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ScrollView,
  Image,
} from "react-native";
import {
  Trophy,
  Settings,
  Users,
  Check,
  Search,
  X,
  Pencil,
  Camera,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ColorPicker from "react-native-wheel-color-picker";
import { api } from "../services/api";

type Tab = "conquistas" | "raridades" | "atribuir";
type AwardAction = "conceder" | "retirar";

export default function AdminAchievementsScreen() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("conquistas");

  // Estados Form Conquista
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    icon: "",
    description: "",
    rarityId: "",
    eventId: "",
    conditionType: "evento.checkin",
    conditionValue: "",
  });

  // Estados Form Raridade
  const [editingRarityId, setEditingRarityId] = useState<string | null>(null);
  const [rarityForm, setRarityForm] = useState({ name: "", color: "#E11D48" });

  // Estados Atribuição
  const [userSearch, setUserSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedAchForAward, setSelectedAchForAward] = useState<string | null>(
    null,
  );
  const [awardAction, setAwardAction] = useState<AwardAction>("conceder");

  // Queries
  const { data: achievements = [] } = useQuery({
    queryKey: ["achievements"],
    queryFn: async () => (await api.get("/achievements")).data,
  });

  const { data: rarities = [] } = useQuery({
    queryKey: ["rarities"],
    queryFn: async () => (await api.get("/achievements/rarities")).data,
  });

  const { data: usersData } = useQuery({
    queryKey: ["admin-users-list"],
    queryFn: async () => (await api.get("/users/admin/list")).data,
  });

  // Mutations
  const uploadMutation = useMutation({
    mutationFn: async (uri: string) => {
      const formData = new FormData();
      const filename = uri.split("/").pop();
      const match = /\.(\w+)$/.exec(filename || "");
      const type = match ? `image/${match[1]}` : `image`;
      // @ts-ignore
      formData.append("file", { uri, name: filename, type });
      const res = await api.post("/uploads/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data.url;
    },
  });

  const saveAchMutation = useMutation({
    mutationFn: (data: any) => {
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
      Alert.alert(
        "Sucesso",
        editingId ? "Conquista atualizada!" : "Conquista criada!",
      );
    },
  });

  const saveRarityMutation = useMutation({
    mutationFn: (data: any) =>
      editingRarityId
        ? api.patch(`/achievements/rarities/${editingRarityId}`, data)
        : api.post("/achievements/rarities", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rarities"] });
      resetRarityForm();
      Alert.alert(
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
      Alert.alert(
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
    setForm({
      title: "",
      icon: "",
      description: "",
      rarityId: "",
      eventId: "",
      conditionType: "evento.checkin",
      conditionValue: "",
    });
  };

  const resetRarityForm = () => {
    setEditingRarityId(null);
    setRarityForm({ name: "", color: "#E11D48" });
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      const url = await uploadMutation.mutateAsync(result.assets[0].uri);
      setForm({ ...form, icon: url });
    }
  };

  const handleMoveRarity = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === rarities.length - 1) return;

    const newRarities = [...rarities];
    const temp = newRarities[index];
    newRarities[index] = newRarities[index + (direction === "up" ? -1 : 1)];
    newRarities[index + (direction === "up" ? -1 : 1)] = temp;

    reorderRaritiesMutation.mutate(newRarities.map((r: any) => r.id));
  };

  // Filtro inteligente de usuários
  const filteredUsers =
    usersData?.data?.filter((u: any) => {
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
          (ua: any) => ua.achievement?.id === selectedAchForAward,
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
  return (
    <View style={styles.container}>
      {/* ABAS */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "conquistas" && styles.tabActive]}
          onPress={() => setActiveTab("conquistas")}
        >
          <Trophy
            size={20}
            color={activeTab === "conquistas" ? "#E11D48" : "#64748b"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "conquistas" && styles.tabTextActive,
            ]}
          >
            Conquistas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "raridades" && styles.tabActive]}
          onPress={() => setActiveTab("raridades")}
        >
          <Settings
            size={20}
            color={activeTab === "raridades" ? "#E11D48" : "#64748b"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "raridades" && styles.tabTextActive,
            ]}
          >
            Raridades
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "atribuir" && styles.tabActive]}
          onPress={() => setActiveTab("atribuir")}
        >
          <Users
            size={20}
            color={activeTab === "atribuir" ? "#E11D48" : "#64748b"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "atribuir" && styles.tabTextActive,
            ]}
          >
            Atribuir
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* CONQUISTAS TAB */}
        {activeTab === "conquistas" && (
          <View style={styles.section}>
            {/* Form de Conquista omitido parcialmente para poupar linhas, mantenha o que eu já havia te mandado (card de form) */}
            <View style={styles.card}>
              <Text style={styles.label}>
                {editingId ? "Editar Conquista" : "Nova Conquista"}
              </Text>

              <TouchableOpacity
                style={styles.imagePicker}
                onPress={handlePickImage}
              >
                {form.icon ? (
                  <Image
                    source={{ uri: form.icon }}
                    style={styles.previewImage}
                  />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Camera color="#64748b" size={30} />
                  </View>
                )}
                <View style={styles.editBadge}>
                  <Pencil size={12} color="#fff" />
                </View>
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                placeholder="Título"
                value={form.title}
                onChangeText={(t) => setForm({ ...form, title: t })}
              />
              <TextInput
                style={[styles.input, { height: 60 }]}
                placeholder="Descrição"
                multiline
                value={form.description}
                onChangeText={(t) => setForm({ ...form, description: t })}
              />

              <Text style={styles.subLabel}>Raridade da Conquista</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 15 }}
                contentContainerStyle={{ gap: 10 }}
              >
                <TouchableOpacity
                  onPress={() => setForm({ ...form, rarityId: "" })}
                  style={[
                    styles.rarityPill,
                    !form.rarityId && styles.rarityPillSelected,
                  ]}
                >
                  <Text style={styles.rarityPillText}>Padrão</Text>
                </TouchableOpacity>
                {rarities.map((r: any) => (
                  <TouchableOpacity
                    key={r.id}
                    onPress={() => setForm({ ...form, rarityId: r.id })}
                    style={[
                      styles.rarityPill,
                      form.rarityId === r.id && {
                        borderColor: r.color,
                        borderWidth: 2,
                        backgroundColor: r.color + "20",
                      },
                    ]}
                  >
                    <View
                      style={[styles.rarityDot, { backgroundColor: r.color }]}
                    />
                    <Text style={styles.rarityPillText}>{r.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.subLabel}>Condição Automática</Text>
              <View style={styles.conditionRow}>
                <View style={styles.pickerContainer}>
                  {["evento.checkin", "user.amigos"].map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setForm({ ...form, conditionType: type })}
                      style={[
                        styles.miniTab,
                        form.conditionType === type && styles.miniTabActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.miniTabText,
                          form.conditionType === type &&
                            styles.miniTabTextActive,
                        ]}
                      >
                        {type === "user.amigos" ? "Amigos" : "Eventos"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={[styles.input, { flex: 0.4, marginBottom: 0 }]}
                  placeholder="Qtd"
                  keyboardType="numeric"
                  value={form.conditionValue}
                  onChangeText={(v) => setForm({ ...form, conditionValue: v })}
                />
              </View>

              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.submitBtn, { flex: 1 }]}
                  onPress={() => saveAchMutation.mutate(form)}
                >
                  <Text style={styles.submitBtnText}>
                    {editingId ? "Salvar Alterações" : "Criar Conquista"}
                  </Text>
                </TouchableOpacity>
                {editingId && (
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={resetAchForm}
                  >
                    <X color="#64748b" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Listagem Conquistas */}
            {achievements.map((item: any) => {
              const rarityColor = item.rarity?.color || "#cbd5e1";
              return (
                <View key={item.id} style={styles.item}>
                  <View
                    style={[
                      styles.circleImageContainer,
                      { borderColor: rarityColor },
                    ]}
                  >
                    <Image
                      source={{ uri: item.icon }}
                      style={styles.circleImage}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemSub}>
                      {item.condition
                        ? `Auto: ${item.condition}`
                        : "Entrega Manual"}
                    </Text>
                    {item.rarity && (
                      <Text
                        style={[
                          styles.itemSub,
                          { color: item.rarity.color, fontWeight: "bold" },
                        ]}
                      >
                        {item.rarity.name}
                      </Text>
                    )}
                  </View>
                  <View style={styles.itemActions}>
                    <TouchableOpacity
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
                    >
                      <Pencil
                        color="#64748b"
                        size={20}
                        style={{ marginRight: 15 }}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        api.delete(`/achievements/${item.id}`).then(() =>
                          queryClient.invalidateQueries({
                            queryKey: ["achievements"],
                          }),
                        )
                      }
                    >
                      <Trash2 color="#ef4444" size={20} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* RARIDADES TAB */}
        {activeTab === "raridades" && (
          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.label}>
                {editingRarityId ? "Editar Raridade" : "Nova Raridade"}
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Nome (Ex: Lendária)"
                value={rarityForm.name}
                onChangeText={(t) => setRarityForm({ ...rarityForm, name: t })}
              />

              <Text style={styles.subLabel}>Cor da Raridade</Text>
              <View style={styles.colorPickerContainer}>
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

              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.submitBtn, { flex: 1 }]}
                  onPress={() => saveRarityMutation.mutate(rarityForm)}
                >
                  <Text style={styles.submitBtnText}>
                    {editingRarityId ? "Salvar Raridade" : "Adicionar Raridade"}
                  </Text>
                </TouchableOpacity>
                {editingRarityId && (
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={resetRarityForm}
                  >
                    <X color="#64748b" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {rarities.map((item: any, index: number) => (
              <View
                key={item.id}
                style={[
                  styles.item,
                  { borderLeftWidth: 6, borderLeftColor: item.color },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{item.name}</Text>
                  <Text style={styles.itemSub}>{item.color}</Text>
                </View>

                {/* Controles de Ordenação */}
                <View style={styles.orderControls}>
                  <TouchableOpacity
                    onPress={() => handleMoveRarity(index, "up")}
                    disabled={index === 0}
                    style={{ opacity: index === 0 ? 0.3 : 1 }}
                  >
                    <ChevronUp color="#1e293b" size={24} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleMoveRarity(index, "down")}
                    disabled={index === rarities.length - 1}
                    style={{ opacity: index === rarities.length - 1 ? 0.3 : 1 }}
                  >
                    <ChevronDown color="#1e293b" size={24} />
                  </TouchableOpacity>
                </View>

                {/* Botões de Ação da Raridade */}
                <View style={[styles.itemActions, { marginLeft: 15 }]}>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingRarityId(item.id);
                      setRarityForm({ name: item.name, color: item.color });
                    }}
                    style={{ marginRight: 15 }}
                  >
                    <Pencil color="#64748b" size={20} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      api.delete(`/achievements/rarities/${item.id}`).then(() =>
                        queryClient.invalidateQueries({
                          queryKey: ["rarities"],
                        }),
                      )
                    }
                  >
                    <Trash2 color="#ef4444" size={20} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ATRIBUIR TAB (NOVO FLUXO) */}
        {activeTab === "atribuir" && (
          <View style={styles.section}>
            {/* PASSO 1: Selecionar Conquista */}
            <Text style={styles.label}>1. Selecione a Conquista</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 20 }}
              contentContainerStyle={{ gap: 10 }}
            >
              {achievements.map((item: any) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.achSelectorItem,
                    selectedAchForAward === item.id && {
                      borderColor: "#E11D48",
                      borderWidth: 2,
                      backgroundColor: "#fff1f2",
                    },
                  ]}
                  onPress={() => {
                    setSelectedAchForAward(item.id);
                    setSelectedUsers([]); // Limpa usuários ao trocar de conquista
                  }}
                >
                  <Image
                    source={{ uri: item.icon }}
                    style={styles.achSelectorImg}
                  />
                  <Text style={styles.achSelectorText} numberOfLines={1}>
                    {item.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* PASSO 2: Selecionar Ação */}
            {selectedAchForAward && (
              <>
                <Text style={styles.label}>2. O que deseja fazer?</Text>
                <View style={styles.actionToggleRow}>
                  <TouchableOpacity
                    style={[
                      styles.actionToggleBtn,
                      awardAction === "conceder" &&
                        styles.actionToggleBtnActiveConceder,
                    ]}
                    onPress={() => {
                      setAwardAction("conceder");
                      setSelectedUsers([]);
                    }}
                  >
                    <Text
                      style={[
                        styles.actionToggleText,
                        awardAction === "conceder" &&
                          styles.actionToggleTextActive,
                      ]}
                    >
                      Conceder Conquista
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionToggleBtn,
                      awardAction === "retirar" &&
                        styles.actionToggleBtnActiveRetirar,
                    ]}
                    onPress={() => {
                      setAwardAction("retirar");
                      setSelectedUsers([]);
                    }}
                  >
                    <Text
                      style={[
                        styles.actionToggleText,
                        awardAction === "retirar" &&
                          styles.actionToggleTextActive,
                      ]}
                    >
                      Retirar Conquista
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* PASSO 3: Selecionar Usuários */}
            {selectedAchForAward && (
              <>
                <Text style={styles.label}>3. Selecione os Usuários</Text>
                {awardAction === "retirar" && (
                  <Text style={styles.infoText}>
                    Mostrando apenas usuários que já possuem esta conquista.
                  </Text>
                )}
                <View style={styles.searchContainer}>
                  <Search size={20} color="#64748b" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar por nome ou @nickname..."
                    value={userSearch}
                    onChangeText={setUserSearch}
                  />
                </View>

                {filteredUsers.length === 0 ? (
                  <Text
                    style={{
                      textAlign: "center",
                      color: "#64748b",
                      marginTop: 20,
                    }}
                  >
                    Nenhum usuário encontrado.
                  </Text>
                ) : (
                  filteredUsers.map((u: any) => (
                    <TouchableOpacity
                      key={u.id}
                      style={styles.userItem}
                      onPress={() => {
                        setSelectedUsers((prev) =>
                          prev.includes(u.id)
                            ? prev.filter((id) => id !== u.id)
                            : [...prev, u.id],
                        );
                      }}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          selectedUsers.includes(u.id) &&
                            (awardAction === "conceder"
                              ? styles.checkboxSelected
                              : styles.checkboxSelectedDanger),
                        ]}
                      >
                        {selectedUsers.includes(u.id) && (
                          <Check size={14} color="#fff" />
                        )}
                      </View>
                      <Image
                        source={{ uri: u.avatarUrl }}
                        style={styles.userThumb}
                      />
                      <View>
                        <Text style={styles.userName}>{u.name}</Text>
                        <Text style={styles.userNick}>@{u.nickname}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* BOTÃO FLUTUANTE DE AÇÃO FINAL */}
      {activeTab === "atribuir" &&
        selectedUsers.length > 0 &&
        selectedAchForAward && (
          <TouchableOpacity
            style={[
              styles.floatBtn,
              awardAction === "retirar" && { backgroundColor: "#ef4444" },
            ]}
            onPress={() => processAwardMutation.mutate()}
          >
            <Text style={styles.floatBtnText}>
              {awardAction === "conceder" ? "Atribuir a" : "Retirar de"}{" "}
              {selectedUsers.length} selecionados
            </Text>
          </TouchableOpacity>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tab: { flex: 1, padding: 15, alignItems: "center", gap: 5 },
  tabActive: { borderBottomWidth: 3, borderBottomColor: "#E11D48" },
  tabText: { fontSize: 12, fontWeight: "600", color: "#64748b" },
  tabTextActive: { color: "#E11D48" },
  section: { padding: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#1e293b",
  },
  subLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    color: "#1e293b",
  },
  colorPickerContainer: { height: 250, marginBottom: 20 },
  imagePicker: { alignSelf: "center", marginBottom: 20 },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "#E11D48",
  },
  placeholderImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#E11D48",
    padding: 5,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#fff",
  },
  rarityPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "transparent",
  },
  rarityPillSelected: { backgroundColor: "#1e293b", borderColor: "#1e293b" },
  rarityDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  rarityPillText: { fontSize: 12, fontWeight: "600", color: "#64748b" },
  conditionRow: { flexDirection: "row", gap: 10, marginBottom: 15 },
  pickerContainer: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 4,
  },
  miniTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  miniTabActive: { backgroundColor: "#fff", elevation: 1 },
  miniTabText: { fontSize: 12, color: "#64748b" },
  miniTabTextActive: { color: "#E11D48", fontWeight: "bold" },
  submitBtn: {
    backgroundColor: "#E11D48",
    padding: 15,
    marginTop: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  submitBtnText: { color: "#fff", fontWeight: "bold" },
  cancelBtn: { marginTop: 15, padding: 15, justifyContent: "center" },
  row: { flexDirection: "row", gap: 10 },
  item: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    elevation: 1,
  },
  circleImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: "hidden",
    marginRight: 12,
    backgroundColor: "#f1f5f9",
    borderWidth: 3,
  },
  circleImage: { width: "100%", height: "100%" },
  itemTitle: { fontSize: 15, fontWeight: "bold", color: "#1e293b" },
  itemSub: { fontSize: 12, color: "#64748b" },
  itemActions: { flexDirection: "row", alignItems: "center" },
  orderControls: { flexDirection: "row", alignItems: "center", gap: 10 },

  // Novos estilos de Atribuição
  achSelectorItem: {
    width: 90,
    height: 100,
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  achSelectorImg: { width: 40, height: 40, borderRadius: 20, marginBottom: 8 },
  achSelectorText: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    color: "#1e293b",
  },
  actionToggleRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  actionToggleBtn: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
  },
  actionToggleBtnActiveConceder: { backgroundColor: "#10b981" },
  actionToggleBtnActiveRetirar: { backgroundColor: "#ef4444" },
  actionToggleText: { fontWeight: "bold", color: "#64748b" },
  actionToggleTextActive: { color: "#fff" },
  infoText: {
    fontSize: 12,
    color: "#ef4444",
    marginBottom: 10,
    fontStyle: "italic",
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 15,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  searchInput: { flex: 1, padding: 12 },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 15,
    marginBottom: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: { backgroundColor: "#10b981", borderColor: "#10b981" },
  checkboxSelectedDanger: {
    backgroundColor: "#ef4444",
    borderColor: "#ef4444",
  },
  userThumb: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  userName: { fontSize: 14, fontWeight: "bold", color: "#1e293b" },
  userNick: { fontSize: 12, color: "#64748b" },
  floatBtn: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: "#10b981",
    padding: 18,
    borderRadius: 20,
    alignItems: "center",
    elevation: 5,
  },
  floatBtnText: { color: "#fff", fontWeight: "bold" },
});
