import React from "react";
import type { LucideIcon } from "lucide-react-native";
import { StickerPressable } from "../../motion/StickerPressable";
import { useTheme } from "../../theme/ThemeProvider";
import { AccentName, foregroundOn, stroke } from "../../theme/tokens";

export interface IconButtonProps {
  icon: LucideIcon;
  accessibilityLabel: string;
  onPress: () => void;
  tone?: "neutral" | AccentName;
  size?: number;
  disabled?: boolean;
  testID?: string;
}

export function IconButton({ icon: Icon, accessibilityLabel, onPress, tone = "neutral", size = 38, disabled = false, testID }: IconButtonProps) {
  const { colors } = useTheme();
  const background = tone === "neutral" ? colors.surface : colors[tone];
  const foreground = tone === "neutral" ? colors.text : foregroundOn(tone, colors);
  return (
    <StickerPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      radius={size / 2}
      shadowOffset={2}
      hitSlop={Math.max(0, (44 - size) / 2)}
      faceStyle={{
        width: size,
        height: size,
        borderWidth: stroke.regular,
        borderColor: colors.line,
        backgroundColor: background,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Icon size={Math.round(size * 0.47)} color={foreground} strokeWidth={2.5} />
    </StickerPressable>
  );
}
