import React from "react";
import { View } from "react-native";
import { Button } from "./Button";
import { Character, CharacterMotion } from "./Character";
import { CharacterName } from "./characters";
import { MipoText } from "./Text";

export interface EmptyStateProps {
  character: CharacterName;
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
  motion?: CharacterMotion;
}

export function EmptyState({ character, title, message, action, motion = "idle" }: EmptyStateProps) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 32, paddingHorizontal: 20, gap: 6 }}>
      <Character name={character} size={140} motion={motion} />
      <MipoText variant="section" style={{ fontSize: 22, lineHeight: 27, textAlign: "center", marginTop: 6 }}>
        {title}
      </MipoText>
      {message ? (
        <MipoText variant="caption" style={{ textAlign: "center" }}>
          {message}
        </MipoText>
      ) : null}
      {action ? <Button label={action.label} onPress={action.onPress} style={{ alignSelf: "center", marginTop: 12 }} /> : null}
    </View>
  );
}
