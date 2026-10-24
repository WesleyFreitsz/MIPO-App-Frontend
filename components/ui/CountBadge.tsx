import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import { useTheme } from "../../theme/ThemeProvider";
import { MipoText } from "./Text";

export function CountBadge({ count, style, testID }: { count: number; style?: StyleProp<ViewStyle>; testID?: string }) {
  const { colors } = useTheme();
  if (count <= 0) return null;
  return (
    <Animated.View
      testID={testID}
      entering={ZoomIn.springify()}
      accessibilityLabel={`${count} novos`}
      style={[
        {
          minWidth: 18,
          height: 18,
          paddingHorizontal: 4,
          borderRadius: 9,
          backgroundColor: colors.red,
          borderWidth: 2,
          borderColor: colors.tab,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <MipoText variant="micro" color="onPink" style={{ fontSize: 10, lineHeight: 12 }}>
        {count > 99 ? "99+" : String(count)}
      </MipoText>
    </Animated.View>
  );
}
