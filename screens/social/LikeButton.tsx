import React from "react";
import { Pressable } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { Heart } from "lucide-react-native";
import { MipoText } from "../../components/ui";
import { haptic } from "../../motion/haptics";
import { useReducedMotion } from "../../motion/reducedMotion";
import { springs } from "../../motion/tokens";
import { useTheme } from "../../theme/ThemeProvider";

export interface LikeButtonProps {
  liked: boolean;
  count: number;
  onToggle: () => void;
  size?: number;
}

export function LikeButton({ liked, count, onToggle, size = 18 }: LikeButtonProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }] }));

  const handlePress = () => {
    haptic.tap();
    if (!reducedMotion && !liked) {
      scale.value = withSequence(withTiming(1.5, { duration: 120 }), withSpring(1, springs.pop));
      rotate.value = withSequence(withTiming(-10, { duration: 120 }), withSpring(0, springs.pop));
    }
    onToggle();
  };

  const color = liked ? colors.red : colors.muted;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${liked ? "Descurtir" : "Curtir"}, ${count} curtidas`}
      onPress={handlePress}
      hitSlop={10}
      style={{ flexDirection: "row", alignItems: "center", gap: 4, minHeight: 32 }}
    >
      <Animated.View style={style}>
        <Heart size={size} color={color} fill={liked ? colors.red : "transparent"} strokeWidth={2.4} />
      </Animated.View>
      <MipoText variant="caption" style={{ color }}>
        {String(count)}
      </MipoText>
    </Pressable>
  );
}
