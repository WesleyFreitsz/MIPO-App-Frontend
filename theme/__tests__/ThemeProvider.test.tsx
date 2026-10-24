import React from "react";
import { Text } from "react-native";
import * as ReactNative from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, render, screen, waitFor } from "@testing-library/react-native";
import { ThemeProvider, useTheme } from "../ThemeProvider";
import { THEME_PREFERENCE_KEY } from "../resolveColorScheme";
import { palettes } from "../tokens";

let latest: ReturnType<typeof useTheme> | null = null;

function Probe() {
  const theme = useTheme();
  latest = theme;
  return <Text testID="probe">{`${theme.preference}|${theme.scheme}|${theme.colors.bg}`}</Text>;
}

function mockSystemScheme(scheme: "light" | "dark" | null) {
  jest.spyOn(ReactNative, "useColorScheme").mockReturnValue(scheme);
}

beforeEach(async () => {
  latest = null;
  await AsyncStorage.clear();
  jest.restoreAllMocks();
});

test("sem preferência salva, segue o sistema", async () => {
  mockSystemScheme("dark");
  await render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  );
  await waitFor(() => expect(screen.getByTestId("probe")).toHaveTextContent(`system|dark|${palettes.dark.bg}`));
});

test("carrega a preferência salva no AsyncStorage", async () => {
  mockSystemScheme("light");
  await AsyncStorage.setItem(THEME_PREFERENCE_KEY, "dark");
  await render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  );
  await waitFor(() => expect(screen.getByTestId("probe")).toHaveTextContent(`dark|dark|${palettes.dark.bg}`));
});

test("ignora valor inválido salvo e volta para o sistema", async () => {
  mockSystemScheme("light");
  await AsyncStorage.setItem(THEME_PREFERENCE_KEY, "roxo");
  await render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  );
  await waitFor(() => expect(screen.getByTestId("probe")).toHaveTextContent(`system|light|${palettes.light.bg}`));
});

test("setPreference troca o tema e persiste", async () => {
  mockSystemScheme("light");
  await render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  );
  await act(async () => {
    latest?.setPreference("dark");
  });
  expect(screen.getByTestId("probe")).toHaveTextContent(`dark|dark|${palettes.dark.bg}`);
  await waitFor(async () => expect(await AsyncStorage.getItem(THEME_PREFERENCE_KEY)).toBe("dark"));
});

test("useTheme fora do provider falha com mensagem clara", async () => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  await expect(render(<Probe />)).rejects.toThrow("useTheme must be used inside ThemeProvider");
});
