import React from "react";
import { View } from "react-native";
import { Character } from "./Character";
import { Skeleton } from "./Skeleton";
import { MipoText } from "./Text";

export interface LoadingStateProps {
  label?: string;
  skeletons?: number;
  testID?: string;
}

export function LoadingState({ label = "Embaralhando as cartas...", skeletons = 3, testID }: LoadingStateProps) {
  return (
    <View testID={testID} accessible accessibilityLabel={label} accessibilityState={{ busy: true }} style={{ paddingTop: 20, gap: 12 }}>
      <View style={{ alignItems: "center", gap: 6 }}>
        <Character name="peao3" size={70} motion="spin" />
        <MipoText variant="cardTitle">{label}</MipoText>
      </View>
      {Array.from({ length: skeletons }, (_, index) => (
        <Skeleton key={index} height={90} testID="skeleton" />
      ))}
    </View>
  );
}
