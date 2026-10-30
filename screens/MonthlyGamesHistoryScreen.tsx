import React, { useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { api } from "../services/api";
import {
  Card,
  Chip,
  ChipTone,
  EmptyState,
  ErrorState,
  LoadingState,
  MipoText,
  Screen,
  ScreenHeader,
  SegmentedControl,
  useBottomReserve,
} from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";
import { MonthlyPodium } from "./jogo/MonthlyPodium";
import {
  MonthlyGameScore,
  MonthlyGameScoreStatus,
  MonthlyGameStanding,
  Page,
  monthLabel,
  scoreStatusLabel,
} from "./jogo/monthlyGameTypes";

type HistoryTab = "mine" | "past";

const PAGE_SIZE = 20;

const statusTone: Record<MonthlyGameScoreStatus, ChipTone> = {
  PENDING: "yellow",
  APPROVED: "lime",
  REJECTED: "red",
};

function usePagedQuery<T>(key: string, url: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ["monthlyGames", key],
    enabled,
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<Page<T>> => (await api.get(url, { params: { skip: pageParam, take: PAGE_SIZE } })).data,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.skip + lastPage.take : undefined),
  });
}

export default function MonthlyGamesHistoryScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const bottomReserve = useBottomReserve(false);
  const [tab, setTab] = useState<HistoryTab>("mine");

  const myScores = usePagedQuery<MonthlyGameScore>("myScores", "/monthly-games/scores/mine", tab === "mine");
  const past = usePagedQuery<MonthlyGameStanding>("history", "/monthly-games/history", tab === "past");
  const active = tab === "mine" ? myScores : past;

  const listProps = {
    style: { marginHorizontal: -14 },
    contentContainerStyle: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: bottomReserve, gap: 12 },
    showsVerticalScrollIndicator: false,
    refreshControl: <RefreshControl refreshing={active.isRefetching} onRefresh={() => {
          active.refetch();
        }} tintColor={colors.pink} />,
    onEndReached: () => {
      if (active.hasNextPage && !active.isFetchingNextPage) active.fetchNextPage();
    },
    onEndReachedThreshold: 0.4,
  };

  return (
    <Screen>
      <ScreenHeader title="Histórico" subtitle="Jogos do mês" onBack={() => navigation.goBack()} />
      <SegmentedControl<HistoryTab>
        options={[
          { value: "mine", label: "Minhas partidas" },
          { value: "past", label: "Meses anteriores" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {active.isLoading ? (
        <LoadingState />
      ) : active.isError ? (
        <ErrorState onRetry={() => active.refetch()} />
      ) : tab === "mine" ? (
        <FlatList
          {...listProps}
          data={myScores.data?.pages.flatMap((page) => page.data) ?? []}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<EmptyState character="dado1" title="Nenhuma partida enviada" message="Envie uma partida na tela de Jogos do mês." />}
          renderItem={({ item }) => (
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <MipoText variant="cardTitle" numberOfLines={1}>
                    {item.monthlyGame.game.name}
                  </MipoText>
                  <MipoText variant="caption">{`${monthLabel(item.monthlyGame.year, item.monthlyGame.month)} · ${new Date(item.createdAt).toLocaleDateString("pt-BR")}`}</MipoText>
                </View>
                <MipoText variant="section">{`${item.score} pts`}</MipoText>
              </View>
              <View style={{ flexDirection: "row", marginTop: 10 }}>
                <Chip label={scoreStatusLabel[item.status]} tone={statusTone[item.status]} />
              </View>
              {item.status === "REJECTED" && item.rejectionReason ? (
                <MipoText variant="caption" style={{ marginTop: 6 }}>
                  {`Motivo: ${item.rejectionReason}`}
                </MipoText>
              ) : null}
            </Card>
          )}
        />
      ) : (
        <FlatList
          {...listProps}
          data={past.data?.pages.flatMap((page) => page.data) ?? []}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<EmptyState character="trofeu3" title="Ainda sem meses anteriores" message="Os vencedores aparecem aqui quando o mês fechar." />}
          renderItem={({ item }) => (
            <Card>
              <MipoText variant="micro">{monthLabel(item.year, item.month).toUpperCase()}</MipoText>
              <MipoText variant="cardTitle" numberOfLines={1} style={{ marginBottom: 12 }}>
                {item.game.name}
              </MipoText>
              <MonthlyPodium monthlyGame={item} podium={item.podium} compact />
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
