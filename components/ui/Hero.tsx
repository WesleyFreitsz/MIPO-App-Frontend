import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { AccentName, radius, stroke } from "../../theme/tokens";
import { SCREEN_PADDING } from "./Screen";

export interface HeroProps {
  children: React.ReactNode;
  tone?: "hero" | AccentName;
  paddingTop?: number;
  style?: StyleProp<ViewStyle>;
}

export function Hero({ children, tone = "hero", paddingTop = 0, style }: HeroProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          marginHorizontal: -SCREEN_PADDING,
          paddingHorizontal: SCREEN_PADDING,
          paddingTop,
          paddingBottom: 18,
          backgroundColor: colors[tone],
          borderBottomWidth: stroke.thick,
          borderColor: colors.line,
          borderBottomLeftRadius: radius.sheet,
          borderBottomRightRadius: radius.sheet,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
