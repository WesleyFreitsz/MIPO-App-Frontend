import React, { useEffect, useState } from "react";
import { Image, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Send, Trash2 } from "lucide-react-native";
import { api } from "../../services/api";
import { UploadError, uploadMedia } from "../../services/uploads";
import { BottomSheet, Button, Chip, FieldLabel, IconButton, Input, MipoText, showAlert } from "../../components/ui";
import { radius, stroke } from "../../theme/tokens";
import { useTheme } from "../../theme/ThemeProvider";
import { MonthlyGame } from "./monthlyGameTypes";

interface SubmitScoreSheetProps {
  visible: boolean;
  onClose: () => void;
  monthlyGames: MonthlyGame[];
  initialMonthlyGameId?: string;
}

export function SubmitScoreSheet({ visible, onClose, monthlyGames, initialMonthlyGameId }: SubmitScoreSheetProps) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [monthlyGameId, setMonthlyGameId] = useState<string | undefined>(initialMonthlyGameId);
  const [score, setScore] = useState("");
  const [note, setNote] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setMonthlyGameId(initialMonthlyGameId ?? monthlyGames[0]?.id);
      setScore("");
      setNote("");
      setPhotoUri(null);
    }
  }, [visible, initialMonthlyGameId, monthlyGames]);

  const submit = useMutation({
    mutationFn: async () => {
      const proofImageUrl = photoUri ? await uploadMedia({ uri: photoUri }, "/uploads/chat-content") : undefined;
      return api.post(`/monthly-games/${monthlyGameId}/scores`, {
        score: Number(score),
        note: note.trim() || undefined,
        proofImageUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthlyGames", "myScores"] });
      onClose();
      showAlert("Partida enviada!", "Assim que um admin aprovar, sua pontuação entra no ranking.");
    },
    onError: (error) => {
      showAlert("Erro", error instanceof UploadError ? error.message : "Não foi possível enviar a partida.");
    },
  });

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.5 });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const scoreValid = /^\d{1,7}$/.test(score);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <MipoText variant="section">Enviar partida</MipoText>
      <MipoText variant="caption" style={{ marginTop: 4 }}>
        Um admin confere e aprova antes de entrar no ranking.
      </MipoText>

      <FieldLabel>Jogo</FieldLabel>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {monthlyGames.map((monthlyGame) => (
          <Chip
            key={monthlyGame.id}
            label={monthlyGame.game.name}
            size="md"
            tone={monthlyGameId === monthlyGame.id ? "active" : "neutral"}
            selected={monthlyGameId === monthlyGame.id}
            onPress={() => setMonthlyGameId(monthlyGame.id)}
          />
        ))}
      </View>

      <FieldLabel>Pontuação</FieldLabel>
      <Input placeholder="Ex: 87" keyboardType="number-pad" value={score} onChangeText={setScore} maxLength={7} accessibilityLabel="Pontuação" />

      <FieldLabel>Observação (opcional)</FieldLabel>
      <Input placeholder="Com quem jogou, mesa, etc." value={note} onChangeText={setNote} maxLength={500} multiline />

      <FieldLabel>Foto da partida (opcional)</FieldLabel>
      {photoUri ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Image
            source={{ uri: photoUri }}
            style={{ width: 72, height: 72, borderRadius: radius.icon, borderWidth: stroke.thin, borderColor: colors.line }}
            accessibilityLabel="Foto da partida"
          />
          <IconButton icon={Trash2} accessibilityLabel="Remover foto" onPress={() => setPhotoUri(null)} />
        </View>
      ) : (
        <Button label="Escolher foto" icon={Camera} variant="ghost" size="sm" onPress={pickPhoto} />
      )}

      <Button
        label="Enviar para aprovação"
        icon={Send}
        variant="lime"
        block
        style={{ marginTop: 18 }}
        loading={submit.isPending}
        disabled={!monthlyGameId || !scoreValid || submit.isPending}
        onPress={() => submit.mutate()}
      />
    </BottomSheet>
  );
}
