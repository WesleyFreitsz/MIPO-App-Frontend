import React from "react";
import { StyleSheet } from "react-native";
import { screen } from "@testing-library/react-native";
import { Avatar, avatarTone, getInitials } from "../Avatar";
import { AvatarStack } from "../AvatarStack";
import { renderWithTheme } from "../../../test-utils/renderWithTheme";

describe("getInitials", () => {
  test.each([
    ["Ana Souza", "AS"],
    ["ana", "A"],
    ["  João   Pedro da Silva ", "JS"],
    ["élio ávila", "ÉÁ"],
    ["", "?"],
    ["   ", "?"],
  ])("%p vira %p", (name, expected) => {
    expect(getInitials(name)).toBe(expected);
  });
});

describe("avatarTone", () => {
  test("é estável para o mesmo id", () => {
    expect(avatarTone("user-123")).toBe(avatarTone("user-123"));
  });

  test("espalha ids diferentes por mais de uma cor", () => {
    const tones = new Set(["a", "b", "c", "d", "e", "f", "g", "h"].map(avatarTone));
    expect(tones.size).toBeGreaterThan(2);
  });

  test("nunca usa vermelho, reservado para ações", () => {
    for (let i = 0; i < 200; i++) expect(avatarTone(`id-${i}`)).not.toBe("red");
  });
});

describe("Avatar", () => {
  test("sem foto mostra as iniciais", async () => {
    await renderWithTheme(<Avatar name="Ana Souza" id="1" />);
    expect(screen.getByText("AS")).toBeTruthy();
  });

  test("com foto mostra a imagem e não as iniciais", async () => {
    await renderWithTheme(<Avatar name="Ana Souza" id="1" uri="https://example.com/a.png" testID="av" />);
    expect(screen.getByTestId("av-image").props.source).toEqual({ uri: "https://example.com/a.png" });
    expect(screen.queryByText("AS")).toBeNull();
  });

  test("uri vazia conta como sem foto", async () => {
    await renderWithTheme(<Avatar name="Ana" id="1" uri="" />);
    expect(screen.getByText("A")).toBeTruthy();
  });

  test.each([
    ["sm", 26],
    ["md", 34],
    ["lg", 84],
  ] as const)("tamanho %s tem %ipx", async (size, px) => {
    await renderWithTheme(<Avatar name="Ana" id="1" size={size} testID="av" />);
    expect(StyleSheet.flatten(screen.getByTestId("av").props.style)).toMatchObject({ width: px, height: px });
  });

  test("mostra o ponto de online só quando pedido", async () => {
    await renderWithTheme(<Avatar name="Ana" id="1" online testID="av" />);
    expect(screen.getByTestId("av-online")).toBeTruthy();
  });

  test("sem online não mostra o ponto", async () => {
    await renderWithTheme(<Avatar name="Ana" id="1" testID="av" />);
    expect(screen.queryByTestId("av-online")).toBeNull();
  });

  test("é anunciado pelo nome", async () => {
    await renderWithTheme(<Avatar name="Ana Souza" id="1" testID="av" />);
    expect(screen.getByLabelText("Ana Souza")).toBeTruthy();
  });
});

describe("AvatarStack", () => {
  const people = ["Ana", "Bia", "Caio", "Duda", "Edu"].map((name, i) => ({ id: String(i), name }));

  test("mostra no máximo N e um contador do resto", async () => {
    await renderWithTheme(<AvatarStack people={people} max={3} />);
    expect(screen.getByText("A")).toBeTruthy();
    expect(screen.getByText("C")).toBeTruthy();
    expect(screen.queryByText("D")).toBeNull();
    expect(screen.getByText("+2")).toBeTruthy();
  });

  test("sem excedente não mostra contador", async () => {
    await renderWithTheme(<AvatarStack people={people.slice(0, 2)} max={3} />);
    expect(screen.queryByText(/^\+/)).toBeNull();
  });

  test("lista vazia não renderiza nada", async () => {
    await renderWithTheme(<AvatarStack people={[]} testID="stack" />);
    expect(screen.queryByTestId("stack")).toBeNull();
  });
});
