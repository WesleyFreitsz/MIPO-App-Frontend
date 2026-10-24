import React, { useEffect, useState } from "react";
import { Alert, Image, Modal, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Lock, Star, X } from "lucide-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";
import {
  BottomSheet,
  Button,
  Card,
  CardTone,
  Character,
  CharacterMotion,
  CharacterName,
  Chip,
  IconButton,
  MipoText,
  SCREEN_PADDING,
  SectionHeader,
  Skeleton,
} from "../../components/ui";
import { useTheme } from "../../theme/ThemeProvider";
import { foregroundOn, stroke } from "../../theme/tokens";

interface Raridade {
  id?: string;
  name: string;
  color?: string | null;
}

interface Conquista {
  id: string;
  title: string;
  icon?: string | null;
  description?: string | null;
  condition?: string | null;
  rarity?: Raridade | null;
  isObtained?: boolean;
  isHighlighted?: boolean;
  obtainedPercentage?: number | string | null;
}

interface RaridadeGroup {
  name: string;
  color: string | null;
  items: Conquista[];
}

interface Props {
  userId: string;
  isOwnProfile?: boolean;
  triggerOpenAll?: number;
}

const CARD_WIDTH = 84;
const LOCKED_OPACITY = 0.45;
const TROFEUS: CharacterName[] = ["trofeu1", "trofeu2", "trofeu3", "trofeu4", "trofeu5", "trofeu6"];
const DEFAULT_RARIDADE_NAME = "Padrão";

const RARIDADE_TONES: Record<string, CardTone> = {
  comum: "neutral",
  common: "neutral",
  rara: "teal",
  raro: "teal",
  rare: "teal",
  epica: "lime",
  epico: "lime",
  epic: "lime",
  lendaria: "pink",
  lendario: "pink",
  legendary: "pink",
};

function normalizeRaridadeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

function raridadeTone(raridade: Raridade | null | undefined): CardTone {
  if (!raridade?.name) return "neutral";
  return RARIDADE_TONES[normalizeRaridadeName(raridade.name)] ?? "neutral";
}

function characterFor(conquista: Conquista, index: number): CharacterName {
  return conquista.condition ? TROFEUS[index % TROFEUS.length] : "pocao1";
}

function groupByRaridade(conquistas: Conquista[]): RaridadeGroup[] {
  const groups = new Map<string, RaridadeGroup>();
  conquistas.forEach((conquista) => {
    const name = conquista.rarity?.name || DEFAULT_RARIDADE_NAME;
    const group = groups.get(name) ?? { name, color: conquista.rarity?.color ?? null, items: [] };
    group.items.push(conquista);
    groups.set(name, group);
  });
  return Array.from(groups.values());
}

function RaridadeDot({ color }: { color: string | null | undefined }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: stroke.thin,
        borderColor: colors.line,
        backgroundColor: color || colors.muted,
      }}
    />
  );
}

interface ConquistaCardProps {
  conquista: Conquista;
  character: CharacterName;
  motion: CharacterMotion;
  dimmed: boolean;
  onPress: () => void;
}

function ConquistaCard({ conquista, character, motion, dimmed, onPress }: ConquistaCardProps) {
  const { colors } = useTheme();
  const tone = raridadeTone(conquista.rarity);
  const foreground = tone === "neutral" ? colors.text : foregroundOn(tone, colors);

  return (
    <View style={{ width: CARD_WIDTH, opacity: dimmed ? LOCKED_OPACITY : 1 }}>
      <Card
        tone={tone}
        onPress={onPress}
        accessibilityLabel={dimmed ? `${conquista.title}, bloqueada` : conquista.title}
        contentStyle={{ alignItems: "center", paddingHorizontal: 6, paddingVertical: 8, minHeight: 112 }}
      >
        {conquista.rarity?.color ? (
          <View style={{ position: "absolute", top: 7, right: 7 }}>
            <RaridadeDot color={conquista.rarity.color} />
          </View>
        ) : null}
        <Character name={character} size={50} motion={motion} />
        <MipoText variant="micro" numberOfLines={2} style={{ color: foreground, textAlign: "center", marginTop: 4 }}>
          {conquista.title}
        </MipoText>
      </Card>
    </View>
  );
}

