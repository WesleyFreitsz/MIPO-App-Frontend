import React, { useEffect } from "react";
import { Modal, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { haptic } from "../../motion/haptics";
import { useReducedMotion } from "../../motion/reducedMotion";
import { useTheme } from "../../theme/ThemeProvider";
import { ColorName, stroke } from "../../theme/tokens";
import { Button } from "./Button";
import { Card } from "./Card";
import { Character } from "./Character";
import { CharacterName } from "./characters";
import { MipoText } from "./Text";

interface ConfettiPiece {
  color: ColorName | "white";
  x: number;
  y: number;
  rotate: number;
}

const confetti: ConfettiPiece[] = [
  { color: "red", x: -110, y: -220, rotate: -200 },
  { color: "pink", x: 100, y: -200, rotate: 240 },
  { color: "lime", x: -70, y: 160, rotate: -280 },
  { color: "teal", x: 120, y: 120, rotate: 320 },
  { color: "blue", x: -130, y: 40, rotate: -360 },
  { color: "white", x: 60, y: 200, rotate: 400 },
  { color: "orange", x: 20, y: -260, rotate: -440 },
  { color: "pink", x: -30, y: 240, rotate: 480 },
];

function Confetti({ piece, index }: { piece: ConfettiPiece; index: number }) {
  const { colors } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(index * 90, withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.cubic) }), -1, false));
    return () => cancelAnimation(progress);
  }, [index, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { translateX: piece.x * progress.value },
      { translateY: piece.y * progress.value },
      { rotate: `${piece.rotate * progress.value}deg` },
    ],
  }));

  return (
    <Animated.View
      testID="confetti"
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          top: "42%",
          left: "50%",
          width: 10,
          height: 14,
          borderRadius: 3,
          borderWidth: stroke.thin,
          borderColor: colors.line,
          backgroundColor: piece.color === "white" ? colors.onPink : colors[piece.color],
        },
        style,
      ]}
    />
  );
}

export interface CelebrationProps {
  visible: boolean;
  title: string;
  message?: string;
  character: CharacterName;
  reward?: string;
  ctaLabel?: string;
  onClose: () => void;
}

export function Celebration({ visible, title, message, character, reward, ctaLabel = "Bora!", onClose }: CelebrationProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (visible) haptic.success();
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible transparent={false} animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.hero,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 24,
          paddingTop: insets.top,
          paddingBottom: insets.bottom + 24,
        }}
      >
        {reducedMotion ? null : confetti.map((piece, index) => <Confetti key={index} piece={piece} index={index} />)}
        <Character name={character} size={170} motion="jump" />
        <MipoText variant="hero" style={{ textAlign: "center", marginTop: 6 }}>
          {title}
        </MipoText>
        {message ? (
          <MipoText variant="caption" color="text" style={{ textAlign: "center", marginTop: 6 }}>
            {message}
          </MipoText>
        ) : null}
        {reward ? (
          <Animated.View entering={FadeInDown.delay(300).springify()} style={{ marginTop: 18 }}>
            <Card contentStyle={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Character name="moeda4" size={40} motion="wiggle" />
              <MipoText variant="cardTitle" style={{ flexShrink: 1 }}>
                {reward}
              </MipoText>
            </Card>
          </Animated.View>
        ) : null}
        <Button label={ctaLabel} variant="red" block onPress={onClose} style={{ marginTop: 24, alignSelf: "stretch" }} />
      </View>
    </Modal>
  );
}
