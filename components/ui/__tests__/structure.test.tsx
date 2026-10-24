import React from "react";
import { StyleSheet, Text } from "react-native";
import { fireEvent, screen } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import { Plus } from "lucide-react-native";
import { BottomSheet } from "../BottomSheet";
import { Celebration } from "../Celebration";
import { ChatBubble } from "../ChatBubble";
import { CodeInput } from "../CodeInput";
import { EmptyState } from "../EmptyState";
import { ErrorState } from "../ErrorState";
import { Fab } from "../Fab";
import { LoadingState } from "../LoadingState";
import { Screen, TAB_BAR_HEIGHT } from "../Screen";
import { ScreenHeader } from "../ScreenHeader";
import { Skeleton } from "../Skeleton";
import { palettes } from "../../../theme/tokens";
import { renderWithTheme, testInsets } from "../../../test-utils/renderWithTheme";
import { useReducedMotion } from "../../../motion/reducedMotion";

jest.mock("../../../motion/reducedMotion", () => ({ useReducedMotion: jest.fn(() => false) }));
const mockedReducedMotion = useReducedMotion as jest.MockedFunction<typeof useReducedMotion>;

const flat = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style);
const light = palettes.light;

beforeEach(() => {
  jest.clearAllMocks();
  mockedReducedMotion.mockReturnValue(false);
});

describe("ChatBubble", () => {
  test("mensagem longa respeita a largura máxima", async () => {
    const text = "jogo ".repeat(100);
    await renderWithTheme(<ChatBubble text={text} mine={false} testID="b" />);
    expect(screen.getByText(text)).toBeTruthy();
    expect(flat("b").maxWidth).toBe("78%");
  });

  test("minha mensagem é amarela, à direita, com o canto do rabinho", async () => {
    await renderWithTheme(<ChatBubble text="bora!" mine testID="b" />);
    expect(flat("b")).toMatchObject({ backgroundColor: light.yellow, alignSelf: "flex-end", borderBottomRightRadius: 6 });
  });

  test("mensagem dos outros é neutra, à esquerda", async () => {
    await renderWithTheme(<ChatBubble text="oi" mine={false} testID="b" />);
    expect(flat("b")).toMatchObject({ backgroundColor: light.surface, alignSelf: "flex-start", borderBottomLeftRadius: 6 });
  });

  test("mostra a hora quando informada", async () => {
    await renderWithTheme(<ChatBubble text="oi" mine time="21:04" />);
    expect(screen.getByText("21:04")).toBeTruthy();
  });
});

