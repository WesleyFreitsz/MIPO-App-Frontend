import React, { useEffect, useState } from "react";
import { Image, Pressable, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Dices, Heart, Star } from "lucide-react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import { api } from "../services/api";
import { Avatar, BackButton, Button, Card, Chip, ErrorState, GameTile, Hero, Input, LoadingState, MipoText, Screen, SectionHeader, showAlert } from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";
import { radius, stroke } from "../theme/tokens";
import { Jogo } from "../types";
import { GameReview, GameUserMark, Page } from "./jogo/monthlyGameTypes";
import { categoriesText, playersRange } from "./jogo/jogoFormat";
import { RegisterPlaySheet } from "./jogo/RegisterPlaySheet";

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

function StarRating({ value, onChange }: { value: number; onChange: (rating: number) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 6 }} accessibilityRole="adjustable" accessibilityLabel={`Sua nota: ${value} de 5`}>
      {[1, 2, 3, 4, 5].map((rating) => (
        <Pressable
          key={rating}
          onPress={() => onChange(rating)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`Dar nota ${rating}`}
        >
          <Star size={30} strokeWidth={2.2} color={colors.line} fill={rating <= value ? colors.yellow : "transparent"} />
        </Pressable>
      ))}
    </View>
  );
}

function GameMarks({ gameId }: { gameId: string }) {
  const queryClient = useQueryClient();
  const { data: marks = [] } = useQuery<GameUserMark[]>({
    queryKey: ["games", "myMarks"],
    queryFn: async () => (await api.get("/games/me/marks")).data,
  });
  const mark = marks.find((item) => item.gameId === gameId);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");

  useEffect(() => {
    setRating(mark?.rating ?? 0);
    setReview(mark?.review ?? "");
  }, [mark?.rating, mark?.review]);

  const updateMark = useMutation({
    mutationFn: (data: Partial<Pick<GameUserMark, "isFavorite" | "wantsToPlay" | "rating" | "review">>) => api.put(`/games/${gameId}/my-mark`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["games", "myMarks"] });
      queryClient.invalidateQueries({ queryKey: ["game", gameId] });
    },
    onError: () => showAlert("Erro", "Não foi possível salvar."),
  });

  return (
    <>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        <Chip
          label={mark?.isFavorite ? "Favorito" : "Favoritar"}
          icon={Heart}
          size="md"
          tone={mark?.isFavorite ? "pink" : "neutral"}
          selected={!!mark?.isFavorite}
          onPress={() => updateMark.mutate({ isFavorite: !mark?.isFavorite })}
        />
        <Chip
          label="Quero jogar"
          icon={Bookmark}
          size="md"
          tone={mark?.wantsToPlay ? "teal" : "neutral"}
          selected={!!mark?.wantsToPlay}
          onPress={() => updateMark.mutate({ wantsToPlay: !mark?.wantsToPlay })}
        />
      </View>

      <SectionHeader title="Sua avaliação" />
      <StarRating value={rating} onChange={setRating} />
      <Input placeholder="Conta o que achou (opcional)" value={review} onChangeText={setReview} multiline maxLength={1000} containerStyle={{ marginTop: 10 }} />
      <Button
        label="Salvar avaliação"
        variant="yellow"
        size="sm"
        style={{ marginTop: 10, alignSelf: "flex-start" }}
        loading={updateMark.isPending}
        disabled={rating === 0 || updateMark.isPending}
        onPress={() => updateMark.mutate({ rating, review: review.trim() || null })}
      />
    </>
  );
}

function GameReviews({ gameId }: { gameId: string }) {
  const { data } = useQuery<Page<GameReview>>({
    queryKey: ["game", gameId, "reviews"],
    queryFn: async () => (await api.get(`/games/${gameId}/reviews`, { params: { skip: 0, take: 10 } })).data,
  });
  const reviews = data?.data ?? [];
  if (reviews.length === 0) return null;

  return (
    <>
      <SectionHeader title="O que a galera achou" />
      <View style={{ gap: 8 }}>
        {reviews.map((item) => (
          <Card key={item.id} flat>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Avatar name={item.user.name} id={item.user.id} uri={item.user.avatarUrl} size="sm" />
              <MipoText variant="bodyBold" numberOfLines={1} style={{ flex: 1 }}>
                {item.user.nickname || item.user.name}
              </MipoText>
              <MipoText variant="caption">{`${"★".repeat(item.rating)}${"☆".repeat(5 - item.rating)}`}</MipoText>
            </View>
            {item.review ? (
              <MipoText variant="body" color="muted" style={{ marginTop: 6 }}>
                {item.review}
              </MipoText>
            ) : null}
          </Card>
        ))}
      </View>
    </>
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
  const [registerPlayVisible, setRegisterPlayVisible] = useState(false);

  const { data: game, isLoading, isError, refetch } = useQuery<Jogo & { ratingAverage: number | null; ratingCount: number }>({
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
              {game.ratingAverage !== null ? (
                <Stat value={`★ ${game.ratingAverage.toFixed(1)}`} label={game.ratingCount === 1 ? "1 avaliação" : `${game.ratingCount} avaliações`} />
              ) : (
                <Stat value="No acervo" label="disponível" />
              )}
            </View>
          ) : null}

          <GameMarks gameId={game.id} />

          <Button label="Registrar partida" icon={Dices} variant="ghost" size="sm" style={{ marginTop: 12, alignSelf: "flex-start" }} onPress={() => setRegisterPlayVisible(true)} />

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

          <GameReviews gameId={game.id} />
          <RegisterPlaySheet visible={registerPlayVisible} onClose={() => setRegisterPlayVisible(false)} gameId={game.id} gameName={game.name} />
        </>
      )}
    </Screen>
  );
}
