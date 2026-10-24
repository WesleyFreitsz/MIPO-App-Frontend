import React from "react";
import { StyleSheet } from "react-native";
import { screen } from "@testing-library/react-native";
import { MipoText } from "../Text";
import { fontFamily, palettes, typeScale } from "../../../theme/tokens";
import { renderWithTheme } from "../../../test-utils/renderWithTheme";

const styleOf = (text: string) => StyleSheet.flatten(screen.getByText(text).props.style);

test("título de tela usa Fredoka e a escala do spec", async () => {
  await renderWithTheme(<MipoText variant="screenTitle">Avisos</MipoText>);
  expect(styleOf("Avisos")).toMatchObject({ fontFamily: fontFamily.display, fontSize: typeScale.screenTitle, color: palettes.light.text });
});

test("corpo usa Nunito", async () => {
  await renderWithTheme(<MipoText>texto</MipoText>);
  expect(styleOf("texto").fontFamily).toBe(fontFamily.body);
});

test("legenda usa a cor secundária", async () => {
  await renderWithTheme(<MipoText variant="caption">há 5 min</MipoText>);
  expect(styleOf("há 5 min").color).toBe(palettes.light.muted);
});

test("aceita cor por token", async () => {
  await renderWithTheme(<MipoText color="onPink">Ana</MipoText>);
  expect(styleOf("Ana").color).toBe(palettes.light.onPink);
});

test("label vem em maiúsculas", async () => {
  await renderWithTheme(<MipoText variant="label">Jogadores</MipoText>);
  expect(styleOf("Jogadores").textTransform).toBe("uppercase");
});
