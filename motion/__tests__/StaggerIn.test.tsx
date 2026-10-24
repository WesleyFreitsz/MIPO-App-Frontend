import React from "react";
import { Text } from "react-native";
import { FadeIn, FadeInDown } from "react-native-reanimated";
import { render, screen } from "@testing-library/react-native";
import { StaggerIn, enteringFor } from "../StaggerIn";

test("entrada normal sobe com mola e atraso por índice", () => {
  const animation = enteringFor(3, false);
  expect(animation).toBeInstanceOf(FadeInDown);
  expect(animation.getDelay()).toBe(210);
});

test("com reduzir movimento vira fade simples sem atraso", () => {
  const animation = enteringFor(3, true);
  expect(animation).toBeInstanceOf(FadeIn);
  expect(animation).not.toBeInstanceOf(FadeInDown);
  expect(animation.getDelay()).toBe(0);
});

test("atraso tem teto para listas longas não demorarem", () => {
  expect(enteringFor(40, false).getDelay()).toBe(560);
});

test("renderiza os filhos", async () => {
  await render(
    <StaggerIn index={0}>
      <Text>oi</Text>
    </StaggerIn>,
  );
  expect(screen.getByText("oi")).toBeTruthy();
});
