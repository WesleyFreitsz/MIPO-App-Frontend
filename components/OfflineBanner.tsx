import React from "react";
import { View } from "react-native";
import { useNetInfo } from "@react-native-community/netinfo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WifiOff } from "lucide-react-native";
import { MipoText } from "./ui";
import { useTheme } from "../theme/ThemeProvider";

export function OfflineBanner() {
  const { isConnected } = useNetInfo();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  if (isConnected !== false) return null;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        position: "absolute",
        top: insets.top + 6,
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: colors.red,
      }}
    >
      <WifiOff size={14} color="#FFFFFF" strokeWidth={2.4} />
      <MipoText variant="caption" style={{ color: "#FFFFFF" }}>
        Sem conexão — mostrando dados salvos
      </MipoText>
    </View>
  );
}
