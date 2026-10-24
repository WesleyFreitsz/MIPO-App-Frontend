import React from "react";
import { Pressable, View } from "react-native";
import { haptic } from "../../motion/haptics";
import { useTheme } from "../../theme/ThemeProvider";
import { stroke } from "../../theme/tokens";
import { MipoText } from "./Text";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: "row",
        backgroundColor: colors.sunken,
        borderWidth: stroke.regular,
        borderColor: colors.line,
        borderRadius: 16,
        padding: 3,
        gap: 3,
      }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (active) return;
              haptic.select();
              onChange(option.value);
            }}
            style={{
              flex: 1,
              minHeight: 36,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 11,
              borderWidth: active ? stroke.thin : 0,
              borderColor: colors.line,
              backgroundColor: active ? colors.yellow : "transparent",
            }}
          >
            <MipoText variant="button" style={{ fontSize: 13, color: active ? colors.onColor : colors.muted }}>
              {option.label}
            </MipoText>
          </Pressable>
        );
      })}
    </View>
  );
}
