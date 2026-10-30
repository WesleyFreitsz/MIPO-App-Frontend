import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { HelpCircle } from "lucide-react-native";
import { BottomSheet, Button, Chip, FieldLabel, Input, MipoText } from "../../components/ui";
import type { TabWithOrders } from "./lojaTypes";

interface HelpCallSheetProps {
  visible: boolean;
  loading: boolean;
  tab: TabWithOrders | null | undefined;
  onClose: () => void;
  onSubmit: (data: { gameId?: string; note?: string }) => void;
}

function gamesAtTable(tab: TabWithOrders | null | undefined) {
  const games = new Map<string, string>();
  for (const order of tab?.orders ?? []) {
    if (order.status === "CANCELED") continue;
    for (const item of order.items) {
      if (item.kind === "GAME" && item.gameId) games.set(item.gameId, item.nameSnapshot);
    }
  }
  return [...games.entries()].map(([id, name]) => ({ id, name }));
}

export function HelpCallSheet({ visible, loading, tab, onClose, onSubmit }: HelpCallSheetProps) {
  const [gameId, setGameId] = useState<string | undefined>();
  const [note, setNote] = useState("");
  const games = gamesAtTable(tab);

  useEffect(() => {
    if (!visible) return;
    setGameId(undefined);
    setNote("");
  }, [visible]);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <MipoText variant="section">Chamar monitor</MipoText>
      <MipoText variant="caption" style={{ marginTop: 4 }}>
        Alguém da equipe vai até a sua mesa para explicar as regras ou ajudar com o jogo.
      </MipoText>
      {games.length > 0 ? (
        <View style={{ marginTop: 14 }}>
          <FieldLabel>Qual jogo?</FieldLabel>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {games.map((game) => (
              <Chip
                key={game.id}
                label={game.name}
                size="md"
                selected={gameId === game.id}
                tone={gameId === game.id ? "active" : "neutral"}
                onPress={() => setGameId(gameId === game.id ? undefined : game.id)}
              />
            ))}
          </View>
        </View>
      ) : null}
      <View style={{ marginTop: 14 }}>
        <FieldLabel>Qual a dúvida? (opcional)</FieldLabel>
        <Input value={note} onChangeText={setNote} placeholder="Ex.: como funciona a pontuação?" maxLength={200} multiline />
      </View>
      <Button
        label="Chamar monitor"
        icon={HelpCircle}
        block
        loading={loading}
        onPress={() => onSubmit({ gameId, note: note.trim() || undefined })}
        style={{ marginTop: 16 }}
      />
    </BottomSheet>
  );
}
