import React from "react";
import { RefreshControlProps, ScrollView, StyleProp, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";

export const TAB_BAR_HEIGHT = 62;
export const SCREEN_PADDING = 14;

export interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  withTabBar?: boolean;
  background?: "bg" | "hero";
  safeTop?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  contentStyle?: StyleProp<ViewStyle>;
  keyboardShouldPersistTaps?: "always" | "never" | "handled";
  testID?: string;
}

export function useBottomReserve(withTabBar: boolean): number {
  const insets = useSafeAreaInsets();
  return withTabBar ? TAB_BAR_HEIGHT + insets.bottom + 16 : insets.bottom + 16;
}

export function Screen({
  children,
  scroll = false,
  withTabBar = false,
  background = "bg",
  safeTop = true,
  refreshControl,
  contentStyle,
  keyboardShouldPersistTaps = "handled",
  testID,
}: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomReserve = useBottomReserve(withTabBar);

  const content = (
    <View
      testID={testID ? `${testID}-content` : undefined}
      style={[{ paddingHorizontal: SCREEN_PADDING, paddingBottom: bottomReserve }, scroll ? null : { flex: 1 }, contentStyle]}
    >
      {children}
    </View>
  );

  return (
    <View testID={testID} style={{ flex: 1, backgroundColor: colors[background], paddingTop: safeTop ? insets.top : 0 }}>
      {scroll ? (
        <ScrollView refreshControl={refreshControl} keyboardShouldPersistTaps={keyboardShouldPersistTaps} showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </View>
  );
}