export default function AchievementsHighlights({ userId, isOwnProfile = false, triggerOpenAll }: Props) {
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [showAllModal, setShowAllModal] = useState(false);
  const [selectedAch, setSelectedAch] = useState<Conquista | null>(null);

  useEffect(() => {
    if (triggerOpenAll) {
      setShowAllModal(true);
    }
  }, [triggerOpenAll]);

  const { data: achievements = [], isLoading } = useQuery<Conquista[]>({
    queryKey: ["achievements", userId],
    queryFn: async () => (await api.get(`/achievements?userId=${userId}`)).data,
  });

  const setHighlightsMutation = useMutation({
    mutationFn: (achievementIds: string[]) => api.post("/achievements/highlights", { achievementIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achievements", userId] });
      setSelectedAch(null);
    },
    onError: () => Alert.alert("Erro", "Você só pode destacar até 3 conquistas."),
  });

  const obtainedAch = achievements.filter((a) => a.isObtained);
  const highlightedAch = obtainedAch.filter((a) => a.isHighlighted);
  const displayHighlights = highlightedAch.length > 0 ? highlightedAch : obtainedAch.slice(0, 3);
  const groupedAchievements = groupByRaridade(achievements);
  const characterIndex = new Map(achievements.map((a, index) => [a.id, index]));
  const characterOf = (conquista: Conquista) => characterFor(conquista, characterIndex.get(conquista.id) ?? 0);

  const handleToggleHighlight = (achId: string) => {
    const currentHighlights = highlightedAch.map((a) => a.id);
    let newHighlights: string[];

    if (currentHighlights.includes(achId)) {
      newHighlights = currentHighlights.filter((id) => id !== achId);
    } else {
      if (currentHighlights.length >= 3) {
        Alert.alert("Limite atingido", "Você só pode destacar 3 conquistas.");
        return;
      }
      newHighlights = [...currentHighlights, achId];
    }
    setHighlightsMutation.mutate(newHighlights);
  };

  if (isLoading) {
    return (
      <View>
        <SectionHeader title="Conquistas" />
        <View style={{ flexDirection: "row", gap: 10 }}>
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} height={112} style={{ width: CARD_WIDTH }} />
          ))}
        </View>
      </View>
    );
  }

  const isSelectedHighlighted = selectedAch ? highlightedAch.some((a) => a.id === selectedAch.id) : false;
  const selectedTone = raridadeTone(selectedAch?.rarity);
  const selectedDescription =
    selectedAch?.description || (selectedAch?.condition ? `Condição: ${selectedAch.condition}` : "Sem descrição");

  return (
    <View>
      <SectionHeader
        title="Conquistas"
        action={achievements.length > 0 ? { label: "Ver todas", accessibilityLabel: "Ver todas as conquistas", onPress: () => setShowAllModal(true) } : undefined}
      />

      {displayHighlights.length === 0 ? (
        <MipoText variant="caption">Nenhuma conquista desbloqueada ainda.</MipoText>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -SCREEN_PADDING }}
          contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: 6, gap: 10 }}
        >
          {displayHighlights.map((ach, index) => (
            <ConquistaCard
              key={ach.id}
              conquista={ach}
              character={characterOf(ach)}
              motion={index === 0 ? "wiggle" : "none"}
              dimmed={!ach.isObtained}
              onPress={() => setSelectedAch(ach)}
            />
          ))}
        </ScrollView>
      )}

      <BottomSheet visible={selectedAch !== null} onClose={() => setSelectedAch(null)}>
        {selectedAch ? (
          <View style={{ alignItems: "center", gap: 8 }}>
            <View style={{ position: "absolute", top: 0, right: 0 }}>
              <IconButton icon={X} size={34} accessibilityLabel="Fechar" onPress={() => setSelectedAch(null)} />
            </View>
            <Card tone={selectedTone} contentStyle={{ alignItems: "center", justifyContent: "center", width: 112, height: 112, padding: 6 }}>
              <View style={{ opacity: selectedAch.isObtained ? 1 : LOCKED_OPACITY }}>
                {selectedAch.icon ? (
                  <Image
                    source={{ uri: selectedAch.icon }}
                    blurRadius={selectedAch.isObtained ? 0 : 5}
                    style={{ width: 84, height: 84, borderRadius: 14 }}
                  />
                ) : (
                  <Character name={characterOf(selectedAch)} size={84} motion={selectedAch.isObtained ? "wiggle" : "none"} />
                )}
              </View>
            </Card>

            <MipoText variant="screenTitle" style={{ fontSize: 22, textAlign: "center", marginTop: 6 }}>
              {selectedAch.title}
            </MipoText>

            {selectedAch.rarity ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <RaridadeDot color={selectedAch.rarity.color} />
                <Chip label={selectedAch.rarity.name} tone={selectedTone} />
              </View>
            ) : null}

            <MipoText variant="body" color="muted" style={{ textAlign: "center" }}>
              {selectedDescription}
            </MipoText>

            <Card flat style={{ alignSelf: "stretch" }} contentStyle={{ alignItems: "center", backgroundColor: colors.surface2 }}>
              <MipoText variant="caption">
                <MipoText variant="bodyBold">{`${Number(selectedAch.obtainedPercentage || 0).toFixed(1)}%`}</MipoText>
                {" dos usuários têm essa conquista"}
              </MipoText>
            </Card>

            {isOwnProfile && selectedAch.isObtained ? (
              <Button
                label={isSelectedHighlighted ? "Remover dos destaques" : "Destacar no perfil"}
                icon={Star}
                variant="red"
                block
                loading={setHighlightsMutation.isPending}
                onPress={() => handleToggleHighlight(selectedAch.id)}
                style={{ marginTop: 4 }}
              />
            ) : null}

            {!selectedAch.isObtained ? <Chip label="Conquista bloqueada" tone="dark" icon={Lock} style={{ alignSelf: "center", marginTop: 4 }} /> : null}
          </View>
        ) : null}
      </BottomSheet>

      <Modal visible={showAllModal} animationType="slide" onRequestClose={() => setShowAllModal(false)}>
        <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10 }}>
            <IconButton icon={X} accessibilityLabel="Fechar" onPress={() => setShowAllModal(false)} />
            <MipoText variant="screenTitle" accessibilityRole="header" style={{ flex: 1, fontSize: 22 }}>
              Todas as conquistas
            </MipoText>
            <Chip label={`${obtainedAch.length}/${achievements.length}`} tone="yellow" />
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
            {groupedAchievements.map((group) => (
              <View key={group.name} style={{ marginTop: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <RaridadeDot color={group.color} />
                  <MipoText variant="section" accessibilityRole="header">
                    {group.name}
                  </MipoText>
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                  {group.items.map((ach) => (
                    <ConquistaCard
                      key={ach.id}
                      conquista={ach}
                      character={characterOf(ach)}
                      motion="none"
                      dimmed={!ach.isObtained}
                      onPress={() => {
                        setShowAllModal(false);
                        setSelectedAch(ach);
                      }}
                    />
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
