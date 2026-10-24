import React from "react";
import { View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { AccentName, foregroundOn, radius, stroke } from "../../theme/tokens";

export interface IconBoxProps {
  icon: LucideIcon;
  tone: AccentName;
  size?: number;
  round?: boolean;
  testID?: string;
}

export function IconBox({ icon: Icon, tone, size = 36, round = false, testID }: IconBoxProps) {
  const { colors } = useTheme();
  return (
    <View
      testID={testID}
      style={{
        width: size,
        height: size,
        borderRadius: round ? size / 2 : radius.icon,
        borderWidth: stroke.regular,
        borderColor: colors.line,
        backgroundColor: colors[tone],
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon size={Math.round(size * 0.5)} color={foregroundOn(tone, colors)} strokeWidth={2.4} />
    </View>
  );
}
