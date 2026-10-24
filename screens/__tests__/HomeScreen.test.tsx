import React from "react";
import { Alert } from "react-native";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import HomeScreen from "../HomeScreen";
import { api } from "../../services/api";
import { renderWithTheme } from "../../test-utils/renderWithTheme";

const mockNavigate = jest.fn();

jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("@react-navigation/native");
  const ReactLib = jest.requireActual("react");
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate }),
    useFocusEffect: (callback: () => void) => ReactLib.useEffect(callback, [callback]),
  };
});
jest.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "ana", name: "Ana Souza", coins: 120 } }),
}));
jest.mock("../../services/api", () => ({ api: { get: jest.fn(), post: jest.fn() } }));
jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted" })),
  launchCameraAsync: jest.fn(),
}));

const mockedGet = api.get as jest.Mock;
const mockedPost = api.post as jest.Mock;

function at(hours: number, dayOffset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hours, 0, 0, 0);
  return date.toISOString();
}

const eventos = [
  { id: "e2", title: "Torneio de Azul", dateTime: at(15, 2), space: "SALÃO", status: "APPROVED", participants: [] },
  { id: "e1", title: "Noite de Eurogames", dateTime: at(0, 0), space: "SALÃO", status: "APPROVED", participants: [{ id: "ana", name: "Ana Souza" }], checkedInUserIds: [] },
  { id: "e3", title: "Evento pendente", dateTime: at(15, 1), space: "SALÃO", status: "PENDING", participants: [] },
];
const jogos = [
  { id: "g1", name: "Azul", category: "Abstrato" },
  { id: "g2", name: "Dixit", category: "Festa" },
];

function mockApi(events: unknown = eventos, games: unknown = jogos) {
  mockedGet.mockImplementation((url: string) => {
    if (url === "/events") return Promise.resolve({ data: events });
    if (url.startsWith("/games")) return Promise.resolve({ data: games });
    return Promise.reject(new Error(`url inesperada ${url}`));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
  mockApi();
});

test("cumprimenta pelo primeiro nome e mostra as moedas", async () => {
  await renderWithTheme(<HomeScreen />);
  expect(screen.getByText("Bora jogar hoje, Ana?")).toBeTruthy();
  expect(screen.getByLabelText("120 moedas")).toBeTruthy();
});

test("o próximo evento aprovado vira destaque e pendentes ficam de fora", async () => {
  await renderWithTheme(<HomeScreen />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Ver evento Noite de Eurogames" })).toBeTruthy());
  expect(screen.getByRole("button", { name: "Ver evento Torneio de Azul" })).toBeTruthy();
  expect(screen.queryByText("Evento pendente")).toBeNull();
});

test("jogos em destaque abrem o detalhe", async () => {
  await renderWithTheme(<HomeScreen />);
  await waitFor(() => screen.getByRole("button", { name: "Dixit" }));
  await fireEvent.press(screen.getByRole("button", { name: "Dixit" }));
  expect(mockNavigate).toHaveBeenCalledWith("GameDetail", { gameId: "g2" });
});

test("ver todos leva às listas", async () => {
  await renderWithTheme(<HomeScreen />);
  await waitFor(() => screen.getByRole("button", { name: "Ver todos os jogos" }));
  await fireEvent.press(screen.getByRole("button", { name: "Ver todos os jogos" }));
  expect(mockNavigate).toHaveBeenCalledWith("GamesList");
  await fireEvent.press(screen.getByRole("button", { name: "Ver todos os eventos" }));
  expect(mockNavigate).toHaveBeenCalledWith("EventsList");
});

test("abrir o evento mostra o detalhe e o check-in termina em festa", async () => {
  (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValueOnce({ canceled: false });
  mockedPost.mockResolvedValueOnce({});
  await renderWithTheme(<HomeScreen />);
  await waitFor(() => screen.getByRole("button", { name: "Ver evento Noite de Eurogames" }));
  await fireEvent.press(screen.getByRole("button", { name: "Ver evento Noite de Eurogames" }));
  await fireEvent.press(screen.getByRole("button", { name: "Fazer check-in" }));
  await waitFor(() => expect(screen.getByText("Check-in feito!")).toBeTruthy());
  expect(mockedPost).toHaveBeenCalledWith("/events/e1/checkin");
  expect(screen.getByText("Boa Noite de Eurogames, Ana.")).toBeTruthy();
});

test("chat do evento navega com os parâmetros que o chat espera", async () => {
  const withChat = eventos.map((e) => (e.id === "e1" ? { ...e, chatId: "c9", bannerUrl: null } : e));
  mockApi(withChat);
  await renderWithTheme(<HomeScreen />);
  await waitFor(() => screen.getByRole("button", { name: "Ver evento Noite de Eurogames" }));
  await fireEvent.press(screen.getByRole("button", { name: "Ver evento Noite de Eurogames" }));
  await fireEvent.press(screen.getByRole("button", { name: "Chat do evento" }));
  expect(mockNavigate).toHaveBeenCalledWith("ChatDetail", {
    chatId: "c9",
    name: "Noite de Eurogames",
    type: "EVENT",
    avatar: null,
    targetId: "e1",
  });
});

test("sem eventos nem jogos mostra estados vazios", async () => {
  mockApi([], []);
  await renderWithTheme(<HomeScreen />);
  await waitFor(() => expect(screen.getByText("Nenhum evento por enquanto")).toBeTruthy());
  expect(screen.getByText("Nenhum jogo em destaque no momento.")).toBeTruthy();
});

test("erro na API mostra a tela de erro e tenta de novo", async () => {
  mockedGet.mockRejectedValue(new Error("offline"));
  await renderWithTheme(<HomeScreen />);
  await waitFor(() => expect(screen.getByText("Ops, caiu uma peça!")).toBeTruthy());
  mockApi();
  await fireEvent.press(screen.getByRole("button", { name: "Tentar de novo" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Ver evento Noite de Eurogames" })).toBeTruthy());
});
