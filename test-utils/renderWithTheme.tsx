import React from "react";
import { render } from "@testing-library/react-native";
import { ThemeProvider } from "../theme/ThemeProvider";

export function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}
