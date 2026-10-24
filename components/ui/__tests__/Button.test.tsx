import React from "react";
import { StyleSheet } from "react-native";
import { fireEvent, screen } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import { Send } from "lucide-react-native";
import { Button } from "../Button";
import { palettes } from "../../../theme/tokens";
import { renderWithTheme } from "../../../test-utils/renderWithTheme";

const flat = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style);

beforeEach(() => jest.clearAllMocks());

test("botão vermelho tem texto branco", async () => {
  await renderWithTheme(<Button label="Vou nessa!" variant="red" onPress={jest.fn()} />);
  expect(StyleSheet.flatten(screen.getByText("Vou nessa!").props.style).color).toBe(palettes.light.onPink);
});

test("botão amarelo padrão tem texto escuro", async () => {
  await renderWithTheme(<Button label="Entrar" onPress={jest.fn()} />);
  expect(StyleSheet.flatten(screen.getByText("Entrar").props.style).color).toBe(palettes.light.onColor);
});

test("não tem altura fixa e respeita área de toque mínima", async () => {
  await renderWithTheme(<Button label="Entrar" onPress={jest.fn()} testID="b" />);
  const style = flat("b-face");
  expect(style.height).toBeUndefined();
  expect(style.minHeight).toBeGreaterThanOrEqual(44);
});

test("chama onPress e dá háptico leve", async () => {
  const onPress = jest.fn();
  await renderWithTheme(<Button label="Entrar" onPress={onPress} />);
  await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));
  expect(onPress).toHaveBeenCalledTimes(1);
  expect(Haptics.impactAsync).toHaveBeenCalled();
});

test("desabilitado não chama onPress e anuncia o estado", async () => {
  const onPress = jest.fn();
  await renderWithTheme(<Button label="Entrar" onPress={onPress} disabled />);
  const button = screen.getByRole("button", { name: "Entrar" });
  await fireEvent.press(button);
  expect(onPress).not.toHaveBeenCalled();
  expect(button.props.accessibilityState).toMatchObject({ disabled: true });
});

test("carregando não chama onPress e mostra indicador", async () => {
  const onPress = jest.fn();
  await renderWithTheme(<Button label="Entrar" onPress={onPress} loading testID="b" />);
  await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));
  expect(onPress).not.toHaveBeenCalled();
  expect(screen.getByTestId("b-loading")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Entrar" }).props.accessibilityState).toMatchObject({ busy: true });
});

test("botão só com ícone usa accessibilityLabel", async () => {
  await renderWithTheme(<Button label="" icon={Send} accessibilityLabel="Enviar" onPress={jest.fn()} />);
  expect(screen.getByRole("button", { name: "Enviar" })).toBeTruthy();
});

test("tem sombra sólida deslocada, sem blur", async () => {
  await renderWithTheme(<Button label="Entrar" onPress={jest.fn()} testID="b" />);
  const shadow = flat("b-shadow");
  expect(shadow).toMatchObject({ backgroundColor: palettes.light.shadow, top: 3, left: 3 });
});

test("no tema escuro usa as cores do escuro", async () => {
  const AsyncStorage = require("@react-native-async-storage/async-storage");
  await AsyncStorage.setItem("mipo.themePreference", "dark");
  await renderWithTheme(<Button label="Entrar" variant="ghost" onPress={jest.fn()} testID="b" />);
  await screen.findByTestId("b");
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(flat("b-face").backgroundColor).toBe(palettes.dark.surface);
  await AsyncStorage.clear();
});
