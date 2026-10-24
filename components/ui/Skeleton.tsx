import React, { useEffect } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useReducedMotion } from "../../motion/reducedMotion";
import { useTheme } from "../../theme/ThemeProvider";
import { stroke } from "../../theme/tokens";

function Shine({ testID }: { testID?: string }) {
  const { colors } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(progress);
  }, [progress]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: -160 + progress.value * 560 }] }));

  return (
    <Animated.View
      testID={testID}
      pointerEvents="none"
      style={[{ position: "absolute", top: 0, bottom: 0, width: 120, backgroundColor: colors.surface2, opacity: 0.7 }, style]}
    />
  );
}

export function Skeleton({ height, style, testID }: { height: number; style?: StyleProp<ViewStyle>; testID?: string }) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  return (
    <View
      testID={testID}
      style={[
        {
          height,
          borderRadius: 14,
          borderWidth: stroke.thin,
          borderColor: colors.line,
          backgroundColor: colors.sunken,
          overflow: "hidden",
          opacity: 0.8,
        },
        style,
      ]}
    >
      {reducedMotion ? null : <Shine testID={testID ? `${testID}-shine` : undefined} />}
    </View>
  );
}
