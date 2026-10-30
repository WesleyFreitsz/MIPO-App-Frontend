import React, { useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { History, Send } from "lucide-react-native";
import { api } from "../services/api";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  MipoText,
  Screen,
  ScreenHeader,
  SectionHeader,
  SegmentedControl,
  useBottomReserve,
} from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";
import { MonthlyPodium } from "./jogo/MonthlyPodium";
import { SubmitScoreSheet } from "./jogo/SubmitScoreSheet";
import { MonthlyPeriod, Page, RankingEntry, displayName, monthLabel } from "./jogo/monthlyGameTypes";

const RANKING_PAGE_SIZE = 20;

function RankingRow({ entry, highlighted }: { entry: RankingEntry; highlighted?: boolean }) {
  return (
    <Card tone={highlighted ? "lime" : "neutral"} flat contentStyle={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 }}>
      <MipoText variant="cardTitle" style={{ width: 34 }}>{`${entry.position}º`}</MipoText>
      <Avatar name={entry.user.name} id={entry.user.id} uri={entry.user.avatarUrl} size="sm" />
      <MipoText variant="bodyBold" numberOfLines={1} style={{ flex: 1 }}>
        {displayName(entry.user)}
      </MipoText>
      <MipoText variant="cardTitle">{`${entry.score} pts`}</MipoText>
    </Card>
  );
}

export default function MonthlyGamesScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { colors } = useTheme();
  const bottomReserve = useBottomReserve(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitVisible, setSubmitVisible] = useState(false);

  const periodQuery = useQuery<MonthlyPeriod>({
    queryKey: ["monthlyGames", "current"],
    queryFn: async () => (await api.get("/monthly-games")).data,
  });

  const games = periodQuery.data?.games ?? [];
  const selected = games.find((game) => game.id === selectedId) ?? games[0];

  const rankingQuery = useInfiniteQuery({
    queryKey: ["monthlyGames", "ranking", selected?.id],
    enabled: !!selected,
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<Page<RankingEntry>> =>
      (await api.get(`/monthly-games/${selected!.id}/ranking`, { params: { skip: pageParam, take: RANKING_PAGE_SIZE } })).data,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.skip + lastPage.take : undefined),
  });

  const restOfRanking = (rankingQuery.data?.pages.flatMap((page) => page.data) ?? []).filter((entry) => entry.position > 3);

  const refresh = () => {
    periodQuery.refetch();
    rankingQuery.refetch();
  };

  const header = (
    <ScreenHeader
      title="Jogos do mês"
      subtitle={periodQuery.data ? monthLabel(periodQuery.data.year, periodQuery.data.month) : undefined}
      onBack={() => navigation.goBack()}
      right={<IconButton icon={History} accessibilityLabel="Minhas partidas e meses anteriores" onPress={() => navigation.navigate("MonthlyGamesHistory")} />}
    />
  );

  if (periodQuery.isLoading) {
    return (
      <Screen>
        {header}
        <LoadingState skeletons={2} />
      </Screen>
    );
  }

  if (periodQuery.isError) {
    return (
      <Screen>
        {header}
        <ErrorState onRetry={refresh} />
      </Screen>
    );
  }

  if (!selected) {
    return (
      <Screen>
        {header}
        <EmptyState character="trofeu2" title="Nenhum jogo do mês ainda" message="Os admins ainda não escolheram os jogos deste mês." />
      </Screen>
    );
  }

  return (
    <Screen>
      {header}
      <FlatList
        data={restOfRanking}
        keyExtractor={(entry) => entry.user.id}
        style={{ marginHorizontal: -14 }}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: bottomReserve, gap: 8 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={periodQuery.isRefetching} onRefresh={refresh} tintColor={colors.pink} />}
        onEndReached={() => {
          if (rankingQuery.hasNextPage && !rankingQuery.isFetchingNextPage) rankingQuery.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            {games.length > 1 ? (
              <SegmentedControl
                options={games.map((game) => ({ value: game.id, label: game.game.name }))}
                value={selected.id}
                onChange={setSelectedId}
              />
            ) : null}

            <Card tone="yellow">
              <MipoText variant="section" numberOfLines={2}>
                {selected.game.name}
              </MipoText>
              <MipoText variant="caption" style={{ marginBottom: 14 }}>
                {selected.totalPlayers === 1 ? "1 jogador no ranking" : `${selected.totalPlayers} jogadores no ranking`}
              </MipoText>
              <MonthlyPodium monthlyGame={selected} podium={selected.podium} />
            </Card>

            {selected.myEntry ? (
              <>
                <SectionHeader title="Minha posição" />
                <RankingRow entry={selected.myEntry} highlighted />
              </>
            ) : null}

            <Button label="Enviar partida" icon={Send} variant="lime" block onPress={() => setSubmitVisible(true)} />

            {selected.rules ? (
              <>
                <SectionHeader title="Regras" />
                <MipoText variant="body" color="muted">
                  {selected.rules}
                </MipoText>
              </>
            ) : null}

            {restOfRanking.length > 0 ? <SectionHeader title="Ranking" /> : null}
          </View>
        }
        renderItem={({ item }) => <RankingRow entry={item} />}
        ListEmptyComponent={
          selected.totalPlayers === 0 ? (
            <EmptyState character="dado2" title="Ninguém pontuou ainda" message="Manda a primeira partida e garante o topo!" />
          ) : undefined
        }
        ListFooterComponent={rankingQuery.isFetchingNextPage ? <LoadingState skeletons={1} /> : undefined}
      />

      <SubmitScoreSheet
        visible={submitVisible}
        onClose={() => setSubmitVisible(false)}
        monthlyGames={periodQuery.data?.isCurrent ? games : []}
        initialMonthlyGameId={selected.id}
      />
    </Screen>
  );
}
