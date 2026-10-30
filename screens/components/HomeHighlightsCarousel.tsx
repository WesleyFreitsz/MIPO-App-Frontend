import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Image, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";
import { AvatarStack, Card, Character, MipoText } from "../../components/ui";
import type { CharacterName } from "../../components/ui";
import { useReducedMotion } from "../../motion/reducedMotion";
import { useTheme } from "../../theme/ThemeProvider";
import { AccentName, foregroundOn, radius } from "../../theme/tokens";
import { EventoDetail } from "../../types";
import { MonthlyGameStanding } from "../jogo/monthlyGameTypes";
import { useStorePresence } from "../loja/useStorePresence";
import { displayName } from "../loja/storeTypes";
import { usePlayCalls } from "../loja/playCallsApi";
import { Recommendation, RECOMMENDATIONS_PATH } from "../jogo/recommendationsApi";

const AUTOPLAY_MS = 5_000;
const SLIDE_HEIGHT = 196;

interface DailySpecial {
  id: string;
  name: string;
  description?: string | null;
  price: number | string;
  imageUrl?: string | null;
}

interface Slide {
  key: string;
  tone: AccentName;
  eyebrow: string;
  title: string;
  subtitle: string;
  character?: CharacterName;
  imageUrl?: string | null;
  people?: { id: string; name: string; uri?: string | null }[];
  onPress: () => void;
}

function formatEventDate(iso: string) {
  const date = new Date(iso);
  const day = date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
  return `${day} · ${date.getHours()}h${date.getMinutes() ? String(date.getMinutes()).padStart(2, "0") : ""}`;
}

