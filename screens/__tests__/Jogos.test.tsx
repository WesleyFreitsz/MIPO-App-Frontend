import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import GamesListScreen from "../GameListScreen";
import GameDetailScreen, { resolveVideoUrl } from "../GameDetailScreen";
import { api } from "../../services/api";
import { renderWithProviders } from "../../test-utils/renderWithProviders";
import { categoriesText, playersText } from "../jogo/jogoFormat";

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockRouteParams: Record<string, unknown> = {};

jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("@react-navigation/native");
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack, canGoBack: () => true }),
    useRoute: () => ({ params: mockRouteParams }),
  };
});
jest.mock("../../services/api", () => ({ api: { get: jest.fn(), defaults: { baseURL: "https://api.mipo" } } }));
jest.mock("expo-video", () => {
  const { View } = jest.requireActual("react-native");
  return { useVideoPlayer: () => ({}), VideoView: (props: object) => <View testID="video" {...props} /> };
});

const mockedGet = api.get as jest.Mock;

const jogos = [
  { id: "g1", name: "Azul", category: "Abstrato", minPlayers: 2, maxPlayers: 4 },
  { id: "g2", name: "Dixit", category: ["Festa", "Cartas"], minPlayers: 3, maxPlayers: 6 },
  { id: "g3", name: "Paciência", category: "Cartas", minPlayers: 1, maxPlayers: 1 },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteParams = {};
});

describe("jogoFormat", () => {
  test.each([
    [2, 4, "2–4 jogadores"],
    [1, 1, "1 jogador"],
    [4, 4, "4 jogadores"],
    [undefined, 5, "até 5 jogadores"],
    [undefined, undefined, ""],
  ])("playersText(%p, %p) = %p", (min, max, expected) => {
    expect(playersText(min, max)).toBe(expected);
  });

  test("categorias aceitam texto ou lista", () => {
    expect(categoriesText("Festa")).toBe("Festa");
    expect(categoriesText(["Festa", "Cartas"])).toBe("Festa, Cartas");
    expect(categoriesText(null)).toBe("");
  });
});

test("resolveVideoUrl completa caminhos relativos e mantém URLs absolutas", () => {
  expect(resolveVideoUrl("/videos/azul.mp4")).toBe("https://api.mipo/videos/azul.mp4");
  expect(resolveVideoUrl("https://cdn.mipo/azul.mp4")).toBe("https://cdn.mipo/azul.mp4");
  expect(resolveVideoUrl(null)).toBeNull();
});

