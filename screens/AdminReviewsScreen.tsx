import React, { useState } from "react";
import { RefreshControl, Share, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Download } from "lucide-react-native";
import { api } from "../services/api";
import {
  Avatar,
  Card,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  MipoText,
  Screen,
  ScreenHeader,
  SectionHeader,
  showAlert,
} from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";
import { monthLabel } from "./jogo/monthlyGameTypes";
import { displayName, PresentUser } from "./loja/storeTypes";
import { stars } from "./loja/reviewTypes";

interface ReviewStats {
  year: number;
  month: number;
  count: number;
  average: number | null;
  nps: number | null;
  distribution: { stars: number; count: number }[];
  recentComments: { rating: number; comment: string; createdAt: string; user: PresentUser }[];
  menuItems: { name: string; average: number | null; count: number }[];
}

function currentPeriod() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function shiftPeriod(period: { year: number; month: number }, delta: number) {
  const date = new Date(period.year, period.month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card style={{ flex: 1 }} contentStyle={{ alignItems: "center" }}>
      <MipoText variant="screenTitle" style={{ fontSize: 24 }}>
        {value}
      </MipoText>
      <MipoText variant="micro" style={{ textAlign: "center" }}>
        {label}
      </MipoText>
    </Card>
  );
}

function Distribution({ distribution, total }: { distribution: ReviewStats["distribution"]; total: number }) {
  const { colors } = useTheme();
  return (
    <Card contentStyle={{ gap: 8 }}>
      {[...distribution].reverse().map((row) => (
        <View
          key={row.stars}
          accessible
          accessibilityLabel={`${row.stars} estrelas: ${row.count} avaliações`}
          style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
        >
          <MipoText variant="caption" style={{ width: 70 }}>
            {stars(row.stars)}
          </MipoText>
          <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.surface, overflow: "hidden" }}>
            <View style={{ width: `${total ? (row.count / total) * 100 : 0}%`, height: "100%", backgroundColor: colors.yellow }} />
          </View>
          <MipoText variant="caption" style={{ width: 28, textAlign: "right" }}>
            {String(row.count)}
          </MipoText>
        </View>
      ))}
    </Card>
  );
}

export default function AdminReviewsScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { colors } = useTheme();
  const [period, setPeriod] = useState(currentPeriod);

  const statsQuery = useQuery<ReviewStats>({
    queryKey: ["reviews", "stats", period.year, period.month],
    queryFn: async () => (await api.get<ReviewStats>("/reviews/stats", { params: period })).data,
  });

  const exportMutation = useMutation({
    mutationFn: async () => (await api.get<{ csv: string }>("/reviews/stats/export", { params: period })).data.csv,
    onSuccess: (csv) => Share.share({ title: `Avaliações Mipo - ${monthLabel(period.year, period.month)}`, message: csv }),
    onError: () => showAlert("Erro", "Não foi possível exportar."),
  });

  const stats = statsQuery.data;

  return (
    <Screen
      scroll
      refreshControl={<RefreshControl refreshing={statsQuery.isRefetching} onRefresh={() => void statsQuery.refetch()} tintColor={colors.pink} />}
    >
      <ScreenHeader
        title="Avaliações"
        subtitle="Como foi a visita na Mipo"
        onBack={() => navigation.goBack()}
        right={<IconButton icon={Download} accessibilityLabel="Exportar CSV" onPress={() => exportMutation.mutate()} />}
      />

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <IconButton icon={ChevronLeft} accessibilityLabel="Mês anterior" onPress={() => setPeriod((p) => shiftPeriod(p, -1))} />
        <MipoText variant="section">{monthLabel(period.year, period.month)}</MipoText>
        <IconButton icon={ChevronRight} accessibilityLabel="Próximo mês" onPress={() => setPeriod((p) => shiftPeriod(p, 1))} />
      </View>

      {statsQuery.isLoading ? (
        <LoadingState skeletons={3} />
      ) : statsQuery.isError || !stats ? (
        <ErrorState onRetry={() => statsQuery.refetch()} />
      ) : stats.count === 0 ? (
        <EmptyState character="dado3" title="Sem avaliações neste mês" message="Elas chegam quando as comandas são fechadas." />
      ) : (
        <>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatTile label="avaliações" value={String(stats.count)} />
            <StatTile label="média" value={stats.average?.toFixed(1) ?? "—"} />
            <StatTile label="NPS" value={stats.nps === null ? "—" : String(stats.nps)} />
          </View>

          <SectionHeader title="Distribuição" />
          <Distribution distribution={stats.distribution} total={stats.count} />

          {stats.menuItems.length > 0 ? (
            <>
              <SectionHeader title="Notas do cardápio" />
              <Card contentStyle={{ gap: 8 }}>
                {stats.menuItems.map((item) => (
                  <View key={item.name} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <MipoText variant="bodyBold" numberOfLines={1} style={{ flex: 1 }}>
                      {item.name}
                    </MipoText>
                    <MipoText variant="caption">{`${item.average?.toFixed(1) ?? "—"} · ${item.count}`}</MipoText>
                  </View>
                ))}
              </Card>
            </>
          ) : null}

          <SectionHeader title="Comentários recentes" />
          {stats.recentComments.length === 0 ? (
            <MipoText variant="caption">Ninguém deixou comentário neste mês.</MipoText>
          ) : (
            <View style={{ gap: 10 }}>
              {stats.recentComments.map((review) => (
                <Card key={`${review.user.id}-${review.createdAt}`} contentStyle={{ gap: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Avatar name={review.user.name} id={review.user.id} uri={review.user.avatarUrl} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <MipoText variant="bodyBold" numberOfLines={1}>
                        {displayName(review.user)}
                      </MipoText>
                      <MipoText variant="caption">{stars(review.rating)}</MipoText>
                    </View>
                  </View>
                  <MipoText variant="body">{review.comment}</MipoText>
                </Card>
              ))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}
