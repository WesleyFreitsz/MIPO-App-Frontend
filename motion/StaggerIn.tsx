import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useReducedMotion } from "./reducedMotion";
import { MAX_STAGGERED_ITEMS, durations, springs } from "./tokens";

export function enteringFor(index: number, reducedMotion: boolean) {
  if (reducedMotion) return FadeIn.duration(durations.fade);
  const delay = Math.min(index, MAX_STAGGERED_ITEMS) * durations.stagger;
  return FadeInDown.springify().damping(springs.pop.damping).stiffness(springs.pop.stiffness).delay(delay);
}

interface StaggerInProps {
  index: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function StaggerIn({ index, children, style }: StaggerInProps) {
  const reducedMotion = useReducedMotion();
  return (
    <Animated.View entering={enteringFor(index, reducedMotion)} style={style}>
      {children}
    </Animated.View>
  );
}
