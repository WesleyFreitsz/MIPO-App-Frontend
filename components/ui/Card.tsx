import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { StickerPressable } from "../../motion/StickerPressable";
import { useTheme } from "../../theme/ThemeProvider";
import { AccentName, offset, radius, stroke } from "../../theme/tokens";

export type CardTone = "neutral" | AccentName;

export interface CardProps {
  tone?: CardTone;
  flat?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

export function Card({ tone = "neutral", flat = false, style, contentStyle, children, onPress, accessibilityLabel, testID }: CardProps) {
  const { colors, scheme } = useTheme();
  const faceStyle: ViewStyle = {
    backgroundColor: tone === "neutral" ? colors.surface : colors[tone],
    borderWidth: stroke.regular,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: 12,
    ...(scheme === "dark" && tone === "neutral" ? { borderTopColor: colors.surface2 } : null),
  };

  if (onPress) {
    return (
      <StickerPressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        radius={radius.card}
        shadowOffset={flat ? 0 : offset.card}
        style={style}
        faceStyle={[faceStyle, contentStyle]}
      >
        {children}
      </StickerPressable>
    );
  }

  return (
    <View testID={testID} style={style}>
      {flat ? null : (
        <View
          testID={testID ? `${testID}-shadow` : undefined}
          pointerEvents="none"
          style={{
            position: "absolute",
            top: offset.card,
            left: offset.card,
            right: -offset.card,
            bottom: -offset.card,
            borderRadius: radius.card,
            backgroundColor: colors.shadow,
          }}
        />
      )}
      <View testID={testID ? `${testID}-face` : undefined} style={[faceStyle, contentStyle]}>
        {children}
      </View>
    </View>
  );
}
