import React, { useMemo, useState } from "react";
import { FlatList, ScrollView, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { Search, Users } from "lucide-react-native";
import { api } from "../services/api";
import { Chip, EmptyState, ErrorState, GameTile, Input, LoadingState, Screen, ScreenHeader, useBottomReserve } from "../components/ui";
import { StaggerIn } from "../motion/StaggerIn";
import { Jogo } from "../types";
import { categoriesOf, jogoTileTones, playersText } from "./jogo/jogoFormat";

const ALL = "Todos";

export default function GamesListScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const bottomReserve = useBottomReserve(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL);
  const [playersFilter, setPlayersFilter] = useState("");

  const { data: games = [], isLoading, isError, refetch } = useQuery<Jogo[]>({
    queryKey: ["games", search, selectedCategory, playersFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (selectedCategory !== ALL) params.category = selectedCategory;
      if (playersFilter) params.players = playersFilter;
      const res = await api.get("/games", { params });
      return res.data;
    },
  });

  const { data: allGamesForCategories = [] } = useQuery<Jogo[]>({
    queryKey: ["allGamesCategories"],
    queryFn: async () => (await api.get("/games")).data,
  });

  const dynamicCategories = useMemo(
    () => [ALL, ...Array.from(new Set(allGamesForCategories.flatMap((game) => categoriesOf(game.category))))],
    [allGamesForCategories],
  );

  return (
    <Screen>
      <ScreenHeader title="Jogos" subtitle="Descubra o que tem no acervo" onBack={() => navigation.goBack()} />

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Input icon={Search} placeholder="Buscar no acervo" value={search} onChangeText={setSearch} containerStyle={{ flex: 1 }} />
        <Input
          icon={Users}
          placeholder="Jogadores"
          keyboardType="numeric"
          value={playersFilter}
          onChangeText={setPlayersFilter}
          containerStyle={{ width: 124 }}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -14, flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 12, gap: 6 }}
      >
        {dynamicCategories.map((category) => (
          <Chip
            key={category}
            label={category}
            tone={selectedCategory === category ? "active" : "neutral"}
            selected={selectedCategory === category}
            onPress={() => setSelectedCategory(category)}
          />
        ))}
      </ScrollView>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={games}
          keyExtractor={(item) => item.id}
          numColumns={2}
          style={{ marginHorizontal: -14 }}
          columnWrapperStyle={{ gap: 14 }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 4, paddingBottom: bottomReserve, gap: 16 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<EmptyState character="peao5" title="Nenhum jogo encontrado" message="Tenta outra busca ou outra categoria." />}
          renderItem={({ item, index }) => (
            <StaggerIn index={index} style={{ flex: 1 }}>
              <GameTile
                name={item.name}
                meta={playersText(item.minPlayers, item.maxPlayers)}
                imageUrl={item.imageUrl}
                tone={jogoTileTones[index % jogoTileTones.length]}
                tilt={index % 2 === 0 ? -1.2 : 1.2}
                height={128}
                onPress={() => navigation.navigate("GameDetail", { gameId: item.id })}
              />
            </StaggerIn>
          )}
        />
      )}
    </Screen>
  );
}
