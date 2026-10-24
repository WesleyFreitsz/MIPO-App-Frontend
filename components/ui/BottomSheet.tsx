import React from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleProp, View, ViewStyle } from "react-native";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReducedMotion } from "../../motion/reducedMotion";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, stroke } from "../../theme/tokens";

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}

export function BottomSheet({ visible, onClose, children, contentStyle }: BottomSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: "flex-end" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Animated.View entering={FadeIn.duration(180)} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            onPress={onClose}
            style={{ flex: 1, backgroundColor: colors.overlay }}
          />
        </Animated.View>
        <Animated.View
          entering={reducedMotion ? FadeIn.duration(200) : SlideInDown.springify().damping(18)}
          style={[
            {
              maxHeight: "92%",
              backgroundColor: colors.bg,
              borderTopWidth: stroke.thick,
              borderLeftWidth: stroke.thick,
              borderRightWidth: stroke.thick,
              borderColor: colors.line,
              borderTopLeftRadius: radius.sheet,
              borderTopRightRadius: radius.sheet,
              paddingHorizontal: 14,
              paddingTop: 10,
              paddingBottom: insets.bottom + 18,
            },
            contentStyle,
          ]}
        >
          <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: colors.muted, opacity: 0.5, alignSelf: "center", marginBottom: 12 }} />
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
