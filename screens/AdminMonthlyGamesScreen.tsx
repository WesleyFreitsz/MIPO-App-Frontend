import React, { useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { isAxiosError } from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2, Trophy } from "lucide-react-native";
import { api } from "../services/api";
import {
  Avatar,
  BottomSheet,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  FieldLabel,
  IconButton,
  Input,
  LoadingState,
  MipoText,
  Screen,
  ScreenHeader,
  showAlert,
} from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";
import { Jogo } from "../types";
import { MonthlyGameStanding, MonthlyPeriod, RankingUser, monthLabel } from "./jogo/monthlyGameTypes";

const MAX_GAMES_PER_MONTH = 3;

type FormState = { mode: "create" } | { mode: "edit"; monthlyGame: MonthlyGameStanding };

function serverMessage(error: unknown, fallback: string): string {
  const message = isAxiosError(error) ? (error.response?.data as { message?: string | string[] } | undefined)?.message : undefined;
  return Array.isArray(message) ? message.join("\n") : message || fallback;
}

function currentPeriod() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function shiftPeriod(period: { year: number; month: number }, delta: number) {
  const date = new Date(period.year, period.month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export default function AdminMonthlyGamesScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState(currentPeriod);
  const [form, setForm] = useState<FormState | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [prizes, setPrizes] = useState(["", "", ""]);
  const [rules, setRules] = useState("");
  const [manualFor, setManualFor] = useState<MonthlyGameStanding | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [manualUser, setManualUser] = useState<RankingUser | null>(null);
  const [manualScore, setManualScore] = useState("");

  const periodQuery = useQuery<MonthlyPeriod>({
    queryKey: ["monthlyGames", "period", period.year, period.month],
    queryFn: async () => (await api.get("/monthly-games", { params: period })).data,
  });

  const catalogQuery = useQuery<Jogo[]>({
    queryKey: ["games", "catalog"],
    queryFn: async () => (await api.get("/games")).data,
    enabled: form?.mode === "create",
  });

  const usersQuery = useQuery<{ data: RankingUser[] }>({
    queryKey: ["users", "admin", "search", userSearch],
    queryFn: async () => (await api.get("/users/admin/list", { params: { skip: 0, take: 10, search: userSearch || undefined } })).data,
    enabled: manualFor !== null,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["monthlyGames"] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const [prizeFirst, prizeSecond, prizeThird] = prizes.map((prize) => prize.trim());
      const payload = { prizeFirst, prizeSecond, prizeThird, rules: rules.trim() };
      if (form?.mode === "edit") return api.patch(`/monthly-games/${form.monthlyGame.id}`, payload);
      return api.post("/monthly-games", { ...payload, ...period, gameId });
    },
    onSuccess: () => {
      invalidate();
      setForm(null);
    },
    onError: (error) => showAlert("Erro", serverMessage(error, "Não foi possível salvar.")),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/monthly-games/${id}`),
    onSuccess: invalidate,
    onError: (error) => showAlert("Erro", serverMessage(error, "Não foi possível remover.")),
  });

  const manualMutation = useMutation({
    mutationFn: () =>
      api.post(`/monthly-games/${manualFor!.id}/scores/manual`, { userId: manualUser!.id, score: Number(manualScore) }),
    onSuccess: () => {
      invalidate();
      setManualFor(null);
      showAlert("Pontuação registrada", "Já está valendo no ranking.");
    },
    onError: (error) => showAlert("Erro", serverMessage(error, "Não foi possível registrar.")),
  });

  const openForm = (next: FormState) => {
    const monthlyGame = next.mode === "edit" ? next.monthlyGame : null;
    setGameId(monthlyGame?.gameId ?? null);
    setPrizes([monthlyGame?.prizeFirst ?? "", monthlyGame?.prizeSecond ?? "", monthlyGame?.prizeThird ?? ""]);
    setRules(monthlyGame?.rules ?? "");
    setForm(next);
  };

  const openManual = (monthlyGame: MonthlyGameStanding) => {
    setUserSearch("");
    setManualUser(null);
    setManualScore("");
    setManualFor(monthlyGame);
  };

  const confirmRemove = (monthlyGame: MonthlyGameStanding) =>
    showAlert("Remover jogo do mês?", `${monthlyGame.game.name} e todas as partidas dele neste mês serão apagados.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: () => removeMutation.mutate(monthlyGame.id) },
    ]);

  const games = periodQuery.data?.games ?? [];
  const usedGameIds = new Set(games.map((game) => game.gameId));

  return (
    <Screen
      scroll
      refreshControl={<RefreshControl refreshing={periodQuery.isRefetching} onRefresh={() => {
            periodQuery.refetch();
          }} tintColor={colors.pink} />}
    >
      <ScreenHeader title="Jogos do mês" subtitle="Até 3 jogos com ranking e prêmios" onBack={() => navigation.goBack()} />

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <IconButton icon={ChevronLeft} accessibilityLabel="Mês anterior" onPress={() => setPeriod((p) => shiftPeriod(p, -1))} />
        <MipoText variant="section">{monthLabel(period.year, period.month)}</MipoText>
        <IconButton icon={ChevronRight} accessibilityLabel="Próximo mês" onPress={() => setPeriod((p) => shiftPeriod(p, 1))} />
      </View>

      {periodQuery.isLoading ? (
        <LoadingState skeletons={2} />
      ) : periodQuery.isError ? (
        <ErrorState onRetry={() => periodQuery.refetch()} />
      ) : (
        <View style={{ gap: 12 }}>
          {games.length === 0 ? <EmptyState character="trofeu4" title="Nenhum jogo neste mês" message="Adicione até 3 jogos para abrir o ranking." /> : null}

          {games.map((monthlyGame) => (
            <Card key={monthlyGame.id}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <MipoText variant="cardTitle" numberOfLines={1}>
                    {monthlyGame.game.name}
                  </MipoText>
                  <MipoText variant="caption">{`${monthlyGame.totalPlayers} jogadores no ranking`}</MipoText>
                </View>
                <IconButton icon={Pencil} accessibilityLabel={`Editar prêmios de ${monthlyGame.game.name}`} onPress={() => openForm({ mode: "edit", monthlyGame })} />
                <IconButton icon={Trash2} accessibilityLabel={`Remover ${monthlyGame.game.name}`} onPress={() => confirmRemove(monthlyGame)} />
              </View>
              {[monthlyGame.prizeFirst, monthlyGame.prizeSecond, monthlyGame.prizeThird].map((prize, index) =>
                prize ? (
                  <MipoText key={index} variant="caption" style={{ marginTop: 4 }}>
                    {`${index + 1}º: ${prize}`}
                  </MipoText>
                ) : null,
              )}
              <Button label="Registrar pontuação" icon={Trophy} variant="ghost" size="sm" style={{ marginTop: 12 }} onPress={() => openManual(monthlyGame)} />
            </Card>
          ))}

          {games.length < MAX_GAMES_PER_MONTH ? (
            <Button label="Adicionar jogo" icon={Plus} variant="teal" block onPress={() => openForm({ mode: "create" })} />
          ) : null}
        </View>
      )}

      <BottomSheet visible={form !== null} onClose={() => setForm(null)}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <MipoText variant="section">{form?.mode === "edit" ? form.monthlyGame.game.name : "Novo jogo do mês"}</MipoText>

          {form?.mode === "create" ? (
            <>
              <FieldLabel>Jogo do acervo</FieldLabel>
              {catalogQuery.isLoading ? (
                <LoadingState skeletons={0} />
              ) : (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {(catalogQuery.data ?? [])
                    .filter((game) => !usedGameIds.has(game.id))
                    .map((game) => (
                      <Chip
                        key={game.id}
                        label={game.name}
                        size="md"
                        tone={gameId === game.id ? "active" : "neutral"}
                        selected={gameId === game.id}
                        onPress={() => setGameId(game.id)}
                      />
                    ))}
                </View>
              )}
            </>
          ) : null}

          {["Prêmio 1º lugar", "Prêmio 2º lugar", "Prêmio 3º lugar"].map((label, index) => (
            <React.Fragment key={label}>
              <FieldLabel>{label}</FieldLabel>
              <Input
                placeholder="Ex: 100 moedas"
                value={prizes[index]}
                maxLength={200}
                onChangeText={(text) => setPrizes((current) => current.map((prize, i) => (i === index ? text : prize)))}
              />
            </React.Fragment>
          ))}

          <FieldLabel>Regras (opcional)</FieldLabel>
          <Input placeholder="Como a pontuação é contada" value={rules} onChangeText={setRules} multiline maxLength={3000} />

          <Button
            label="Salvar"
            variant="lime"
            block
            style={{ marginTop: 18 }}
            loading={saveMutation.isPending}
            disabled={(form?.mode === "create" && !gameId) || saveMutation.isPending}
            onPress={() => saveMutation.mutate()}
          />
        </ScrollView>
      </BottomSheet>

      <BottomSheet visible={manualFor !== null} onClose={() => setManualFor(null)}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <MipoText variant="section">Registrar pontuação</MipoText>
          <MipoText variant="caption">{manualFor?.game.name}</MipoText>

          <FieldLabel>Jogador</FieldLabel>
          <Input placeholder="Buscar por nome" value={userSearch} onChangeText={setUserSearch} />
          <View style={{ gap: 6, marginTop: 8 }}>
            {(usersQuery.data?.data ?? []).map((candidate) => (
              <Card
                key={candidate.id}
                flat
                tone={manualUser?.id === candidate.id ? "lime" : "neutral"}
                onPress={() => setManualUser(candidate)}
                accessibilityLabel={`Selecionar ${candidate.name}`}
                contentStyle={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 }}
              >
                <Avatar name={candidate.name} id={candidate.id} uri={candidate.avatarUrl} size="sm" />
                <MipoText variant="bodyBold" numberOfLines={1} style={{ flex: 1 }}>
                  {candidate.nickname || candidate.name}
                </MipoText>
              </Card>
            ))}
          </View>

          <FieldLabel>Pontuação</FieldLabel>
          <Input placeholder="Ex: 87" keyboardType="number-pad" value={manualScore} onChangeText={setManualScore} maxLength={7} />

          <Button
            label="Registrar"
            variant="lime"
            block
            style={{ marginTop: 18 }}
            loading={manualMutation.isPending}
            disabled={!manualUser || !/^\d{1,7}$/.test(manualScore) || manualMutation.isPending}
            onPress={() => manualMutation.mutate()}
          />
        </ScrollView>
      </BottomSheet>
    </Screen>
  );
}
