import React from "react";
import { Image, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { AccentName, fontFamily, foregroundOn, stroke } from "../../theme/tokens";
import { MipoText } from "./Text";

const avatarTones: AccentName[] = ["yellow", "teal", "lime", "lilac", "pink", "orange"];

const sizes = { sm: 26, md: 34, lg: 84 } as const;

export type AvatarSize = keyof typeof sizes;

export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0].charAt(0);
  const last = words.length > 1 ? words[words.length - 1].charAt(0) : "";
  return `${first}${last}`.toLocaleUpperCase("pt-BR");
}

export function avatarTone(id: string): AccentName {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return avatarTones[hash % avatarTones.length];
}

export interface AvatarProps {
  name: string;
  id: string;
  uri?: string | null;
  size?: AvatarSize;
  online?: boolean;
  testID?: string;
}

export function Avatar({ name, id, uri, size = "md", online = false, testID }: AvatarProps) {
  const { colors } = useTheme();
  const px = sizes[size];
  const tone = avatarTone(id);
  const border = size === "lg" ? stroke.thick : size === "sm" ? stroke.thin : stroke.regular;

  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={name}
      style={{
        width: px,
        height: px,
        borderRadius: px / 2,
        borderWidth: border,
        borderColor: colors.line,
        backgroundColor: colors[tone],
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {uri ? (
        <Image
          testID={testID ? `${testID}-image` : undefined}
          source={{ uri }}
          style={{ width: px - border * 2, height: px - border * 2, borderRadius: px / 2 }}
        />
      ) : (
        <MipoText
          style={{ fontFamily: fontFamily.displaySemi, fontSize: Math.round(px * 0.38), color: foregroundOn(tone, colors) }}
        >
          {getInitials(name)}
        </MipoText>
      )}
      {online ? (
        <View
          testID={testID ? `${testID}-online` : undefined}
          style={{
            position: "absolute",
            right: -2,
            bottom: -2,
            width: Math.max(10, px * 0.3),
            height: Math.max(10, px * 0.3),
            borderRadius: px,
            backgroundColor: colors.success,
            borderWidth: 2,
            borderColor: colors.surface,
          }}
        />
      ) : null}
    </View>
  );
}
