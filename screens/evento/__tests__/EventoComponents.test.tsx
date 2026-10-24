import React from "react";
import { fireEvent, screen } from "@testing-library/react-native";
import { EventoDetail } from "../../../types";
import { EventoCard } from "../EventoCard";
import { EventoDetailSheet, EventoDetailSheetProps } from "../EventoDetailSheet";
import { renderWithTheme } from "../../../test-utils/renderWithTheme";

const evento: EventoDetail = {
  id: "e1",
  title: "Noite de Eurogames",
  description: "Traga seu jogo favorito.",
  dateTime: new Date(2026, 9, 23, 19, 30).toISOString(),
  space: "SALÃO",
  participants: [
    { id: "ana", name: "Ana Souza" },
    { id: "joao", name: "João Pedro", nickname: "Jota" },
  ],
};

function renderSheet(overrides: Partial<EventoDetailSheetProps> = {}) {
  const props: EventoDetailSheetProps = {
    evento,
    visible: true,
    onClose: jest.fn(),
    onToggleParticipation: jest.fn(),
    onCheckIn: jest.fn(),
    onOpenChat: jest.fn(),
    isConfirmed: false,
    canCheckIn: false,
    ...overrides,
  };
  return renderWithTheme(<EventoDetailSheet {...props} />).then(() => props);
}

describe("EventoDetailSheet", () => {
  test("mostra título, data, hora, local e descrição", async () => {
    await renderSheet();
    expect(screen.getByText("Noite de Eurogames")).toBeTruthy();
    expect(screen.getByText("sexta-feira, 23 de outubro · 19:30")).toBeTruthy();
    expect(screen.getByText("SALÃO")).toBeTruthy();
    expect(screen.getByText("Traga seu jogo favorito.")).toBeTruthy();
  });

  test("conta os confirmados e mostra quem vai", async () => {
    await renderSheet();
    expect(screen.getByText("2 confirmados")).toBeTruthy();
    expect(screen.getByLabelText("Ana Souza")).toBeTruthy();
    expect(screen.getByText("Jota")).toBeTruthy();
  });

  test("sem participantes avisa que ninguém confirmou", async () => {
    await renderSheet({ evento: { ...evento, participants: [] } });
    expect(screen.getByText("Ninguém confirmado ainda.")).toBeTruthy();
  });

  test("quem não confirmou vê 'Vou nessa!'", async () => {
    const props = await renderSheet();
    await fireEvent.press(screen.getByRole("button", { name: "Vou nessa!" }));
    expect(props.onToggleParticipation).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Chat do evento" })).toBeNull();
  });

  test("quem confirmou pode cancelar e abrir o chat", async () => {
    const props = await renderSheet({ isConfirmed: true });
    await fireEvent.press(screen.getByRole("button", { name: "Cancelar presença" }));
    expect(props.onToggleParticipation).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole("button", { name: "Chat do evento" }));
    expect(props.onOpenChat).toHaveBeenCalled();
  });

  test("check-in só aparece quando liberado", async () => {
    await renderSheet({ isConfirmed: true, canCheckIn: false });
    expect(screen.queryByRole("button", { name: "Fazer check-in" })).toBeNull();
  });

  test("check-in liberado dispara a ação", async () => {
    const props = await renderSheet({ isConfirmed: true, canCheckIn: true });
    await fireEvent.press(screen.getByRole("button", { name: "Fazer check-in" }));
    expect(props.onCheckIn).toHaveBeenCalled();
  });

  test("sem evento não renderiza", async () => {
    await renderSheet({ evento: null });
    expect(screen.queryByText("Noite de Eurogames")).toBeNull();
  });
});

describe("EventoCard", () => {
  test("destaque mostra dia, título e abre o evento", async () => {
    const onPress = jest.fn();
    await renderWithTheme(<EventoCard evento={evento} variant="destaque" onPress={onPress} />);
    expect(screen.getByText("SEXTA · 19:30")).toBeTruthy();
    expect(screen.getByText("Noite de Eurogames")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Ver evento Noite de Eurogames" }));
    expect(onPress).toHaveBeenCalled();
  });

  test("lista mostra o bloco de data e os confirmados", async () => {
    await renderWithTheme(<EventoCard evento={evento} variant="lista" onPress={jest.fn()} />);
    expect(screen.getByText("SEX")).toBeTruthy();
    expect(screen.getByText("2 vão")).toBeTruthy();
    expect(screen.getByText("SALÃO · 19:30")).toBeTruthy();
  });

  test("título longo é cortado", async () => {
    const title = "Campeonato regional de Código Secreto com premiação e lanche";
    await renderWithTheme(<EventoCard evento={{ ...evento, title }} variant="lista" onPress={jest.fn()} />);
    expect(screen.getByText(title).props.numberOfLines).toBe(2);
  });
});
