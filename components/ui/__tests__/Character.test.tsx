import React from "react";
import { StyleSheet } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { Character } from "../Character";
import { CharacterName, characters } from "../characters";
import { useReducedMotion } from "../../../motion/reducedMotion";

jest.mock("../../../motion/reducedMotion", () => ({ useReducedMotion: jest.fn(() => false) }));

const mockedReducedMotion = useReducedMotion as jest.MockedFunction<typeof useReducedMotion>;

function styleOf(testID: string) {
  return StyleSheet.flatten(screen.getByTestId(testID).props.style);
}

beforeEach(() => mockedReducedMotion.mockReturnValue(false));

test("mapeia os 47 personagens da Mipo", () => {
  expect(Object.keys(characters)).toHaveLength(47);
});

test.each<CharacterName>(["carta1", "carta5", "moeda5", "monstro2", "quebraCabeca6", "dado3", "pocao3", "trofeu6", "peao14"])(
  "%s tem imagem",
  (name) => {
    expect(characters[name]).toBeTruthy();
  },
);

test("usa o tamanho pedido", async () => {
  await render(<Character name="dado1" size={96} testID="c" />);
  expect(styleOf("c")).toMatchObject({ width: 96, height: 96 });
});

test("anima por padrão", async () => {
  await render(<Character name="dado1" size={96} motion="jump" testID="c" />);
  expect(styleOf("c").transform).toBeDefined();
});

test("com reduzir movimento, fica parado", async () => {
  mockedReducedMotion.mockReturnValue(true);
  await render(<Character name="dado1" size={96} motion="jump" testID="c" />);
  expect(styleOf("c").transform).toBeUndefined();
});

test("motion none fica parado", async () => {
  await render(<Character name="peao2" size={40} motion="none" testID="c" />);
  expect(styleOf("c").transform).toBeUndefined();
});

test("é decorativo para leitores de tela", async () => {
  await render(<Character name="peao2" size={40} testID="c" />);
  expect(screen.getByTestId("c").props.accessible).toBe(false);
});
