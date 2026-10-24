import React from "react";
import { ActivityIndicator, StyleProp, View, ViewStyle } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { StickerPressable } from "../../motion/StickerPressable";
import { useTheme } from "../../theme/ThemeProvider";
import { AccentName, foregroundOn, radius, stroke } from "../../theme/tokens";
import { MipoText } from "./Text";

export type ButtonVariant = "yellow" | "red" | "pink" | "teal" | "lime" | "ghost";

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: "md" | "sm";
  block?: boolean;
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = "yellow",
  size = "md",
  block = false,
  icon: Icon,
  loading = false,
  disabled = false,
  accessibilityLabel,
  testID,
  style,
}: ButtonProps) {
  const { colors } = useTheme();
  const background = variant === "ghost" ? colors.surface : colors[variant as AccentName];
  const foreground = variant === "ghost" ? colors.text : foregroundOn(variant as AccentName, colors);
  const small = size === "sm";
  const inactive = disabled || loading;

  return (
    <StickerPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      radius={small ? 11 : radius.button}
      hitSlop={small ? 6 : undefined}
      style={[block ? { alignSelf: "stretch" } : { alignSelf: "flex-start" }, style]}
      faceStyle={{
        minHeight: small ? 34 : 44,
        paddingHorizontal: small ? 10 : 16,
        paddingVertical: small ? 6 : 10,
        borderWidth: stroke.regular,
        borderColor: colors.line,
        backgroundColor: background,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator testID={testID ? `${testID}-loading` : undefined} color={foreground} size="small" />
      ) : Icon ? (
        <Icon color={foreground} size={small ? 15 : 17} strokeWidth={2.4} />
      ) : null}
      {label ? (
        <View>
          <MipoText variant="button" style={{ color: foreground, fontSize: small ? 13 : 15 }}>
            {label}
          </MipoText>
        </View>
      ) : null}
    </StickerPressable>
  );
}
