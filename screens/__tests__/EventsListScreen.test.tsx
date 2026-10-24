import React from "react";
import { Alert } from "react-native";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import EventsListScreen from "../EventsListScreen";
import { api } from "../../services/api";
import { renderWithTheme } from "../../test-utils/renderWithTheme";

jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("@react-navigation/native");
  const ReactLib = jest.requireActual("react");
  return { ...actual, useFocusEffect: (callback: () => void) => ReactLib.useEffect(callback, [callback]) };
});
jest.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { id: "ana", name: "Ana Souza" } }) }));
jest.mock("../../services/api", () => ({ api: { get: jest.fn(), post: jest.fn() } }));
jest.mock("expo-image-picker", () => ({ launchCameraAsync: jest.fn() }));

const mockedGet = api.get as jest.Mock;
const mockedPost = api.post as jest.Mock;
const navigation = { navigate: jest.fn(), goBack: jest.fn(), canGoBack: () => true };

const eventos = [
  { id: "b", title: "Torneio de Azul", dateTime: new Date(2030, 0, 12, 15).toISOString(), space: "SALÃO", participants: [] },
  { id: "a", title: "Noite de Eurogames", dateTime: new Date(2030, 0, 10, 19).toISOString(), space: "PERSONALIZADO", customLocation: "Praça", participants: [] },
];

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
  mockedGet.mockResolvedValue({ data: eventos });
});

test("mostra o título e os eventos em ordem de data", async () => {
  await renderWithTheme(<EventsListScreen navigation={navigation} />);
  expect(screen.getByText("Eventos")).toBeTruthy();
  await waitFor(() => screen.getByText("Noite de Eurogames"));
  const titles = screen.getAllByRole("button", { name: /^Ver evento/ }).map((node) => node.props.accessibilityLabel);
  expect(titles).toEqual(["Ver evento Noite de Eurogames", "Ver evento Torneio de Azul"]);
  expect(screen.getByText("Praça · 19:00")).toBeTruthy();
});

test("abrir um evento mostra a folha e confirmar chama a API", async () => {
  mockedPost.mockResolvedValueOnce({});
  await renderWithTheme(<EventsListScreen navigation={navigation} />);
  await waitFor(() => screen.getByText("Torneio de Azul"));
  await fireEvent.press(screen.getByRole("button", { name: "Ver evento Torneio de Azul" }));
  await fireEvent.press(screen.getByRole("button", { name: "Vou nessa!" }));
  expect(mockedPost).toHaveBeenCalledWith("/events/b/toggle");
});

test("o botão + leva para criar ou sugerir evento", async () => {
  await renderWithTheme(<EventsListScreen navigation={navigation} />);
  await fireEvent.press(screen.getByRole("button", { name: "Sugerir evento" }));
  expect(navigation.navigate).toHaveBeenCalledWith("AdminCreateEvent");
});

test("voltar usa a navegação", async () => {
  await renderWithTheme(<EventsListScreen navigation={navigation} />);
  await fireEvent.press(screen.getByRole("button", { name: "Voltar" }));
  expect(navigation.goBack).toHaveBeenCalled();
});

test("lista vazia mostra o dado e o convite", async () => {
  mockedGet.mockResolvedValue({ data: [] });
  await renderWithTheme(<EventsListScreen navigation={navigation} />);
  await waitFor(() => expect(screen.getByText("Nenhum evento por enquanto")).toBeTruthy());
});

test("erro mostra a tela de erro", async () => {
  mockedGet.mockRejectedValue(new Error("offline"));
  await renderWithTheme(<EventsListScreen navigation={navigation} />);
  await waitFor(() => expect(screen.getByText("Ops, caiu uma peça!")).toBeTruthy());
});

test("check-in na lista também termina em festa", async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  mockedGet.mockResolvedValue({
    data: [{ id: "h", title: "Jogatina de hoje", dateTime: today.toISOString(), space: "SALÃO", participants: [{ id: "ana", name: "Ana Souza" }], checkedInUserIds: [] }],
  });
  const ImagePicker = require("expo-image-picker");
  ImagePicker.launchCameraAsync.mockResolvedValueOnce({ canceled: false });
  mockedPost.mockResolvedValueOnce({});
  await renderWithTheme(<EventsListScreen navigation={navigation} />);
  await waitFor(() => screen.getByText("Jogatina de hoje"));
  await fireEvent.press(screen.getByRole("button", { name: "Ver evento Jogatina de hoje" }));
  await fireEvent.press(screen.getByRole("button", { name: "Fazer check-in" }));
  await waitFor(() => expect(screen.getByText("Check-in feito!")).toBeTruthy());
  expect(screen.getByText("Boa Jogatina de hoje, Ana.")).toBeTruthy();
});
