import React from "react";
import { Pressable, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { api } from "../../services/api";
import { AvatarStack, Card, Chip, MipoText, SectionHeader } from "../../components/ui";
import { GamePlayItem, GamePlaysPage } from "../jogo/gamePlayTypes";

const RECENT_PLAYS = 5;

interface PlayHistorySectionProps {
  userId: string;
  viewerId?: string;
  isOwnProfile?: boolean;
}

function playedWith(play: GamePlayItem, viewerId: string) {
  return play.author?.id === viewerId || play.players.some((player) => player?.id === viewerId);
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function PlayHistorySection({ userId, viewerId, isOwnProfile = false }: PlayHistorySectionProps) {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { data, isError } = useQuery<GamePlaysPage>({
    queryKey: ["gamePlays", isOwnProfile ? "mine" : userId],
    queryFn: async () => (await api.get(isOwnProfile ? "/game-plays/mine" : `/game-plays/users/${userId}`, { params: { skip: 0, take: RECENT_PLAYS } })).data,
    retry: false,
  });

  if (isError || !data) return null;
  const { summary } = data;
  if (summary.totalPlays === 0 && !isOwnProfile) return null;

  const togetherCount = viewerId && !isOwnProfile ? data.data.filter((play) => playedWith(play, viewerId)).length : 0;

  return (
    <>
      <SectionHeader title={isOwnProfile ? "Meus jogos" : "Histórico de jogos"} />
      {summary.totalPlays === 0 ? (
        <MipoText variant="caption">Registre suas partidas no detalhe de cada jogo e elas aparecem aqui.</MipoText>
      ) : (
        <>
          <MipoText variant="caption">
            {`${summary.totalPlays} partida${summary.totalPlays === 1 ? "" : "s"} · ${summary.distinctGames} jogo${summary.distinctGames === 1 ? "" : "s"} · ${summary.playsThisMonth} neste mês`}
          </MipoText>
          {togetherCount > 0 ? <Chip label={`Jogou com você ${togetherCount}x recentemente`} tone="teal" style={{ marginTop: 8, alignSelf: "flex-start" }} /> : null}
          {summary.topGames.length > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              {summary.topGames.map((game) => (
                <Chip key={game.id} label={`${game.name} · ${game.plays}x`} tone="yellow" onPress={() => navigation.navigate("GameDetail", { gameId: game.id })} />
              ))}
            </View>
          ) : null}
          <View style={{ gap: 8, marginTop: 10 }}>
            {data.data.map((play) => {
              const people = [play.author, ...play.players].filter((person): person is NonNullable<typeof person> => !!person);
              return (
                <Pressable
                  key={play.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${play.game.name}, ${formatDay(play.playedAt)}`}
                  onPress={() => navigation.navigate("GameDetail", { gameId: play.game.id })}
                >
                  <Card flat contentStyle={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <MipoText variant="bodyBold" numberOfLines={1}>
                        {play.game.name}
                      </MipoText>
                      <MipoText variant="caption">{`${formatDay(play.playedAt)}${play.source === "ORDER" ? " · na Mipo" : ""}`}</MipoText>
                    </View>
                    {people.length > 1 ? <AvatarStack people={people.map((person) => ({ id: person.id, name: person.nickname || person.name, uri: person.avatarUrl }))} /> : null}
                  </Card>
                </Pressable>
              );
            })}
          </View>
        </>
      )}
    </>
  );
}
