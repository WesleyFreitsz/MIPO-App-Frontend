import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Pressable } from "react-native";

interface AnimatedCardProps {
  children: React.ReactNode;
  style?: object;
  delay?: number;
  onPress?: () => void;
}

export function AnimatedCard({ children, style, delay = 0, onPress }: AnimatedCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const Wrapper = onPress ? Pressable : View;

  return (
    <Animated.View
      style={[
        styles.card,
        style,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Wrapper onPress={onPress} style={styles.pressable}>
        {children}
      </Wrapper>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  pressable: { flex: 1 },
});
