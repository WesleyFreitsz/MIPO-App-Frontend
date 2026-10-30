import React from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { MessageCircle } from "lucide-react-native";
import { AvatarStack, Button, Card, Chip, MipoText, showAlert } from "../../components/ui";
import { displayName } from "./storeTypes";
import { PlayCall, apiErrorMessage, formatPlayCallTime, usePlayCallActions } from "./playCallsApi";

export function PlayCallCard({ call, highlighted = false }: { call: PlayCall; highlighted?: boolean }) {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { join, leave, close } = usePlayCallActions();
  const players = [call.creator, ...call.members];
  const openSlots = Math.max(call.slotsNeeded - call.members.length, 0);
  const busy = join.isPending || leave.isPending || close.isPending;

  const onError = (fallback: string) => (error: unknown) => showAlert("Erro", apiErrorMessage(error, fallback));

  const openChat = () =>
    call.chatId && navigation.navigate("ChatDetail", { chatId: call.chatId, name: call.title, type: "GROUP" });

  const confirmClose = () =>
    showAlert("Encerrar chamado?", "Ele some da lista para todo mundo.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Encerrar", style: "destructive", onPress: () => close.mutate(call.id, { onError: onError("Não foi possível encerrar.") }) },
    ]);

  return (
    <Card tone={highlighted ? "yellow" : "neutral"}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <MipoText variant="cardTitle" numberOfLines={2}>
            {call.title}
          </MipoText>
          <MipoText variant="caption" style={{ marginTop: 2 }}>
            {`${formatPlayCallTime(call)} · por ${displayName(call.creator)}`}
          </MipoText>
        </View>
        <Chip
          label={call.status === "FULL" ? "Lotado" : openSlots === 1 ? "Falta 1" : `Faltam ${openSlots}`}
          tone={call.status === "FULL" ? "neutral" : "lime"}
        />
      </View>
      {call.note ? (
        <MipoText variant="body" style={{ marginTop: 8 }}>
          {call.note}
        </MipoText>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
        <AvatarStack people={players.map((p) => ({ id: p.id, name: p.name, uri: p.avatarUrl }))} max={6} />
        <MipoText variant="micro">{`${players.length} na mesa`}</MipoText>
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        {call.isCreator ? (
          <Button label="Encerrar" variant="ghost" size="sm" loading={close.isPending} disabled={busy} onPress={confirmClose} />
        ) : call.isMember ? (
          <Button
            label="Sair"
            variant="ghost"
            size="sm"
            loading={leave.isPending}
            disabled={busy}
            onPress={() => leave.mutate(call.id, { onError: onError("Não foi possível sair.") })}
          />
        ) : (
          <Button
            label="Quero jogar"
            variant="teal"
            size="sm"
            loading={join.isPending}
            disabled={busy || call.status !== "OPEN"}
            onPress={() => join.mutate(call.id, { onError: onError("Não foi possível entrar.") })}
          />
        )}
        {call.chatId ? <Button label="Chat da mesa" icon={MessageCircle} variant="ghost" size="sm" onPress={openChat} /> : null}
      </View>
    </Card>
  );
}
