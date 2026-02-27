import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
  Animated,
  Alert,
  useColorScheme,
} from "react-native";
import { X, Trophy, Star } from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";

// --- EFEITO DE BRILHO (SHINE) ---
const ShineEffect = () => {
  const moveAnim = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(moveAnim, {
        toValue: 150,
        duration: 2500,
        useNativeDriver: true,
      }),
    ).start();
  }, [moveAnim]);

  return (
    <Animated.View
      style={[
        styles.shine,
        { transform: [{ translateX: moveAnim }, { skewX: "-20deg" }] },
      ]}
    />
  );
};

interface Props {
  userId: string;
  isOwnProfile?: boolean;
  triggerOpenAll?: number; // <--- ADICIONE ISTO
}

export default function AchievementsHighlights({
  userId,
  isOwnProfile = false,
  triggerOpenAll,
}: Props) {
  const queryClient = useQueryClient();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const theme = {
    bg: isDark ? "#000000" : "#faf6f1",
    surface: isDark ? "#121212" : "#ffffff",
    text: isDark ? "#ffffff" : "#1c1917",
    textMuted: isDark ? "#a1a1aa" : "#78716c",
    border: isDark ? "#27272a" : "#e7e5e4",
    primary: "#c73636",
  };

  const [showAllModal, setShowAllModal] = useState(false);
  const [selectedAch, setSelectedAch] = useState<any>(null);

  useEffect(() => {
    if (triggerOpenAll) {
      setShowAllModal(true);
    }
  }, [triggerOpenAll]);

  const { data: achievements = [], isLoading } = useQuery({
    queryKey: ["achievements", userId],
    queryFn: async () => (await api.get(`/achievements?userId=${userId}`)).data,
  });

  const setHighlightsMutation = useMutation({
    mutationFn: (achievementIds: string[]) =>
      api.post("/achievements/highlights", { achievementIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achievements", userId] });
      setSelectedAch(null);
    },
    onError: () =>
      Alert.alert("Erro", "Você só pode destacar até 3 conquistas."),
  });

  const obtainedAch = achievements.filter((a: any) => a.isObtained);
  const highlightedAch = obtainedAch.filter((a: any) => a.isHighlighted);

  const displayHighlights =
    highlightedAch.length > 0 ? highlightedAch : obtainedAch.slice(0, 3);

  const groupedAchievements = achievements.reduce((acc: any, ach: any) => {
    const rarityName = ach.rarity?.name || "Padrão";
    if (!acc[rarityName]) {
      acc[rarityName] = { color: ach.rarity?.color || "#cbd5e1", items: [] };
    }
    acc[rarityName].items.push(ach);
    return acc;
  }, {});

  const handleToggleHighlight = (achId: string) => {
    const currentHighlights = highlightedAch.map((a: any) => a.id);
    let newHighlights;

    if (currentHighlights.includes(achId)) {
      newHighlights = currentHighlights.filter((id: string) => id !== achId);
    } else {
      if (currentHighlights.length >= 3) {
        Alert.alert("Limite atingido", "Você só pode destacar 3 conquistas.");
        return;
      }
      newHighlights = [...currentHighlights, achId];
    }
    setHighlightsMutation.mutate(newHighlights);
  };

  if (isLoading) return <View style={{ height: 80 }} />;

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        🏆 Destaques
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {displayHighlights.map((ach: any) => {
          const rarityColor = ach.rarity?.color || "#cbd5e1";
          return (
            <TouchableOpacity
              key={ach.id}
              style={styles.highlightItem}
              onPress={() => setSelectedAch(ach)}
            >
              <View
                style={[styles.highlightCircle, { borderColor: rarityColor }]}
              >
                <Image
                  source={{ uri: ach.icon }}
                  style={styles.highlightImage}
                />
                {ach.isObtained && <ShineEffect />}
              </View>
              <Text
                style={[styles.highlightText, { color: theme.text }]}
                numberOfLines={1}
              >
                {ach.title}
              </Text>
            </TouchableOpacity>
          );
        })}

        {achievements.length > 0 && (
          <TouchableOpacity
            style={styles.highlightItem}
            onPress={() => setShowAllModal(true)}
          >
            <View
              style={[
                styles.seeAllCircle,
                { borderColor: theme.border, backgroundColor: theme.surface },
              ]}
            >
              <Text style={[styles.seeAllText, { color: theme.text }]}>
                {obtainedAch.length > 99 ? "99+" : obtainedAch.length}
              </Text>
              <Text style={{ fontSize: 10, color: theme.textMuted }}>
                Conquistas
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* MODAL DETALHES DA CONQUISTA */}
      <Modal visible={!!selectedAch} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.detailCard, { backgroundColor: theme.surface }]}>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setSelectedAch(null)}
            >
              <X color={theme.textMuted} size={24} />
            </TouchableOpacity>

            <View
              style={[
                styles.detailImageContainer,
                { borderColor: selectedAch?.rarity?.color || "#cbd5e1" },
              ]}
            >
              <Image
                source={{ uri: selectedAch?.icon }}
                style={[
                  styles.detailImage,
                  !selectedAch?.isObtained && { opacity: 0.4 },
                ]}
                blurRadius={selectedAch?.isObtained ? 0 : 5}
              />
            </View>

            <Text style={[styles.detailTitle, { color: theme.text }]}>
              {selectedAch?.title}
            </Text>

            {selectedAch?.rarity && (
              <View
                style={[
                  styles.rarityBadge,
                  { backgroundColor: selectedAch.rarity.color + "20" },
                ]}
              >
                <Text
                  style={{
                    color: selectedAch.rarity.color,
                    fontWeight: "bold",
                    fontSize: 12,
                  }}
                >
                  {selectedAch.rarity.name}
                </Text>
              </View>
            )}

            <Text style={[styles.detailDesc, { color: theme.textMuted }]}>
              {selectedAch?.description ||
                (selectedAch?.condition
                  ? `Condição: ${selectedAch.condition}`
                  : "Sem descrição")}
            </Text>

            <View style={styles.percentageBox}>
              <Text style={{ fontSize: 13, color: theme.textMuted }}>
                <Text style={{ fontWeight: "bold", color: theme.text }}>
                  {Number(selectedAch?.obtainedPercentage || 0).toFixed(1)}%
                </Text>{" "}
                dos usuários têm essa conquista
              </Text>
            </View>

            {isOwnProfile && selectedAch?.isObtained && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme.primary }]}
                onPress={() => handleToggleHighlight(selectedAch.id)}
              >
                <Star size={16} color="#fff" style={{ marginRight: 8 }} />
                <Text style={{ color: "#fff", fontWeight: "bold" }}>
                  {highlightedAch.find((a: any) => a.id === selectedAch.id)
                    ? "Remover dos Destaques"
                    : "Destacar no Perfil"}
                </Text>
              </TouchableOpacity>
            )}

            {!selectedAch?.isObtained && (
              <View style={styles.lockedBox}>
                <Text style={{ color: "#fff", fontWeight: "bold" }}>
                  🔒 Conquista Bloqueada
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL VER TODAS */}
      <Modal visible={showAllModal} animationType="slide">
        <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: 50 }}>
          <View
            style={[
              styles.fullModalHeader,
              { borderBottomColor: theme.border },
            ]}
          >
            <TouchableOpacity onPress={() => setShowAllModal(false)}>
              <X color={theme.text} size={28} />
            </TouchableOpacity>
            <Text
              style={{ fontSize: 18, fontWeight: "bold", color: theme.text }}
            >
              Todas as Conquistas
            </Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={{ padding: 16 }}>
            {Object.keys(groupedAchievements).map((rarityName) => {
              const group = groupedAchievements[rarityName];
              return (
                <View key={rarityName} style={{ marginBottom: 25 }}>
                  <View style={styles.rarityHeader}>
                    <View
                      style={[
                        styles.rarityDot,
                        { backgroundColor: group.color },
                      ]}
                    />
                    <Text style={[styles.rarityTitle, { color: theme.text }]}>
                      {rarityName}
                    </Text>
                  </View>

                  <View style={styles.grid}>
                    {group.items.map((ach: any) => (
                      <TouchableOpacity
                        key={ach.id}
                        style={styles.gridItem}
                        onPress={() => {
                          // AQUI ESTÁ A MUDANÇA: Fecha o modal "Ver Todas" e abre o Detalhe
                          setShowAllModal(false);
                          setSelectedAch(ach);
                        }}
                      >
                        <View
                          style={[
                            styles.gridCircle,
                            {
                              borderColor: ach.isObtained
                                ? group.color
                                : theme.border,
                            },
                          ]}
                        >
                          <Image
                            source={{ uri: ach.icon }}
                            style={[
                              styles.gridImage,
                              !ach.isObtained && { opacity: 0.3 },
                            ]}
                            blurRadius={ach.isObtained ? 0 : 5}
                          />
                          {ach.isObtained && <ShineEffect />}
                        </View>
                        <Text
                          style={[styles.gridText, { color: theme.text }]}
                          numberOfLines={2}
                        >
                          {ach.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 10 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  scrollContent: { paddingHorizontal: 16, gap: 15 },
  highlightItem: { alignItems: "center", width: 70 },
  highlightCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 6,
    padding: 2,
  },
  highlightImage: { width: "100%", height: "100%", borderRadius: 30 },
  shine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: "50%",
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  highlightText: { fontSize: 11, textAlign: "center" },
  seeAllCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  seeAllText: { fontSize: 16, fontWeight: "bold" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  detailCard: {
    width: "100%",
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
  },
  closeBtn: { position: "absolute", top: 15, right: 15, zIndex: 10 },
  detailImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    overflow: "hidden",
    marginBottom: 15,
  },
  detailImage: { width: "100%", height: "100%" },
  detailTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
  },
  rarityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 15,
  },
  detailDesc: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  percentageBox: {
    backgroundColor: "rgba(120,113,108,0.1)",
    padding: 10,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },
  actionBtn: {
    flexDirection: "row",
    width: "100%",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  lockedBox: {
    width: "100%",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3f3f46",
  },
  fullModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  rarityHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  rarityDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  rarityTitle: { fontSize: 18, fontWeight: "bold" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 15 },
  gridItem: { width: "22%", alignItems: "center", marginBottom: 10 },
  gridCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    overflow: "hidden",
    padding: 2,
    marginBottom: 5,
  },
  gridImage: { width: "100%", height: "100%", borderRadius: 28 },
  gridText: { fontSize: 10, textAlign: "center" },
});