describe("estados", () => {
  test("ErrorState mostra a mensagem da Mipo e tenta de novo", async () => {
    const onRetry = jest.fn();
    await renderWithTheme(<ErrorState onRetry={onRetry} />);
    expect(screen.getByText("Ops, caiu uma peça!")).toBeTruthy();
    expect(screen.getByText(/Confere sua internet/)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(onRetry).toHaveBeenCalled();
  });

  test("ErrorState aceita mensagem própria", async () => {
    await renderWithTheme(<ErrorState onRetry={jest.fn()} message="Não deu pra carregar os avisos." />);
    expect(screen.getByText("Não deu pra carregar os avisos.")).toBeTruthy();
  });

  test("EmptyState sem ação não mostra botão", async () => {
    await renderWithTheme(<EmptyState character="carta5" title="Tudo em dia por aqui" />);
    expect(screen.getByText("Tudo em dia por aqui")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  test("EmptyState com ação dispara o callback", async () => {
    const onPress = jest.fn();
    await renderWithTheme(
      <EmptyState character="carta5" title="Tudo em dia" message="Nada novo." action={{ label: "Ver eventos", onPress }} />,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Ver eventos" }));
    expect(onPress).toHaveBeenCalled();
  });

  test("LoadingState tem texto padrão e é anunciado como ocupado", async () => {
    await renderWithTheme(<LoadingState testID="l" />);
    expect(screen.getByText("Embaralhando as cartas...")).toBeTruthy();
    expect(screen.getByTestId("l").props.accessibilityState).toMatchObject({ busy: true });
  });

  test("LoadingState desenha a quantidade pedida de skeletons", async () => {
    await renderWithTheme(<LoadingState skeletons={2} />);
    expect(screen.getAllByTestId("skeleton")).toHaveLength(2);
  });

  test("Skeleton fica parado com reduzir movimento", async () => {
    mockedReducedMotion.mockReturnValue(true);
    await renderWithTheme(<Skeleton height={90} testID="s" />);
    expect(screen.queryByTestId("s-shine")).toBeNull();
  });

  test("Skeleton tem brilho correndo normalmente", async () => {
    await renderWithTheme(<Skeleton height={90} testID="s" />);
    expect(screen.getByTestId("s-shine")).toBeTruthy();
  });
});

describe("Celebration", () => {
  test("invisível não renderiza nada", async () => {
    await renderWithTheme(<Celebration visible={false} title="Check-in feito!" character="dado1" onClose={jest.fn()} />);
    expect(screen.queryByText("Check-in feito!")).toBeNull();
  });

  test("visível mostra título, recompensa, confete e dá háptico de sucesso", async () => {
    await renderWithTheme(
      <Celebration visible title="Check-in feito!" reward="Você ganhou pontos de participação" character="dado1" onClose={jest.fn()} />,
    );
    expect(screen.getByText("Check-in feito!")).toBeTruthy();
    expect(screen.getByText("Você ganhou pontos de participação")).toBeTruthy();
    expect(screen.getAllByTestId("confetti")).toHaveLength(8);
    expect(Haptics.notificationAsync).toHaveBeenCalled();
  });

  test("com reduzir movimento não solta confete", async () => {
    mockedReducedMotion.mockReturnValue(true);
    await renderWithTheme(<Celebration visible title="Check-in feito!" character="dado1" onClose={jest.fn()} />);
    expect(screen.queryAllByTestId("confetti")).toHaveLength(0);
  });

  test("o botão fecha", async () => {
    const onClose = jest.fn();
    await renderWithTheme(<Celebration visible title="Check-in feito!" character="dado1" ctaLabel="Bora!" onClose={onClose} />);
    await fireEvent.press(screen.getByRole("button", { name: "Bora!" }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("CodeInput", () => {
  test("mostra os dígitos digitados nas caixas", async () => {
    await renderWithTheme(<CodeInput length={6} value="481" onChange={jest.fn()} />);
    expect(screen.getByText("4")).toBeTruthy();
    expect(screen.getByText("8")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
  });

  test("aceita só números e corta no tamanho", async () => {
    const onChange = jest.fn();
    await renderWithTheme(<CodeInput length={6} value="" onChange={onChange} testID="code" />);
    await fireEvent.changeText(screen.getByTestId("code"), "12a3-4567 89");
    expect(onChange).toHaveBeenCalledWith("123456");
  });

  test("destaca a próxima caixa a preencher", async () => {
    await renderWithTheme(<CodeInput length={6} value="48" onChange={jest.fn()} testID="code" />);
    expect(flat("code-box-2").backgroundColor).toBe(light.yellow);
    expect(flat("code-box-3").backgroundColor).toBe(light.surface);
  });

  test("é anunciado como campo de código", async () => {
    await renderWithTheme(<CodeInput length={6} value="" onChange={jest.fn()} testID="code" />);
    expect(screen.getByTestId("code").props.accessibilityLabel).toBe("Código de 6 dígitos");
  });
});

describe("estrutura", () => {
  test("ScreenHeader mostra título e volta", async () => {
    const onBack = jest.fn();
    await renderWithTheme(<ScreenHeader title="Eventos" onBack={onBack} />);
    expect(screen.getByText("Eventos")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Voltar" }));
    expect(onBack).toHaveBeenCalled();
  });

  test("ScreenHeader sem navegação e sem onBack não mostra voltar", async () => {
    await renderWithTheme(<ScreenHeader title="Avisos" />);
    expect(screen.queryByRole("button", { name: "Voltar" })).toBeNull();
  });

  test("Screen com barra de abas reserva espaço para ela e a área de gestos", async () => {
    await renderWithTheme(
      <Screen withTabBar testID="s">
        <Text>oi</Text>
      </Screen>,
    );
    expect(flat("s-content").paddingBottom).toBe(TAB_BAR_HEIGHT + testInsets.bottom + 16);
  });

  test("Screen respeita a área segura do topo", async () => {
    await renderWithTheme(
      <Screen testID="s">
        <Text>oi</Text>
      </Screen>,
    );
    expect(flat("s").paddingTop).toBe(testInsets.top);
  });

  test("Screen hero pinta o fundo de amarelo", async () => {
    await renderWithTheme(
      <Screen background="hero" testID="s">
        <Text>oi</Text>
      </Screen>,
    );
    expect(flat("s").backgroundColor).toBe(light.hero);
  });

  test("Fab exige rótulo acessível", async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Fab icon={Plus} onPress={onPress} accessibilityLabel="Novo evento" />);
    await fireEvent.press(screen.getByRole("button", { name: "Novo evento" }));
    expect(onPress).toHaveBeenCalled();
  });
});

describe("BottomSheet", () => {
  test("fechado não mostra o conteúdo", async () => {
    await renderWithTheme(
      <BottomSheet visible={false} onClose={jest.fn()}>
        <Text>detalhes</Text>
      </BottomSheet>,
    );
    expect(screen.queryByText("detalhes")).toBeNull();
  });

  test("aberto mostra o conteúdo e fecha ao tocar fora", async () => {
    const onClose = jest.fn();
    await renderWithTheme(
      <BottomSheet visible onClose={onClose}>
        <Text>detalhes</Text>
      </BottomSheet>,
    );
    expect(screen.getByText("detalhes")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Fechar" }));
    expect(onClose).toHaveBeenCalled();
  });
});
