import React from "react";
import { DimensionValue, Image, View, ViewStyle } from "react-native";
import { StickerPressable } from "../../motion/StickerPressable";
import { useTheme } from "../../theme/ThemeProvider";
import { AccentName, foregroundOn, offset, radius, stroke } from "../../theme/tokens";
import { MipoText } from "./Text";

export interface GameTileProps {
  name: string;
  meta?: string;
  tone: AccentName;
  tilt?: number;
  width?: DimensionValue;
  height?: number;
  imageUrl?: string | null;
  onPress?: () => void;
  testID?: string;
}

export function GameTile({ name, meta, tone, tilt = 0, width, height = 104, imageUrl, onPress, testID }: GameTileProps) {
  const { colors } = useTheme();
  const foreground = imageUrl ? colors.text : foregroundOn(tone, colors);
  const outer: ViewStyle = { width, transform: tilt ? [{ rotate: `${tilt}deg` }] : undefined };
  const face: ViewStyle = {
    height,
    borderWidth: stroke.regular,
    borderColor: colors.line,
    borderRadius: radius.tile,
    backgroundColor: colors[tone],
    overflow: "hidden",
    justifyContent: "flex-end",
  };

  const content = (
    <>
      {imageUrl ? (
        <Image
          testID={testID ? `${testID}-image` : undefined}
          source={{ uri: imageUrl }}
          resizeMode="cover"
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
      ) : null}
      <View style={imageUrl ? { backgroundColor: colors.surface, padding: 6, borderTopWidth: stroke.thin, borderTopColor: colors.line } : { padding: 8 }}>
        <MipoText variant="cardTitle" numberOfLines={2} style={{ color: foreground, fontSize: 14, lineHeight: 18 }}>
          {name}
        </MipoText>
        {meta ? (
          <MipoText variant="micro" numberOfLines={1} style={{ color: foreground, opacity: 0.8 }}>
            {meta}
          </MipoText>
        ) : null}
      </View>
    </>
  );

  if (onPress) {
    return (
      <StickerPressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={name}
        onPress={onPress}
        radius={radius.tile}
        shadowOffset={offset.button}
        style={outer}
        faceStyle={face}
      >
        {content}
      </StickerPressable>
    );
  }

  return (
    <View testID={testID} style={outer}>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: offset.button,
          left: offset.button,
          right: -offset.button,
          bottom: -offset.button,
          borderRadius: radius.tile,
          backgroundColor: colors.shadow,
        }}
      />
      <View style={face}>{content}</View>
    </View>
  );
}
