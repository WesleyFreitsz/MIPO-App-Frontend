import React from "react";
import { render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "../theme/ThemeProvider";

export const testInsets = { top: 24, bottom: 34, left: 0, right: 0 };

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: testInsets,
};

export function renderWithTheme(ui: React.ReactElement) {
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider>{ui}</ThemeProvider>
    </SafeAreaProvider>,
  );
}
