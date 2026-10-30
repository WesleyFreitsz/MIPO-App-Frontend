import React, { useEffect, useState } from "react";
import { Platform, ScrollView, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, Minus, Plus } from "lucide-react-native";
import { BottomSheet, Button, Chip, FieldLabel, IconButton, Input, MipoText, SegmentedControl, showAlert } from "../../components/ui";
import { api } from "../../services/api";
import { Jogo } from "../../types";
import { PlayCallMode, apiErrorMessage, usePlayCallActions } from "./playCallsApi";

const MAX_SLOTS = 20;
const HOUR_MS = 60 * 60 * 1000;

interface CreatePlayCallSheetProps {
  visible: boolean;
  onClose: () => void;
  canPlayNow: boolean;
  initialMode?: PlayCallMode;
}

function nextFullHour() {
  const date = new Date(Date.now() + HOUR_MS);
  date.setMinutes(0, 0, 0);
  return date;
}

export function CreatePlayCallSheet({ visible, onClose, canPlayNow, initialMode = "NOW" }: CreatePlayCallSheetProps) {
  const { create } = usePlayCallActions();
  const [mode, setMode] = useState<PlayCallMode>(initialMode);
  const [gameId, setGameId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [slots, setSlots] = useState(2);
  const [note, setNote] = useState("");
  const [scheduledFor, setScheduledFor] = useState(nextFullHour);
  const [picker, setPicker] = useState<"date" | "time" | null>(null);

  const gamesQuery = useQuery<Jogo[]>({
    queryKey: ["allGamesCategories"],
    queryFn: async () => (await api.get<Jogo[]>("/games")).data,
    enabled: visible,
  });

  useEffect(() => {
    if (!visible) return;
    setMode(canPlayNow ? initialMode : "SCHEDULED");
    setGameId(null);
    setTitle("");
    setSlots(2);
    setNote("");
    setScheduledFor(nextFullHour());
  }, [visible, canPlayNow, initialMode]);

  const onPickDate = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setPicker(null);
    if (selected) setScheduledFor(selected);
  };

  const valid = (gameId !== null || title.trim().length >= 2) && (mode === "NOW" || scheduledFor.getTime() > Date.now());

  const submit = () =>
    create.mutate(
      {
        mode,
        gameId: gameId ?? undefined,
        title: title.trim() || undefined,
        scheduledFor: mode === "SCHEDULED" ? scheduledFor.toISOString() : undefined,
        slotsNeeded: slots,
        note: note.trim() || undefined,
      },
      {
        onSuccess: onClose,
        onError: (error) => showAlert("Erro", apiErrorMessage(error, "Não foi possível criar o chamado.")),
      },
    );

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <MipoText variant="section">Procurar jogadores</MipoText>
      {canPlayNow ? (
        <SegmentedControl<PlayCallMode>
          options={[
            { value: "NOW", label: "Agora" },
            { value: "SCHEDULED", label: "Agendar" },
          ]}
          value={mode}
          onChange={setMode}
        />
      ) : (
        <MipoText variant="caption" style={{ marginTop: 4 }}>
          Para chamar gente agora, faça check-in na loja. Fora dela você pode agendar.
        </MipoText>
      )}

      <FieldLabel>Jogo</FieldLabel>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {(gamesQuery.data ?? []).map((game) => (
          <Chip
            key={game.id}
            label={game.name}
            selected={gameId === game.id}
            onPress={() => setGameId(gameId === game.id ? null : game.id)}
          />
        ))}
      </ScrollView>
      <Input
        value={title}
        onChangeText={setTitle}
        placeholder={gameId ? "Título (opcional)" : "Ou descreva: ex. qualquer jogo leve"}
        maxLength={120}
        containerStyle={{ marginTop: 8 }}
      />

      <FieldLabel>Quantas pessoas faltam</FieldLabel>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <IconButton icon={Minus} accessibilityLabel="Menos uma vaga" onPress={() => setSlots((s) => Math.max(1, s - 1))} />
        <MipoText variant="cardTitle" accessibilityLiveRegion="polite">
          {slots}
        </MipoText>
        <IconButton icon={Plus} accessibilityLabel="Mais uma vaga" onPress={() => setSlots((s) => Math.min(MAX_SLOTS, s + 1))} />
      </View>

      {mode === "SCHEDULED" ? (
        <>
          <FieldLabel>Quando</FieldLabel>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button
              label={scheduledFor.toLocaleDateString("pt-BR")}
              icon={Calendar}
              variant="ghost"
              size="sm"
              accessibilityLabel="Escolher data"
              onPress={() => setPicker("date")}
              style={{ flex: 1 }}
            />
            <Button
              label={scheduledFor.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              icon={Clock}
              variant="ghost"
              size="sm"
              accessibilityLabel="Escolher horário"
              onPress={() => setPicker("time")}
              style={{ flex: 1 }}
            />
          </View>
          {picker ? <DateTimePicker value={scheduledFor} mode={picker} is24Hour minimumDate={new Date()} onChange={onPickDate} /> : null}
        </>
      ) : null}

      <FieldLabel>Observação</FieldLabel>
      <Input value={note} onChangeText={setNote} placeholder="Ex.: mesa 4, ensino as regras" maxLength={500} multiline />

      <Button label="Publicar chamado" block loading={create.isPending} disabled={!valid} onPress={submit} style={{ marginTop: 16 }} />
    </BottomSheet>
  );
}
