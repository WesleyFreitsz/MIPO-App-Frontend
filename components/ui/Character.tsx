import React, { useEffect } from "react";
import { Image, ImageStyle, StyleProp } from "react-native";
import Animated, {
  Easing,
  SharedValue,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useReducedMotion } from "../../motion/reducedMotion";
import { CharacterName, characters } from "./characters";

export type CharacterMotion = "idle" | "wiggle" | "jump" | "spin" | "none";

interface CharacterProps {
  name: CharacterName;
  size: number;
  motion?: CharacterMotion;
  style?: StyleProp<ImageStyle>;
  testID?: string;
}

function loop(progress: SharedValue<number>, duration: number) {
  progress.value = 0;
  progress.value = withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false);
}

function useMotionStyle(motion: Exclude<CharacterMotion, "none">) {
  const progress = useSharedValue(0);

  useEffect(() => {
    const durations = { idle: 3200, wiggle: 2400, jump: 1400, spin: 1200 };
    loop(progress, durations[motion]);
    return () => cancelAnimation(progress);
  }, [motion, progress]);

  return useAnimatedStyle(() => {
    const t = progress.value;
    if (motion === "idle") {
      const wave = Math.sin(t * Math.PI * 2);
      return { transform: [{ translateY: -2.5 - 2.5 * wave }, { rotate: `${2 * wave}deg` }] };
    }
    if (motion === "wiggle") {
      const phase = t < 0.8 ? 0 : (t - 0.8) / 0.2;
      const angle = phase === 0 ? 0 : Math.sin(phase * Math.PI * 3) * 8 * (1 - phase);
      return { transform: [{ rotate: `${angle}deg` }] };
    }
    if (motion === "spin") {
      const wave = Math.sin(t * Math.PI * 2);
      return { transform: [{ translateY: -4 * Math.abs(wave) }, { rotate: `${12 * wave}deg` }] };
    }
    let translateY = 0;
    let scaleX = 1;
    let scaleY = 1;
    if (t < 0.15) {
      const k = t / 0.15;
      scaleX = 1 + 0.1 * k;
      scaleY = 1 - 0.12 * k;
    } else if (t < 0.45) {
      const k = (t - 0.15) / 0.3;
      translateY = -34 * Math.sin((k * Math.PI) / 2);
      scaleX = 1.1 - 0.15 * k;
      scaleY = 0.88 + 0.18 * k;
    } else if (t < 0.7) {
      const k = (t - 0.45) / 0.25;
      translateY = -34 * Math.cos((k * Math.PI) / 2);
      scaleX = 0.95 + 0.13 * k;
      scaleY = 1.06 - 0.14 * k;
    } else if (t < 0.85) {
      const k = (t - 0.7) / 0.15;
      translateY = -6 * Math.sin(k * Math.PI);
      scaleX = 1.08 - 0.08 * k;
      scaleY = 0.92 + 0.08 * k;
    }
    return { transform: [{ translateY }, { scaleX }, { scaleY }] };
  });
}

function AnimatedCharacter({ name, size, motion, style, testID }: CharacterProps & { motion: Exclude<CharacterMotion, "none"> }) {
  const animatedStyle = useMotionStyle(motion);
  return (
    <Animated.Image
      testID={testID}
      accessible={false}
      source={characters[name]}
      resizeMode="contain"
      style={[{ width: size, height: size }, style, animatedStyle]}
    />
  );
}

export function Character({ motion = "idle", ...props }: CharacterProps) {
  const reducedMotion = useReducedMotion();
  if (reducedMotion || motion === "none") {
    return (
      <Image
        testID={props.testID}
        accessible={false}
        source={characters[props.name]}
        resizeMode="contain"
        style={[{ width: props.size, height: props.size }, props.style]}
      />
    );
  }
  return <AnimatedCharacter {...props} motion={motion} />;
}
