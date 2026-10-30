import React, { useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, SectionList, View } from "react-native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react-native";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  Celebration,
  EmptyState,
  ErrorState,
  Fab,
  Input,
  LoadingState,
  MipoText,
  Screen,
  ScreenHeader,
  SegmentedControl,
  formatDateLong,
  useBottomReserve,
} from "../components/ui";
import { StaggerIn } from "../motion/StaggerIn";
import { durations } from "../motion/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { EventoDetail } from "../types";
import { EventoCard } from "./evento/EventoCard";
import { EventoDetailSheet } from "./evento/EventoDetailSheet";
import { EventoPeriod, eventoParticipation, filterEventos, groupEventosByDay } from "./evento/eventoState";
import { useEventoActions } from "./evento/useEventoActions";

interface EventsListScreenProps {
  navigation: Pick<NavigationProp<ParamListBase>, "navigate" | "goBack" | "canGoBack">;
  route?: { params?: { eventId?: string } };
}

const periodOptions: { value: EventoPeriod; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "today", label: "Hoje" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
];

export default function EventsListScreen({ navigation, route }: EventsListScreenProps) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const bottomReserve = useBottomReserve(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [period, setPeriod] = useState<EventoPeriod>("all");
  const [search, setSearch] = useState("");
  const [celebratedTitle, setCelebratedTitle] = useState<string | null>(null);
  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
  }, []);

  const routeEventId = route?.params?.eventId;
  useEffect(() => {
    if (routeEventId) setSelectedId(routeEventId);
  }, [routeEventId]);

  const eventsQuery = useQuery<EventoDetail[]>({
    queryKey: ["events"],
    queryFn: async () => (await api.get<EventoDetail[]>("/events")).data,
  });
  const events = eventsQuery.data ?? [];

  const sections = useMemo(
    () => groupEventosByDay(filterEventos(events, period, search)).map((group) => ({ title: formatDateLong(group.day), data: group.eventos })),
    [events, period, search],
  );

  const refreshEvents = () => queryClient.invalidateQueries({ queryKey: ["events"] });

  const selectedEvento = events.find((evento) => evento.id === selectedId) ?? null;
  const participation = eventoParticipation(selectedEvento, user?.id);
  const { toggleParticipation, checkIn, toggling, checkingIn } = useEventoActions(selectedEvento, {
    onChanged: refreshEvents,
    onCheckedIn: () => {
      const title = selectedEvento?.title ?? "";
      setSelectedId(null);
      celebrationTimer.current = setTimeout(() => setCelebratedTitle(title), durations.modalSwap);
    },
  });

  const openChat = () => {
    if (!selectedEvento) return;
    setSelectedId(null);
    navigation.navigate("ChatDetail", {
      chatId: selectedEvento.chatId,
      name: selectedEvento.title,
      type: "EVENT",
      avatar: selectedEvento.bannerUrl,
      targetId: selectedEvento.id,
    });
  };

  return (
    <Screen>
      <ScreenHeader title="Eventos" onBack={() => navigation.goBack()} />
      <Input icon={Search} placeholder="Buscar evento ou jogo" value={search} onChangeText={setSearch} accessibilityLabel="Buscar evento ou jogo" />
      <View style={{ marginTop: 10 }}>
        <SegmentedControl<EventoPeriod> options={periodOptions} value={period} onChange={setPeriod} />
      </View>
      {eventsQuery.isLoading ? (
        <LoadingState />
      ) : eventsQuery.isError && events.length === 0 ? (
        <ErrorState onRetry={() => eventsQuery.refetch()} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          style={{ marginHorizontal: -14 }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 4, paddingBottom: bottomReserve + 80, gap: 12 }}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={eventsQuery.isRefetching} onRefresh={refreshEvents} tintColor={colors.pink} />}
          renderSectionHeader={({ section }) => (
            <MipoText variant="label" style={{ marginTop: 8 }}>
              {section.title}
            </MipoText>
          )}
          ListEmptyComponent={
            <EmptyState
              character="dado3"
              title={search || period !== "all" ? "Nada encontrado" : "Nenhum evento por enquanto"}
              message={search || period !== "all" ? "Tenta outro filtro ou outra busca." : "Fica de olho, sempre tem jogatina vindo."}
            />
          }
          renderItem={({ item, index }) => (
            <StaggerIn index={index}>
              <EventoCard evento={item} variant="lista" onPress={() => setSelectedId(item.id)} />
            </StaggerIn>
          )}
        />
      )}
      <View pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
        <Fab icon={Plus} accessibilityLabel="Sugerir evento" onPress={() => navigation.navigate("AdminCreateEvent")} />
      </View>

      <EventoDetailSheet
        evento={selectedEvento}
        visible={selectedEvento !== null}
        onClose={() => setSelectedId(null)}
        onToggleParticipation={toggleParticipation}
        onCheckIn={checkIn}
        onOpenChat={openChat}
        isConfirmed={participation.isConfirmed}
        canCheckIn={participation.canCheckIn}
        toggling={toggling}
        checkingIn={checkingIn}
      />

      <Celebration
        visible={celebratedTitle !== null}
        title="Check-in feito!"
        message={`Boa ${celebratedTitle ?? ""}, ${user?.name?.trim().split(/\s+/)[0] ?? ""}.`}
        reward="Você ganhou pontos de participação"
        character="dado1"
        onClose={() => setCelebratedTitle(null)}
      />
    </Screen>
  );
}
