import React, { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { Plus } from "lucide-react-native";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Celebration, EmptyState, ErrorState, Fab, LoadingState, Screen, ScreenHeader, useBottomReserve } from "../components/ui";
import { StaggerIn } from "../motion/StaggerIn";
import { durations } from "../motion/tokens";
import { EventoDetail } from "../types";
import { EventoCard } from "./evento/EventoCard";
import { EventoDetailSheet } from "./evento/EventoDetailSheet";
import { eventoParticipation } from "./evento/eventoState";
import { useEventoActions } from "./evento/useEventoActions";

interface EventsListScreenProps {
  navigation: Pick<NavigationProp<ParamListBase>, "navigate" | "goBack" | "canGoBack">;
}

export default function EventsListScreen({ navigation }: EventsListScreenProps) {
  const { user } = useAuth();
  const bottomReserve = useBottomReserve(false);
  const [events, setEvents] = useState<EventoDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [celebratedTitle, setCelebratedTitle] = useState<string | null>(null);
  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const response = await api.get<EventoDetail[]>("/events");
      const sortedEvents = [...response.data].sort(
        (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
      );
      setEvents(sortedEvents);
      setFailed(false);
    } catch (error) {
      console.log("Erro ao carregar eventos:", error);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [fetchEvents]),
  );

  const selectedEvento = events.find((evento) => evento.id === selectedId) ?? null;
  const participation = eventoParticipation(selectedEvento, user?.id);
  const { toggleParticipation, checkIn, toggling, checkingIn } = useEventoActions(selectedEvento, {
    onChanged: fetchEvents,
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
      {loading ? (
        <LoadingState />
      ) : failed && events.length === 0 ? (
        <ErrorState
          onRetry={() => {
            setLoading(true);
            fetchEvents();
          }}
        />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          style={{ marginHorizontal: -14 }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 4, paddingBottom: bottomReserve + 80, gap: 12 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState character="dado3" title="Nenhum evento por enquanto" message="Fica de olho, sempre tem jogatina vindo." />
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