export function HomeHighlightsCarousel({ nextEvento, monthlyGames }: { nextEvento?: EventoDetail; monthlyGames: MonthlyGameStanding[] }) {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const listRef = useRef<FlatList<Slide>>(null);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const [paused, setPaused] = useState(false);

  const specialsQuery = useQuery<DailySpecial[]>({
    queryKey: ["menu", "dailySpecial"],
    queryFn: async () => (await api.get<DailySpecial[]>("/menu", { params: { dailySpecial: true } })).data,
    retry: false,
  });
  const presenceQuery = useStorePresence();
  const presence = presenceQuery.data;
  const playCallsQuery = usePlayCalls("NOW", presence?.me.checkedIn ?? false);
  const recommendationsQuery = useQuery<Recommendation[]>({
    queryKey: ["gamePlays", "recommendations"],
    queryFn: async () => (await api.get<Recommendation[]>(RECOMMENDATIONS_PATH)).data,
    retry: false,
  });

  const specials = specialsQuery.data ?? [];
  const openCalls = (playCallsQuery.data ?? []).filter((call) => call.status === "OPEN");
  const recommendations = recommendationsQuery.data ?? [];

  const slides = useMemo<Slide[]>(() => {
    const list: Slide[] = [];
    if (specials.length > 0) {
      list.push({
        key: "food",
        tone: "orange",
        eyebrow: "Comida do dia",
        title: specials.map((item) => item.name).join(" · "),
        subtitle: specials[0].description || "Peça direto da sua mesa",
        imageUrl: specials[0].imageUrl,
        character: "pocao2",
        onPress: () => navigation.navigate("Menu"),
      });
    }
    if (monthlyGames.length > 0) {
      const leader = monthlyGames[0].podium[0];
      list.push({
        key: "monthly",
        tone: "yellow",
        eyebrow: "Desafio do mês",
        title: monthlyGames.map((monthlyGame) => monthlyGame.game.name).join(" · "),
        subtitle: leader ? `${leader.user.nickname || leader.user.name} lidera com ${leader.score} pts` : "Seja o primeiro no ranking",
        character: "trofeu4",
        onPress: () => navigation.navigate("MonthlyGames"),
      });
    }
    if (nextEvento) {
      list.push({
        key: "event",
        tone: "lilac",
        eyebrow: "Próximo evento",
        title: nextEvento.title,
        subtitle: formatEventDate(nextEvento.dateTime),
        imageUrl: nextEvento.bannerUrl,
        character: "dado3",
        onPress: () => navigation.navigate("EventsList", { eventId: nextEvento.id }),
      });
    }
    if (presence && presence.count > 0) {
      list.push({
        key: "store",
        tone: "lime",
        eyebrow: "Na Mipo agora",
        title: presence.count === 1 ? "1 pessoa jogando" : `${presence.count} pessoas jogando`,
        subtitle: presence.users.slice(0, 3).map(displayName).join(", "),
        people: presence.users.map((user) => ({ id: user.id, name: user.name, uri: user.avatarUrl })),
        onPress: () => navigation.navigate("MainTabs", { screen: "Na loja" }),
      });
    }
    if (openCalls.length > 0) {
      list.push({
        key: "lfg",
        tone: "teal",
        eyebrow: "Procurando jogadores agora",
        title: openCalls.slice(0, 3).map((call) => call.title).join(" · "),
        subtitle: openCalls.length === 1 ? "1 mesa chamando gente" : `${openCalls.length} mesas chamando gente`,
        people: openCalls.map((call) => ({ id: call.creator.id, name: call.creator.name, uri: call.creator.avatarUrl })),
        onPress: () => navigation.navigate("PlayCalls"),
      });
    }
    if (recommendations.length > 0) {
      const [first] = recommendations;
      list.push({
        key: "recommended",
        tone: "blue",
        eyebrow: "Recomendados para você",
        title: recommendations.slice(0, 3).map((game) => game.name).join(" · "),
        subtitle: first.reason,
        imageUrl: first.imageUrl,
        character: "dado1",
        onPress: () => navigation.navigate("GameDetail", { gameId: first.id }),
      });
    }
    return list;
  }, [specials, monthlyGames, nextEvento, presence, openCalls, recommendations, navigation]);

  const slideCount = slides.length;
  useEffect(() => {
    if (reducedMotion || paused || slideCount < 2 || width === 0) return;
    const timer = setInterval(() => {
      const next = (indexRef.current + 1) % slideCount;
      indexRef.current = next;
      setIndex(next);
      listRef.current?.scrollToOffset({ offset: next * width, animated: true });
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [reducedMotion, paused, slideCount, width]);

  if (slideCount === 0) return null;

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ marginTop: 16 }}>
      {width > 0 ? (
        <FlatList
          ref={listRef}
          data={slides}
          keyExtractor={(slide) => slide.key}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          getItemLayout={(_, itemIndex) => ({ length: width, offset: width * itemIndex, index: itemIndex })}
          onScrollBeginDrag={() => setPaused(true)}
          onMomentumScrollEnd={(event) => {
            indexRef.current = Math.round(event.nativeEvent.contentOffset.x / width);
            setIndex(indexRef.current);
            setPaused(false);
          }}
          renderItem={({ item }) => {
            const foreground = foregroundOn(item.tone, colors);
            return (
            <View style={{ width, paddingHorizontal: 2, paddingVertical: 4 }}>
              <Card
                tone={item.tone}
                onPress={item.onPress}
                accessibilityLabel={`${item.eyebrow}: ${item.title}. ${item.subtitle}`}
                contentStyle={{ flexDirection: "row", alignItems: "center", gap: 14, height: SLIDE_HEIGHT - 40 }}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View
                    style={{
                      alignSelf: "flex-start",
                      paddingHorizontal: 10,
                      paddingVertical: 3,
                      borderRadius: radius.chip,
                      backgroundColor: foreground,
                    }}
                  >
                    <MipoText variant="label" style={{ color: colors[item.tone] }}>
                      {item.eyebrow}
                    </MipoText>
                  </View>
                  <MipoText variant="section" numberOfLines={2} style={{ marginTop: 8, color: foreground }}>
                    {item.title}
                  </MipoText>
                  <MipoText variant="bodyBold" numberOfLines={2} style={{ marginTop: 4, color: foreground, opacity: 0.85 }}>
                    {item.subtitle}
                  </MipoText>
                  {item.people ? (
                    <View style={{ marginTop: 6 }}>
                      <AvatarStack people={item.people} max={5} />
                    </View>
                  ) : null}
                </View>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={{ width: 116, height: 116, borderRadius: radius.tile }} />
                ) : item.character ? (
                  <Character name={item.character} size={104} motion="none" />
                ) : null}
              </Card>
            </View>
            );
          }}
        />
      ) : (
        <View style={{ height: SLIDE_HEIGHT }} />
      )}
      {slideCount > 1 ? (
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 6 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {slides.map((slide, dotIndex) => (
            <View
              key={slide.key}
              style={{
                width: dotIndex === index ? 18 : 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: dotIndex === index ? colors.text : colors.muted,
                opacity: dotIndex === index ? 1 : 0.4,
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
