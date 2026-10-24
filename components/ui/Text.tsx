import React from "react";
import { Text, TextProps, TextStyle } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { ColorName, fontFamily, typeScale } from "../../theme/tokens";

export type TextVariant =
  | "hero"
  | "screenTitle"
  | "section"
  | "cardTitle"
  | "body"
  | "bodyBold"
  | "caption"
  | "micro"
  | "label"
  | "button";

const variants: Record<TextVariant, TextStyle & { defaultColor: ColorName }> = {
  hero: { fontFamily: fontFamily.display, fontSize: typeScale.hero, lineHeight: 34, defaultColor: "text" },
  screenTitle: { fontFamily: fontFamily.display, fontSize: typeScale.screenTitle, lineHeight: 30, defaultColor: "text" },
  section: { fontFamily: fontFamily.displaySemi, fontSize: typeScale.section, lineHeight: 23, defaultColor: "text" },
  cardTitle: { fontFamily: fontFamily.displaySemi, fontSize: typeScale.cardTitle, lineHeight: 21, defaultColor: "text" },
  body: { fontFamily: fontFamily.body, fontSize: typeScale.body, lineHeight: 19, defaultColor: "text" },
  bodyBold: { fontFamily: fontFamily.bodyBold, fontSize: typeScale.body, lineHeight: 19, defaultColor: "text" },
  caption: { fontFamily: fontFamily.bodyBold, fontSize: typeScale.caption, lineHeight: 17, defaultColor: "muted" },
  micro: { fontFamily: fontFamily.bodyHeavy, fontSize: typeScale.micro, lineHeight: 14, defaultColor: "muted" },
  label: {
    fontFamily: fontFamily.bodyBlack,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    defaultColor: "muted",
  },
  button: { fontFamily: fontFamily.displaySemi, fontSize: 15, lineHeight: 20, defaultColor: "text" },
};

export interface MipoTextProps extends TextProps {
  variant?: TextVariant;
  color?: ColorName;
}

export function MipoText({ variant = "body", color, style, ...props }: MipoTextProps) {
  const { colors } = useTheme();
  const { defaultColor, ...variantStyle } = variants[variant];
  return <Text {...props} style={[variantStyle, { color: colors[color ?? defaultColor] }, style]} />;
}
