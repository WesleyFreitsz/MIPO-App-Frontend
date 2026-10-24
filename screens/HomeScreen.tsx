import React, { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  Celebration,
  Character,
  EmptyState,
  ErrorState,
  GameTile,
  Hero,
  LoadingState,
  MipoText,
  Screen,
  SectionHeader,
} from "../components/ui";
import { StaggerIn } from "../motion/StaggerIn";
import { useTheme } from "../theme/ThemeProvider";
import { AccentName, fontFamily, radius, stroke } from "../theme/tokens";
import { EventoDetail } from "../types";
import { EventoCard } from "./evento/EventoCard";
import { EventoDetailSheet } from "./evento/EventoDetailSheet";
import { eventoParticipation, upcomingApprovedEventos } from "./evento/eventoState";
import { useEventoActions } from "./evento/useEventoActions";

interface FeaturedGame {
  id: string;
  name: string;
  category?: string | null;
  imageUrl?: string | null;
}

const tileTones: AccentName[] = ["teal", "lime", "lilac", "yellow", "orange", "pink"];
const tileTilts = [-2, 1.5, -1];

function firstName(name: string | undefined): string {
  return name?.trim().split(/\s+/)[0] ?? "";
}

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [eventos, setEventos] = useState<EventoDetail[]>([]);
  const [nextEventos, setNextEventos] = useState<EventoDetail[]>([]);
  const [featuredGames, setFeaturedGames] = useState<FeaturedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [celebratedTitle, setCelebratedTitle] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permissão Necessária", "Precisamos de acesso à câmera para o check-in.");
      }
    })();
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      const resEvents = await api.get<EventoDetail[]>("/events");
      setEventos(resEvents.data);
      setNextEventos(upcomingApprovedEventos(resEvents.data, new Date(), 3));
      const resGames = await api.get<FeaturedGame[]>("/games?isFeatured=true");
      setFeaturedGames(resGames.data);
      setFailed(false);
    } catch (error) {
      console.log("Erro ao buscar dados", error);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [fetchDashboardData]),
  );

  const selectedEvento = eventos.find((evento) => evento.id === selectedId) ?? null;
  const participation = eventoParticipation(selectedEvento, user?.id);

  const { toggleParticipation, checkIn, toggling, checkingIn } = useEventoActions(selectedEvento, {
    onChanged: fetchDashboardData,
    onCheckedIn: () => {
      setCelebratedTitle(selectedEvento?.title ?? "");
      setSelectedId(null);
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

  const retry = () => {
    setLoading(true);
    fetchDashboardData();
  };

  const [destaque, ...outrosEventos] = nextEventos;

  return (
    <>
      <Screen scroll withTabBar safeTop={false}>
        <Hero paddingTop={insets.top + 8}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <MipoText
              style={{
                fontFamily: fontFamily.display,
                fontSize: 32,
                lineHeight: 38,
                letterSpacing: -1,
                color: colors.red,
                textShadowColor: colors.line,
                textShadowOffset: { width: 2, height: 2 },
                textShadowRadius: 0.1,
              }}
            >
              mipo
            </MipoText>
            <View
              accessible
              accessibilityLabel={`${user?.coins ?? 0} moedas`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingLeft: 4,
                paddingRight: 10,
                paddingVertical: 2,
                borderRadius: radius.chip,
                borderWidth: stroke.thin,
                borderColor: colors.tab,
                backgroundColor: colors.tab,
              }}
            >
              <Character name="moeda2" size={24} motion="none" />
              <MipoText variant="cardTitle" style={{ color: colors.tabText, fontSize: 14 }}>
                {String(user?.coins ?? 0)}
              </MipoText>
            </View>
          </View>
          <MipoText variant="screenTitle" style={{ marginTop: 8 }}>
            {`Bora jogar hoje, ${firstName(user?.name)}?`}
          </MipoText>
        </Hero>

        {loading ? (
          <LoadingState skeletons={2} />
        ) : failed && nextEventos.length === 0 && featuredGames.length === 0 ? (
          <ErrorState onRetry={retry} />
        ) : (
          <>
            {destaque ? (
              <StaggerIn index={0} style={{ marginTop: 16 }}>
                <EventoCard evento={destaque} variant="destaque" onPress={() => setSelectedId(destaque.id)} />
              </StaggerIn>
            ) : (
              <EmptyState character="dado3" title="Nenhum evento por enquanto" message="Fica de olho, sempre tem jogatina vindo." />
            )}

            <StaggerIn index={1}>
              <SectionHeader
                title="Jogos em destaque"
                action={{ label: "Ver todos", accessibilityLabel: "Ver todos os jogos", onPress: () => navigation.navigate("GamesList") }}
              />
              {featuredGames.length === 0 ? (
                <MipoText variant="caption">Nenhum jogo em destaque no momento.</MipoText>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12, paddingVertical: 6, paddingRight: 8 }}
                >
                  {featuredGames.map((game, index) => (
                    <GameTile
                      key={game.id}
                      name={game.name}
                      meta={game.category ?? undefined}
                      imageUrl={game.imageUrl}
                      tone={tileTones[index % tileTones.length]}
                      tilt={tileTilts[index % tileTilts.length]}
                      width={96}
                      height={116}
                      onPress={() => navigation.navigate("GameDetail", { gameId: game.id })}
                    />
                  ))}
                </ScrollView>
              )}
            </StaggerIn>

            <StaggerIn index={2}>
              <SectionHeader
                title="Próximos eventos"
                action={{ label: "Ver todos", accessibilityLabel: "Ver todos os eventos", onPress: () => navigation.navigate("EventsList") }}
              />
              <View style={{ gap: 12 }}>
                {outrosEventos.map((evento) => (
                  <EventoCard key={evento.id} evento={evento} variant="lista" onPress={() => setSelectedId(evento.id)} />
                ))}
              </View>
            </StaggerIn>
          </>
        )}
      </Screen>

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
        message={`Boa ${celebratedTitle ?? ""}, ${firstName(user?.name)}.`}
        reward="Você ganhou pontos de participação"
        character="dado1"
        onClose={() => setCelebratedTitle(null)}
      />
    </>
  );
}
