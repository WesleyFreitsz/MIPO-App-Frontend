import React from "react";
import { View } from "react-native";
import { RotateCcw } from "lucide-react-native";
import { Button } from "./Button";
import { Character } from "./Character";
import { MipoText } from "./Text";

export const DEFAULT_ERROR_MESSAGE = "Não conseguimos falar com a Mipo agora. Confere sua internet e tenta de novo.";

export function ErrorState({ onRetry, message = DEFAULT_ERROR_MESSAGE }: { onRetry: () => void; message?: string }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 32, paddingHorizontal: 24, gap: 6 }}>
      <Character name="peao13" size={140} />
      <MipoText variant="screenTitle" style={{ textAlign: "center" }}>
        Ops, caiu uma peça!
      </MipoText>
      <MipoText variant="caption" style={{ textAlign: "center" }}>
        {message}
      </MipoText>
      <Button label="Tentar de novo" icon={RotateCcw} variant="red" onPress={onRetry} style={{ alignSelf: "center", marginTop: 12 }} />
    </View>
  );
}
