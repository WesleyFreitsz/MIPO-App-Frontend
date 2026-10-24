import React from "react";
import { Pressable, PressableProps, StyleProp, View, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useTheme } from "../theme/ThemeProvider";
import { offset as offsets } from "../theme/tokens";
import { haptic } from "./haptics";
import { springs } from "./tokens";

export interface StickerPressableProps extends Omit<PressableProps, "style" | "children"> {
  shadowOffset?: number;
  haptics?: "tap" | "select" | "none";
  radius: number;
  style?: StyleProp<ViewStyle>;
  faceStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function StickerPressable({
  shadowOffset = offsets.button,
  haptics = "tap",
  radius,
  style,
  faceStyle,
  children,
  testID,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  ...pressableProps
}: StickerPressableProps) {
  const { colors } = useTheme();
  const pressed = useSharedValue(0);

  const faceAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pressed.value * shadowOffset }, { translateY: pressed.value * shadowOffset }],
  }));

  return (
    <Pressable
      {...pressableProps}
      testID={testID}
      disabled={disabled}
      style={style}
      onPressIn={(event) => {
        pressed.value = withSpring(1, springs.press);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        pressed.value = withSpring(0, springs.press);
        onPressOut?.(event);
      }}
      onPress={(event) => {
        if (haptics !== "none") haptic[haptics]();
        onPress?.(event);
      }}
    >
      <View>
        <View
          testID={testID ? `${testID}-shadow` : undefined}
          pointerEvents="none"
          style={{
            position: "absolute",
            top: shadowOffset,
            left: shadowOffset,
            right: -shadowOffset,
            bottom: -shadowOffset,
            borderRadius: radius,
            backgroundColor: colors.shadow,
          }}
        />
        <Animated.View testID={testID ? `${testID}-face` : undefined} style={[{ borderRadius: radius }, faceStyle, faceAnimatedStyle]}>
          {children}
        </Animated.View>
      </View>
    </Pressable>
  );
}
