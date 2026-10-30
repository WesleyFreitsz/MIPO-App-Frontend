import React, { useState } from "react";
import { RefreshControl, Share, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { useMutation, useQuery } from "@tanstack/react-query";
import Svg, { Rect } from "react-native-svg";
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
import { VisitStats, displayName } from "./loja/storeTypes";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function currentPeriod() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function shiftPeriod(period: { year: number; month: number }, delta: number) {
  const date = new Date(period.year, period.month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

function formatMinutes(minutes: number | null) {
  if (minutes === null) return "—";
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h${String(minutes % 60).padStart(2, "0")}` : `${minutes} min`;
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

function WeekdayChart({ byWeekday }: { byWeekday: number[] }) {
  const { colors } = useTheme();
  const max = Math.max(1, ...byWeekday);
  const barWidth = 30;
  const height = 100;
  const summary = byWeekday.map((count, index) => `${WEEKDAY_LABELS[index]}: ${count}`).join(", ");

  return (
    <Card>
      <View accessible accessibilityLabel={`Visitas por dia da semana. ${summary}`}>
        <Svg width="100%" height={110} viewBox={`0 0 ${byWeekday.length * barWidth} ${height}`} preserveAspectRatio="none">
          {byWeekday.map((count, index) => {
            const barHeight = (count / max) * height;
            return <Rect key={index} x={index * barWidth + 6} y={height - barHeight} width={18} height={barHeight} fill={colors.teal} rx={2} />;
          })}
        </Svg>
        <View style={{ flexDirection: "row", marginTop: 6 }}>
          {WEEKDAY_LABELS.map((label) => (
            <MipoText key={label} variant="micro" style={{ flex: 1, textAlign: "center" }}>
              {label}
            </MipoText>
          ))}
        </View>
      </View>
    </Card>
  );
}

export default function AdminVisitsStatsScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { colors } = useTheme();
  const [period, setPeriod] = useState(currentPeriod);

  const statsQuery = useQuery<VisitStats>({
    queryKey: ["store", "stats", period.year, period.month],
    queryFn: async () => (await api.get<VisitStats>("/store/stats", { params: period })).data,
  });

  const exportMutation = useMutation({
    mutationFn: async () => (await api.get<{ csv: string }>("/store/stats/export", { params: period })).data.csv,
    onSuccess: (csv) => Share.share({ title: `Frequência Mipo - ${monthLabel(period.year, period.month)}`, message: csv }),
    onError: () => showAlert("Erro", "Não foi possível exportar."),
  });

  const stats = statsQuery.data;

  return (
    <Screen
      scroll
      refreshControl={<RefreshControl refreshing={statsQuery.isRefetching} onRefresh={() => {
        statsQuery.refetch();
      }} tintColor={colors.pink} />}
    >
      <ScreenHeader
        title="Frequência"
        subtitle="Quem mais veio na Mipo"
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
      ) : stats.totalVisits === 0 ? (
        <EmptyState character="dado3" title="Sem visitas neste mês" message="Os check-ins aparecem aqui assim que a galera chegar." />
      ) : (
        <>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatTile label="visitas" value={String(stats.totalVisits)} />
            <StatTile label="jogadores" value={String(stats.uniqueVisitors)} />
            <StatTile label="tempo médio" value={formatMinutes(stats.avgMinutes)} />
          </View>

          <SectionHeader title="Dias mais movimentados" />
          <WeekdayChart byWeekday={stats.byWeekday} />

          <SectionHeader title="Quem mais veio" />
          <View style={{ gap: 10 }}>
            {stats.ranking.map((row, index) => (
              <Card
                key={row.user.id}
                tone={index === 0 ? "yellow" : "neutral"}
                onPress={() => navigation.navigate("PlayerProfile", { userId: row.user.id })}
                accessibilityLabel={`${index + 1}º ${displayName(row.user)}, ${row.distinctDays} dias`}
                contentStyle={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <MipoText variant="cardTitle" style={{ width: 28 }}>
                  {`${index + 1}º`}
                </MipoText>
                <Avatar name={row.user.name} id={row.user.id} uri={row.user.avatarUrl} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <MipoText variant="bodyBold" numberOfLines={1}>
                    {displayName(row.user)}
                  </MipoText>
                  <MipoText variant="caption" numberOfLines={1}>
                    {`${row.visits} visitas · média ${formatMinutes(row.avgMinutes)}`}
                  </MipoText>
                </View>
                <MipoText variant="cardTitle">{`${row.distinctDays}d`}</MipoText>
              </Card>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}
