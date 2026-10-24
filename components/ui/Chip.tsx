import React from "react";
import { Pressable, StyleProp, View, ViewStyle } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { haptic } from "../../motion/haptics";
import { useTheme } from "../../theme/ThemeProvider";
import { AccentName, Palette, foregroundOn, radius, stroke } from "../../theme/tokens";
import { MipoText } from "./Text";

export type ChipTone = "neutral" | "active" | "dark" | AccentName;

export interface ChipProps {
  label: string;
  tone?: ChipTone;
  icon?: LucideIcon;
  onPress?: () => void;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function chipColors(tone: ChipTone, colors: Palette) {
  if (tone === "neutral") return { background: colors.surface, foreground: colors.text };
  if (tone === "active") return { background: colors.text, foreground: colors.bg };
  if (tone === "dark") return { background: colors.tab, foreground: colors.tabText };
  return { background: colors[tone], foreground: foregroundOn(tone, colors) };
}

export function Chip({ label, tone = "neutral", icon: Icon, onPress, selected, style, testID }: ChipProps) {
  const { colors } = useTheme();
  const { background, foreground } = chipColors(tone, colors);
  const chipStyle: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.chip,
    borderWidth: stroke.thin,
    borderColor: tone === "dark" ? colors.tab : colors.line,
    backgroundColor: background,
  };
  const content = (
    <>
      {Icon ? <Icon color={foreground} size={12} strokeWidth={2.6} /> : null}
      <MipoText variant="micro" numberOfLines={1} style={{ color: foreground, fontSize: 11 }}>
        {label}
      </MipoText>
    </>
  );

  if (!onPress) {
    return (
      <View testID={testID} style={[chipStyle, style]}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: Boolean(selected) }}
      hitSlop={10}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      style={({ pressed }) => [chipStyle, { opacity: pressed ? 0.75 : 1 }, style]}
    >
      {content}
    </Pressable>
  );
}
