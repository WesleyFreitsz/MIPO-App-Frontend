import React from "react";
import { ScrollView } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { api } from "../../services/api";
import { GameTile, SectionHeader } from "../../components/ui";
import { jogoTileTones } from "./jogoFormat";
import { Recommendation, RECOMMENDATIONS_PATH } from "./recommendationsApi";

export function RecommendedGamesRow() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { data: recommendations = [] } = useQuery<Recommendation[]>({
    queryKey: ["gamePlays", "recommendations"],
    queryFn: async () => (await api.get(RECOMMENDATIONS_PATH)).data,
  });

  if (recommendations.length === 0) return null;

  return (
    <>
      <SectionHeader title="Recomendados para você" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -14, flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 12, gap: 12 }}
      >
        {recommendations.map((item, index) => (
          <GameTile
            key={item.id}
            name={item.name}
            meta={item.reason}
            imageUrl={item.imageUrl}
            tone={jogoTileTones[index % jogoTileTones.length]}
            tilt={index % 2 === 0 ? -1.2 : 1.2}
            width={150}
            height={120}
            onPress={() => navigation.navigate("GameDetail", { gameId: item.id })}
          />
        ))}
      </ScrollView>
    </>
  );
}
