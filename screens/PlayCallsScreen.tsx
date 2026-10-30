import React, { useEffect, useState } from "react";
import { FlatList, RefreshControl } from "react-native";
import { useRoute } from "@react-navigation/native";
import type { RouteProp, ParamListBase } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react-native";
import { api } from "../services/api";
import { EmptyState, ErrorState, IconButton, LoadingState, Screen, ScreenHeader, SegmentedControl, useBottomReserve } from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";
import { PlayCallCard } from "./loja/PlayCallCard";
import { CreatePlayCallSheet } from "./loja/CreatePlayCallSheet";
import { PlayCall, PlayCallMode, usePlayCalls } from "./loja/playCallsApi";
import { useStorePresence } from "./loja/useStorePresence";

type PlayCallsRoute = RouteProp<ParamListBase & { PlayCalls: { callId?: string } | undefined }, "PlayCalls">;

export default function PlayCallsScreen() {
  const { params } = useRoute<PlayCallsRoute>();
  const callId = params?.callId;
  const { colors } = useTheme();
  const bottomReserve = useBottomReserve(false);
  const [mode, setMode] = useState<PlayCallMode>("NOW");
  const [creating, setCreating] = useState(false);
  const presence = useStorePresence();
  const checkedIn = presence.data?.me.checkedIn ?? false;
  const calls = usePlayCalls(mode);

  const highlighted = useQuery<PlayCall>({
    queryKey: ["playCalls", "detail", callId],
    queryFn: async () => (await api.get<PlayCall>(`/play-calls/${callId}`)).data,
    enabled: Boolean(callId),
    retry: false,
  });

  useEffect(() => {
    if (highlighted.data) setMode(highlighted.data.mode);
  }, [highlighted.data]);

  const list = calls.data ?? [];
  const highlightedId = highlighted.data?.id;
  const ordered = highlightedId ? [...list.filter((c) => c.id === highlightedId), ...list.filter((c) => c.id !== highlightedId)] : list;

  return (
    <Screen>
      <ScreenHeader
        title="Procuro jogadores"
        subtitle={mode === "NOW" ? "Mesas abertas na Mipo agora" : "Partidas marcadas"}
        right={<IconButton icon={Plus} accessibilityLabel="Criar chamado" onPress={() => setCreating(true)} />}
      />
      <SegmentedControl<PlayCallMode>
        options={[
          { value: "NOW", label: "Agora" },
          { value: "SCHEDULED", label: "Agendados" },
        ]}
        value={mode}
        onChange={setMode}
      />

      {calls.isLoading ? (
        <LoadingState />
      ) : calls.isError ? (
        <ErrorState onRetry={() => calls.refetch()} />
      ) : (
        <FlatList
          data={ordered}
          keyExtractor={(item) => item.id}
          style={{ marginHorizontal: -14 }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: bottomReserve, gap: 12 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={calls.isRefetching} onRefresh={() => { calls.refetch(); }} tintColor={colors.pink} />}
          ListEmptyComponent={
            mode === "NOW" && !checkedIn ? (
              <EmptyState character="dado1" title="Faça check-in para ver" message="As mesas de agora aparecem para quem está na loja." />
            ) : (
              <EmptyState character="peao2" title="Nenhum chamado aberto" message="Crie um no + e chame a galera." />
            )
          }
          renderItem={({ item }) => <PlayCallCard call={item} highlighted={item.id === highlightedId} />}
        />
      )}

      <CreatePlayCallSheet visible={creating} onClose={() => setCreating(false)} canPlayNow={checkedIn} initialMode={mode} />
    </Screen>
  );
}
