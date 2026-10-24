import React from "react";
import { Pressable, View } from "react-native";
import { MipoText } from "./Text";

export interface SectionHeaderProps {
  title: string;
  action?: { label: string; accessibilityLabel?: string; onPress: () => void };
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 18, marginBottom: 10 }}>
      <MipoText variant="section" accessibilityRole="header">
        {title}
      </MipoText>
      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.accessibilityLabel ?? action.label}
          onPress={action.onPress}
          hitSlop={12}
        >
          <MipoText variant="micro" color="pink" style={{ fontSize: 12 }}>
            {action.label}
          </MipoText>
        </Pressable>
      ) : null}
    </View>
  );
}
