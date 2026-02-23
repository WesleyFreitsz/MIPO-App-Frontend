import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useNavigation } from "@react-navigation/native";
import { api } from "../services/api";
import { ChevronLeft, Gamepad2, Users, PlayCircle } from "lucide-react-native";
import { useVideoPlayer, VideoView } from "expo-video";

const { width } = Dimensions.get("window");

// Componente isolado de Player usando a nova API do Expo Video
function GameVideoPlayer({ videoUrl }: { videoUrl: string }) {
  const player = useVideoPlayer(videoUrl, (player) => {
    player.loop = false;
  });

  return (
    <VideoView
      style={styles.videoPlayer}
      player={player}
      allowsFullscreen
      allowsPictureInPicture
      nativeControls
      contentFit="cover"
    />
  );
}

export default function GameDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const gameId = route.params?.gameId;

  const { data: game, isLoading } = useQuery({
    queryKey: ["game", gameId],
    queryFn: async () => (await api.get(`/games/${gameId}`)).data,
    enabled: !!gameId,
  });

  if (isLoading)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#c73636" />
      </View>
    );
  if (!game) return null;

  const videoUrl = game.videoUrl
    ? game.videoUrl.startsWith("http")
      ? game.videoUrl
      : `${api.defaults.baseURL}${game.videoUrl}`
    : null;
  const categoriesText = Array.isArray(game.category)
    ? game.category.join(", ")
    : game.category;

  return (
    <View style={styles.container}>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        <View style={styles.headerImageContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft color="#fff" size={28} />
          </TouchableOpacity>

          {game.imageUrl ? (
            <Image
              source={{ uri: game.imageUrl }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.coverImage,
                {
                  backgroundColor: "#e2e8f0",
                  justifyContent: "center",
                  alignItems: "center",
                },
              ]}
            >
              <Gamepad2 size={64} color="#94a3b8" />
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{game.name}</Text>
          <Text style={styles.category}>{categoriesText}</Text>

          <View style={styles.badgesContainer}>
            <View style={styles.badge}>
              <Users size={18} color="#c73636" />
              <Text style={styles.badgeText}>
                {game.minPlayers} a {game.maxPlayers} Jogadores
              </Text>
            </View>
            <View style={styles.badge}>
              <Gamepad2 size={18} color="#10b981" />
              <Text style={styles.badgeText}>Disponível no Acervo</Text>
            </View>
          </View>

          {game.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sobre o Jogo</Text>
              <Text style={styles.description}>{game.description}</Text>
            </View>
          )}

          {videoUrl && (
            <View style={styles.section}>
              <View style={styles.videoHeader}>
                <PlayCircle size={24} color="#c73636" />
                <Text style={styles.sectionTitle}>Como Jogar (Tutorial)</Text>
              </View>
              <View style={styles.videoContainer}>
                <GameVideoPlayer videoUrl={videoUrl} />
              </View>
            </View>
          )}
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#faf6f1" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#faf6f1",
  },
  headerImageContainer: { width: width, height: 350, position: "relative" },
  coverImage: { width: "100%", height: "100%" },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 8,
  },
  content: {
    padding: 20,
    backgroundColor: "#faf6f1",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    zIndex: 5,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 4,
  },
  category: {
    fontSize: 16,
    color: "#64748b",
    fontWeight: "600",
    marginBottom: 20,
  },
  badgesContainer: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 25,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  badgeText: { fontSize: 14, fontWeight: "bold", color: "#475569" },
  section: { marginTop: 10, marginBottom: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 10,
  },
  description: { fontSize: 15, color: "#475569", lineHeight: 24 },
  videoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 15,
  },
  videoContainer: {
    width: "100%",
    height: 220,
    backgroundColor: "#000",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
  },
  videoPlayer: { width: "100%", height: "100%" },
});
