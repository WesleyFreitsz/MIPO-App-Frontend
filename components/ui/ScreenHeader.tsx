import React, { useContext } from "react";
import { View } from "react-native";
import { NavigationContext } from "@react-navigation/native";
import { ArrowLeft } from "lucide-react-native";
import { StickerPressable } from "../../motion/StickerPressable";
import { useTheme } from "../../theme/ThemeProvider";
import { stroke } from "../../theme/tokens";
import { MipoText } from "./Text";

export interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
  subtitle?: string;
}

export function BackButton({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <StickerPressable
      accessibilityRole="button"
      accessibilityLabel="Voltar"
      onPress={onPress}
      radius={19}
      shadowOffset={2}
      hitSlop={6}
      faceStyle={{
        width: 38,
        height: 38,
        borderWidth: stroke.regular,
        borderColor: colors.line,
        backgroundColor: colors.surface,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ArrowLeft size={18} color={colors.text} strokeWidth={2.6} />
    </StickerPressable>
  );
}

export function ScreenHeader({ title, onBack, right, subtitle }: ScreenHeaderProps) {
  const navigation = useContext(NavigationContext);
  const insideTabs = navigation?.getState()?.type === "tab";
  const canGoBack = Boolean(onBack) || (!insideTabs && Boolean(navigation?.canGoBack()));
  const handleBack = onBack ?? (() => navigation?.goBack());

  return (
    <View style={{ marginTop: 6, marginBottom: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 }}>
        {canGoBack ? <BackButton onPress={handleBack} /> : null}
        <MipoText variant="screenTitle" numberOfLines={1} accessibilityRole="header" style={{ flex: 1, fontSize: canGoBack ? 22 : 26 }}>
          {title}
        </MipoText>
        {right}
      </View>
      {subtitle ? (
        <MipoText variant="caption" style={{ marginTop: 2, marginLeft: canGoBack ? 48 : 0 }}>
          {subtitle}
        </MipoText>
      ) : null}
    </View>
  );
}
