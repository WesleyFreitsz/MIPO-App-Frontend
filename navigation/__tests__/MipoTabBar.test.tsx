import React from "react";
import { fireEvent, screen } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { MipoTabBar } from "../MipoTabBar";
import { renderWithTheme, testInsets } from "../../test-utils/renderWithTheme";
import { StyleSheet } from "react-native";

type Options = { tabBarLabel?: string; tabBarBadge?: number | string; tabBarAccessibilityLabel?: string };

function makeProps(names: string[], index: number, options: Record<string, Options> = {}) {
  const routes = names.map((name) => ({ key: `${name}-key`, name, params: undefined }));
  const navigate = jest.fn();
  const emit = jest.fn(() => ({ defaultPrevented: false }));
  const descriptors = Object.fromEntries(routes.map((route) => [route.key, { options: options[route.name] ?? {} }]));
  const props = {
    state: { index, routes, key: "tab", routeNames: names, type: "tab", stale: false, history: [] },
    descriptors,
    navigation: { navigate, emit },
    insets: testInsets,
  } as unknown as BottomTabBarProps;
  return { props, navigate, emit };
}

const userTabs = ["Início", "Social", "Notificações", "Perfil"];

beforeEach(() => jest.clearAllMocks());

test("mostra as 4 abas do usuário com Notificações rotulada como Avisos", async () => {
  const { props } = makeProps(userTabs, 0, { Notificações: { tabBarLabel: "Avisos" } });
  await renderWithTheme(<MipoTabBar {...props} />);
  for (const label of ["Início", "Social", "Avisos", "Perfil"]) {
    expect(screen.getByRole("tab", { name: label })).toBeTruthy();
  }
  expect(screen.queryByText("Notificações")).toBeNull();
});

test("admin vê o Painel", async () => {
  const { props } = makeProps(["Início", "Painel", "Social", "Notificações", "Perfil"], 0);
  await renderWithTheme(<MipoTabBar {...props} />);
  expect(screen.getByRole("tab", { name: "Painel" })).toBeTruthy();
});

test("marca a aba ativa", async () => {
  const { props } = makeProps(userTabs, 1);
  await renderWithTheme(<MipoTabBar {...props} />);
  expect(screen.getByRole("tab", { name: "Social" }).props.accessibilityState).toMatchObject({ selected: true });
  expect(screen.getByRole("tab", { name: "Início" }).props.accessibilityState).toMatchObject({ selected: false });
});

test("trocar de aba navega e dá háptico de seleção", async () => {
  const { props, navigate, emit } = makeProps(userTabs, 0);
  await renderWithTheme(<MipoTabBar {...props} />);
  await fireEvent.press(screen.getByRole("tab", { name: "Perfil" }));
  expect(emit).toHaveBeenCalledWith(expect.objectContaining({ type: "tabPress", target: "Perfil-key", canPreventDefault: true }));
  expect(navigate).toHaveBeenCalledWith("Perfil", undefined);
  expect(Haptics.selectionAsync).toHaveBeenCalled();
});

test("tocar na aba atual não navega de novo", async () => {
  const { props, navigate } = makeProps(userTabs, 0);
  await renderWithTheme(<MipoTabBar {...props} />);
  await fireEvent.press(screen.getByRole("tab", { name: "Início" }));
  expect(navigate).not.toHaveBeenCalled();
});

test("respeita preventDefault de quem escuta tabPress", async () => {
  const { props, navigate, emit } = makeProps(userTabs, 0);
  emit.mockReturnValueOnce({ defaultPrevented: true });
  await renderWithTheme(<MipoTabBar {...props} />);
  await fireEvent.press(screen.getByRole("tab", { name: "Social" }));
  expect(navigate).not.toHaveBeenCalled();
});

test("badge numérico aparece na aba", async () => {
  const { props } = makeProps(userTabs, 0, { Notificações: { tabBarLabel: "Avisos", tabBarBadge: 3 } });
  await renderWithTheme(<MipoTabBar {...props} />);
  expect(screen.getByText("3")).toBeTruthy();
});

test("badge vazio vira ponto", async () => {
  const { props } = makeProps(userTabs, 0, { Social: { tabBarBadge: "" } });
  await renderWithTheme(<MipoTabBar {...props} />);
  expect(screen.getByTestId("tab-dot-Social")).toBeTruthy();
});

test("a barra fica acima da área de gestos", async () => {
  const { props } = makeProps(userTabs, 0);
  await renderWithTheme(<MipoTabBar {...props} />);
  expect(StyleSheet.flatten(screen.getByTestId("mipo-tab-bar").props.style).bottom).toBe(testInsets.bottom + 12);
});