describe("GamesListScreen", () => {
  beforeEach(() => mockedGet.mockResolvedValue({ data: jogos }));

  test("mostra o acervo em tiles com nome e jogadores", async () => {
    await renderWithProviders(<GamesListScreen />);
    expect(screen.getByText("Jogos")).toBeTruthy();
    await waitFor(() => screen.getByRole("button", { name: "Azul" }));
    expect(screen.getByText("2–4 jogadores")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Dixit" })).toBeTruthy();
  });

  test("categorias vêm dos jogos, sem repetição, começando por Todos", async () => {
    await renderWithProviders(<GamesListScreen />);
    await waitFor(() => screen.getByRole("button", { name: "Festa" }));
    const chips = screen.getAllByRole("button").map((node) => node.props.accessibilityLabel);
    expect(chips.filter((label) => ["Todos", "Abstrato", "Festa", "Cartas"].includes(label))).toEqual(["Todos", "Abstrato", "Festa", "Cartas"]);
  });

  test("filtrar por categoria busca com o parâmetro", async () => {
    await renderWithProviders(<GamesListScreen />);
    await waitFor(() => screen.getByRole("button", { name: "Festa" }));
    await fireEvent.press(screen.getByRole("button", { name: "Festa" }));
    await waitFor(() => expect(mockedGet).toHaveBeenCalledWith("/games", { params: { category: "Festa" } }));
    expect(screen.getByRole("button", { name: "Festa" }).props.accessibilityState).toMatchObject({ selected: true });
  });

  test("busca e quantidade de jogadores viram parâmetros", async () => {
    await renderWithProviders(<GamesListScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText("Buscar no acervo"), "azu");
    await fireEvent.changeText(screen.getByPlaceholderText("Jogadores"), "3");
    await waitFor(() => expect(mockedGet).toHaveBeenCalledWith("/games", { params: { search: "azu", players: "3" } }));
  });

  test("tocar no jogo abre o detalhe", async () => {
    await renderWithProviders(<GamesListScreen />);
    await waitFor(() => screen.getByRole("button", { name: "Azul" }));
    await fireEvent.press(screen.getByRole("button", { name: "Azul" }));
    expect(mockNavigate).toHaveBeenCalledWith("GameDetail", { gameId: "g1" });
  });

  test("sem resultado mostra estado vazio", async () => {
    mockedGet.mockResolvedValue({ data: [] });
    await renderWithProviders(<GamesListScreen />);
    await waitFor(() => expect(screen.getByText("Nenhum jogo encontrado")).toBeTruthy());
  });
});

describe("GameDetailScreen", () => {
  const azul = {
    id: "g1",
    name: "Azul",
    category: ["Abstrato", "Família"],
    minPlayers: 2,
    maxPlayers: 4,
    description: "Monte o mosaico mais bonito.",
    videoUrl: "/videos/azul.mp4",
  };

  test("mostra nome, categorias, jogadores e descrição", async () => {
    mockRouteParams = { gameId: "g1" };
    mockedGet.mockResolvedValue({ data: azul });
    await renderWithProviders(<GameDetailScreen />);
    await waitFor(() => screen.getByText("Monte o mosaico mais bonito."));
    expect(mockedGet).toHaveBeenCalledWith("/games/g1");
    expect(screen.getAllByText("Azul").length).toBeGreaterThan(0);
    expect(screen.getByText("Abstrato, Família")).toBeTruthy();
    expect(screen.getByText("2–4")).toBeTruthy();
    expect(screen.getByText("Sobre o jogo")).toBeTruthy();
  });

  test("vídeo relativo usa a URL da API", async () => {
    mockRouteParams = { gameId: "g1" };
    mockedGet.mockResolvedValue({ data: azul });
    await renderWithProviders(<GameDetailScreen />);
    await waitFor(() => screen.getByText("Como jogar"));
    expect(screen.getByTestId("video")).toBeTruthy();
  });

  test("sem vídeo não mostra a seção", async () => {
    mockRouteParams = { gameId: "g1" };
    mockedGet.mockResolvedValue({ data: { ...azul, videoUrl: null } });
    await renderWithProviders(<GameDetailScreen />);
    await waitFor(() => screen.getByText("Monte o mosaico mais bonito."));
    expect(screen.queryByText("Como jogar")).toBeNull();
  });

  test("não tem botão de reservar mesa", async () => {
    mockRouteParams = { gameId: "g1" };
    mockedGet.mockResolvedValue({ data: azul });
    await renderWithProviders(<GameDetailScreen />);
    await waitFor(() => screen.getByText("Monte o mosaico mais bonito."));
    expect(screen.queryByText(/Reservar/)).toBeNull();
  });

  test("voltar retorna", async () => {
    mockRouteParams = { gameId: "g1" };
    mockedGet.mockResolvedValue({ data: azul });
    await renderWithProviders(<GameDetailScreen />);
    await fireEvent.press(screen.getByRole("button", { name: "Voltar" }));
    expect(mockGoBack).toHaveBeenCalled();
  });

  test("erro ao carregar mostra a tela de erro", async () => {
    mockRouteParams = { gameId: "g1" };
    mockedGet.mockRejectedValue(new Error("offline"));
    await renderWithProviders(<GameDetailScreen />);
    await waitFor(() => expect(screen.getByText("Ops, caiu uma peça!")).toBeTruthy());
  });
});
