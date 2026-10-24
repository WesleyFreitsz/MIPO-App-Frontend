import React from "react";
import { Image, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import { api } from "../services/api";
import { BackButton, Card, ErrorState, GameTile, Hero, LoadingState, MipoText, Screen, SectionHeader } from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";
import { radius, stroke } from "../theme/tokens";
import { Jogo } from "../types";
import { categoriesText, playersRange } from "./jogo/jogoFormat";

function GameVideoPlayer({ videoUrl }: { videoUrl: string }) {
  const player = useVideoPlayer(videoUrl, (instance) => {
    instance.loop = false;
  });

  return (
    <VideoView
      style={{ width: "100%", aspectRatio: 16 / 9 }}
      player={player}
      fullscreenOptions={{ enable: true }}
      allowsPictureInPicture
      nativeControls
      contentFit="cover"
    />
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <Card flat style={{ flex: 1 }} contentStyle={{ alignItems: "center", paddingVertical: 8 }}>
      <MipoText variant="section" style={{ fontSize: 17 }}>
        {value}
      </MipoText>
      <MipoText variant="micro">{label}</MipoText>
    </Card>
  );
}

export function resolveVideoUrl(videoUrl: string | null | undefined): string | null {
  if (!videoUrl) return null;
  return videoUrl.startsWith("http") ? videoUrl : `${api.defaults.baseURL}${videoUrl}`;
}

export default function GameDetailScreen() {
  const route = useRoute<{ key: string; name: string; params?: { gameId?: string } }>();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const gameId = route.params?.gameId;

  const { data: game, isLoading, isError, refetch } = useQuery<Jogo>({
    queryKey: ["game", gameId],
    queryFn: async () => (await api.get(`/games/${gameId}`)).data,
    enabled: !!gameId,
  });

  const videoUrl = resolveVideoUrl(game?.videoUrl);
  const players = playersRange(game?.minPlayers, game?.maxPlayers);

  return (
    <Screen scroll safeTop={false}>
      <Hero tone="teal" paddingTop={insets.top + 6} style={{ height: 230 + insets.top }}>
        <View style={{ flexDirection: "row" }}>
          <BackButton onPress={() => navigation.goBack()} />
        </View>
        {game ? (
          <View style={{ position: "absolute", left: 0, right: 0, bottom: 18, alignItems: "center" }}>
            {game.imageUrl ? (
              <View
                style={{
                  width: 120,
                  height: 150,
                  borderRadius: radius.tile,
                  borderWidth: stroke.regular,
                  borderColor: colors.line,
                  overflow: "hidden",
                  transform: [{ rotate: "-3deg" }],
                }}
              >
                <Image source={{ uri: game.imageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
              </View>
            ) : (
              <GameTile name={game.name} tone="yellow" tilt={-3} width={110} height={140} />
            )}
          </View>
        ) : null}
      </Hero>

      {isLoading ? (
        <LoadingState skeletons={2} />
      ) : isError || !game ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <>
          <MipoText variant="screenTitle" style={{ marginTop: 14 }}>
            {game.name}
          </MipoText>
          {game.category ? <MipoText variant="caption">{categoriesText(game.category)}</MipoText> : null}

          {players ? (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <Stat value={players} label="jogadores" />
              <Stat value="No acervo" label="disponível" />
            </View>
          ) : null}

          {game.description ? (
            <>
              <SectionHeader title="Sobre o jogo" />
              <MipoText variant="body" color="muted">
                {game.description}
              </MipoText>
            </>
          ) : null}

          {videoUrl ? (
            <>
              <SectionHeader title="Como jogar" />
              <Card tone="lilac" contentStyle={{ padding: 0, overflow: "hidden" }}>
                <GameVideoPlayer videoUrl={videoUrl} />
              </Card>
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}
