import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Dices } from "lucide-react-native";
import { api } from "../../services/api";
import { BottomSheet, Button, Chip, FieldLabel, Input, MipoText, showAlert } from "../../components/ui";
import { PlayUser } from "./gamePlayTypes";

interface RegisterPlaySheetProps {
  visible: boolean;
  onClose: () => void;
  gameId: string;
  gameName: string;
}

type PlayDay = "today" | "yesterday";

const DAY_MS = 24 * 60 * 60 * 1000;

export function RegisterPlaySheet({ visible, onClose, gameId, gameName }: RegisterPlaySheetProps) {
  const queryClient = useQueryClient();
  const [day, setDay] = useState<PlayDay>("today");
  const [playerIds, setPlayerIds] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const { data: friendsData } = useQuery<{ data: PlayUser[] }>({
    queryKey: ["friends", "list"],
    queryFn: async () => (await api.get("/friends", { params: { skip: 0, take: 100 } })).data,
    enabled: visible,
  });
  const friends = friendsData?.data ?? [];

  useEffect(() => {
    if (visible) {
      setDay("today");
      setPlayerIds([]);
      setNote("");
    }
  }, [visible]);

  const register = useMutation({
    mutationFn: () =>
      api.post(`/game-plays/games/${gameId}`, {
        playedAt: new Date(Date.now() - (day === "yesterday" ? DAY_MS : 0)).toISOString(),
        playerIds,
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gamePlays"] });
      onClose();
      showAlert("Partida registrada!", "Ela já aparece no seu histórico de jogos.");
    },
    onError: () => showAlert("Erro", "Não foi possível registrar a partida."),
  });

  const togglePlayer = (id: string) => setPlayerIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <MipoText variant="section">Registrar partida</MipoText>
      <MipoText variant="caption" style={{ marginTop: 4 }}>
        {`Conta pra gente que você jogou ${gameName}.`}
      </MipoText>

      <FieldLabel>Quando</FieldLabel>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Chip label="Hoje" size="md" tone={day === "today" ? "active" : "neutral"} selected={day === "today"} onPress={() => setDay("today")} />
        <Chip label="Ontem" size="md" tone={day === "yesterday" ? "active" : "neutral"} selected={day === "yesterday"} onPress={() => setDay("yesterday")} />
      </View>

      <FieldLabel>Quem jogou com você (opcional)</FieldLabel>
      {friends.length === 0 ? (
        <MipoText variant="caption">Adicione amigos para marcar quem jogou junto.</MipoText>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {friends.map((friend) => {
            const selected = playerIds.includes(friend.id);
            return (
              <Chip
                key={friend.id}
                label={friend.nickname || friend.name}
                icon={selected ? Check : undefined}
                size="md"
                tone={selected ? "teal" : "neutral"}
                selected={selected}
                onPress={() => togglePlayer(friend.id)}
              />
            );
          })}
        </View>
      )}

      <FieldLabel>Observação (opcional)</FieldLabel>
      <Input placeholder="Quem ganhou, como foi..." value={note} onChangeText={setNote} maxLength={500} multiline />

      <Button
        label="Registrar"
        icon={Dices}
        variant="lime"
        block
        style={{ marginTop: 18 }}
        loading={register.isPending}
        disabled={register.isPending}
        onPress={() => register.mutate()}
      />
    </BottomSheet>
  );
}
