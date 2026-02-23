import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Search, Gamepad2, Users, ChevronLeft } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function GamesListScreen() {
  const navigation = useNavigation<any>();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [playersFilter, setPlayersFilter] = useState("");

  const { data: games = [], isLoading } = useQuery({
    queryKey: ["games", search, selectedCategory, playersFilter],
    queryFn: async () => {
      const params: any = {};
      if (search) params.search = search;
      if (selectedCategory !== "Todos") params.category = selectedCategory;
      if (playersFilter) params.players = playersFilter;
      const res = await api.get("/games", { params });
      return res.data;
    },
  });

  // Pega todas as categorias dinamicamente
  const { data: allGamesForCategories = [] } = useQuery({
    queryKey: ["allGamesCategories"],
    queryFn: async () => (await api.get("/games")).data,
  });

  const dynamicCategories = useMemo(() => {
    const categories = allGamesForCategories
      .flatMap((g: any) =>
        Array.isArray(g.category) ? g.category : [g.category],
      )
      .filter(Boolean);
    return ["Todos", ...Array.from(new Set(categories))] as string[];
  }, [allGamesForCategories]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft color="#1e293b" size={28} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Catálogo de Jogos</Text>
          <Text style={styles.headerSubtitle}>
            Descubra o que temos disponível
          </Text>
        </View>
      </View>

      <View style={styles.filtersRow}>
        <View style={styles.searchContainer}>
          <Search color="#94a3b8" size={20} style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Buscar jogo..."
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View style={styles.playersContainer}>
          <Users color="#94a3b8" size={18} style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Qtd. Jogadores"
            keyboardType="numeric"
            value={playersFilter}
            onChangeText={setPlayersFilter}
          />
        </View>
      </View>

      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={dynamicCategories}
          keyExtractor={(item: string) => item}
          // CORREÇÃO: Avisando que o item é uma string
          renderItem={({ item }: { item: string }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === item && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(item)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === item && styles.categoryTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator
          size="large"
          color="#c73636"
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={games}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={{ justifyContent: "space-between" }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.gameCard}
              onPress={() =>
                navigation.navigate("GameDetail", { gameId: item.id })
              }
            >
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.gameImage}
                />
              ) : (
                <View
                  style={[
                    styles.gameImage,
                    {
                      backgroundColor: "#e2e8f0",
                      justifyContent: "center",
                      alignItems: "center",
                    },
                  ]}
                >
                  <Gamepad2 color="#94a3b8" size={32} />
                </View>
              )}
              <View style={styles.gameContent}>
                <Text style={styles.gameTitle} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.gameCategory} numberOfLines={1}>
                  {Array.isArray(item.category)
                    ? item.category.join(", ")
                    : item.category}
                </Text>
                <View style={styles.playersBadge}>
                  <Users size={12} color="#64748b" />
                  <Text style={styles.playersText}>
                    {item.minPlayers}-{item.maxPlayers}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Nenhum jogo encontrado com esses filtros.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#faf6f1" },
  header: {
    padding: 20,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 15,
    padding: 5,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#1e293b" },
  headerSubtitle: { fontSize: 14, color: "#64748b", marginTop: 2 },
  filtersRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 15,
    gap: 10,
  },
  searchContainer: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  playersContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  icon: { marginRight: 8 },
  input: { flex: 1, height: 45, fontSize: 14 },
  categoriesContainer: { height: 50, marginBottom: 10 },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginRight: 10,
    alignSelf: "center",
  },
  categoryChipActive: { backgroundColor: "#c73636", borderColor: "#c73636" },
  categoryText: { color: "#64748b", fontWeight: "600", fontSize: 14 },
  categoryTextActive: { color: "#fff" },
  listContainer: { padding: 20, paddingBottom: 40 },
  gameCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 15,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  gameImage: { width: "100%", height: 160 },
  gameContent: { padding: 12 },
  gameTitle: { fontSize: 15, fontWeight: "bold", color: "#1e293b" },
  gameCategory: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
    marginBottom: 8,
  },
  playersBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  playersText: { fontSize: 11, fontWeight: "bold", color: "#64748b" },
  emptyText: {
    textAlign: "center",
    color: "#94a3b8",
    marginTop: 40,
    fontStyle: "italic",
    width: "100%",
  },
});
