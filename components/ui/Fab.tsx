import React from "react";
import type { LucideIcon } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StickerPressable } from "../../motion/StickerPressable";
import { useTheme } from "../../theme/ThemeProvider";
import { offset, stroke } from "../../theme/tokens";
import { TAB_BAR_HEIGHT } from "./Screen";

export interface FabProps {
  icon: LucideIcon;
  onPress: () => void;
  accessibilityLabel: string;
  aboveTabBar?: boolean;
}

export function Fab({ icon: Icon, onPress, accessibilityLabel, aboveTabBar = false }: FabProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <StickerPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      radius={18}
      shadowOffset={offset.card}
      style={{ position: "absolute", right: 16, bottom: (aboveTabBar ? TAB_BAR_HEIGHT + 12 : 0) + insets.bottom + 20 }}
      faceStyle={{
        width: 56,
        height: 56,
        borderWidth: stroke.thick,
        borderColor: colors.line,
        backgroundColor: colors.red,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon size={24} color={colors.onPink} strokeWidth={2.6} />
    </StickerPressable>
  );
}
