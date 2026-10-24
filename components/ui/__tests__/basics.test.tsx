import React from "react";
import { StyleSheet, Text } from "react-native";
import { fireEvent, screen } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import { Heart } from "lucide-react-native";
import { Card } from "../Card";
import { Chip } from "../Chip";
import { CountBadge } from "../CountBadge";
import { Checkbox } from "../Checkbox";
import { DateBlock } from "../DateBlock";
import { FieldLabel } from "../FieldLabel";
import { GameTile } from "../GameTile";
import { IconBox } from "../IconBox";
import { Input } from "../Input";
import { SegmentedControl } from "../SegmentedControl";
import { palettes } from "../../../theme/tokens";
import { renderWithTheme } from "../../../test-utils/renderWithTheme";

const flat = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style);
const textStyle = (text: string) => StyleSheet.flatten(screen.getByText(text).props.style);
const light = palettes.light;

beforeEach(() => jest.clearAllMocks());

describe("Card", () => {
  test("neutro usa surface com contorno de adesivo", async () => {
    await renderWithTheme(
      <Card testID="c">
        <Text>x</Text>
      </Card>,
    );
    expect(flat("c-face")).toMatchObject({ backgroundColor: light.surface, borderColor: light.line, borderWidth: 2.5 });
  });

  test("tom de destaque pinta o fundo", async () => {
    await renderWithTheme(
      <Card tone="pink" testID="c">
        <Text>x</Text>
      </Card>,
    );
    expect(flat("c-face").backgroundColor).toBe(light.pink);
  });

  test("flat não desenha sombra", async () => {
    await renderWithTheme(
      <Card flat testID="c">
        <Text>x</Text>
      </Card>,
    );
    expect(screen.queryByTestId("c-shadow")).toBeNull();
  });

  test("com onPress vira botão", async () => {
    const onPress = jest.fn();
    await renderWithTheme(
      <Card onPress={onPress} accessibilityLabel="Abrir evento">
        <Text>x</Text>
      </Card>,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Abrir evento" }));
    expect(onPress).toHaveBeenCalled();
  });
});

describe("Chip", () => {
  test("ativo inverte as cores", async () => {
    await renderWithTheme(<Chip label="Todos" tone="active" testID="chip" />);
    expect(flat("chip").backgroundColor).toBe(light.text);
    expect(textStyle("Todos").color).toBe(light.bg);
  });

  test("magenta tem texto branco", async () => {
    await renderWithTheme(<Chip label="LENDÁRIA" tone="pink" />);
    expect(textStyle("LENDÁRIA").color).toBe(light.onPink);
  });

  test("escuro usa a cor da barra de abas", async () => {
    await renderWithTheme(<Chip label="120" tone="dark" testID="chip" />);
    expect(flat("chip").backgroundColor).toBe(light.tab);
    expect(textStyle("120").color).toBe(light.tabText);
  });

  test("clicável dispara onPress e anuncia seleção", async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Chip label="Festa" onPress={onPress} selected />);
    const chip = screen.getByRole("button", { name: "Festa" });
    await fireEvent.press(chip);
    expect(onPress).toHaveBeenCalled();
    expect(chip.props.accessibilityState).toMatchObject({ selected: true });
  });

  test("texto longo não quebra linha", async () => {
    await renderWithTheme(<Chip label="Confirmados no evento de sábado" />);
    expect(screen.getByText("Confirmados no evento de sábado").props.numberOfLines).toBe(1);
  });
});

describe("CountBadge", () => {
  test.each([
    [1, "1"],
    [99, "99"],
    [150, "99+"],
  ])("%i mostra %s", async (count, text) => {
    await renderWithTheme(<CountBadge count={count} />);
    expect(screen.getByText(text)).toBeTruthy();
  });

  test.each([0, -3])("%i não renderiza", async (count) => {
    await renderWithTheme(<CountBadge count={count} testID="badge" />);
    expect(screen.queryByTestId("badge")).toBeNull();
  });
});

describe("Checkbox", () => {
  test("alterna e anuncia o estado", async () => {
    const onChange = jest.fn();
    await renderWithTheme(<Checkbox checked={false} onChange={onChange} accessibilityLabel="Luana" />);
    const box = screen.getByRole("checkbox", { name: "Luana" });
    expect(box.props.accessibilityState).toMatchObject({ checked: false });
    await fireEvent.press(box);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  test("desmarca quando já marcado", async () => {
    const onChange = jest.fn();
    await renderWithTheme(<Checkbox checked onChange={onChange} accessibilityLabel="Luana" />);
    await fireEvent.press(screen.getByRole("checkbox", { name: "Luana" }));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  test("marcado usa lima", async () => {
    await renderWithTheme(<Checkbox checked onChange={jest.fn()} accessibilityLabel="Luana" testID="cb" />);
    expect(flat("cb-box").backgroundColor).toBe(light.lime);
  });
});

describe("DateBlock", () => {
  test("mostra dia da semana abreviado em maiúsculas e o dia", async () => {
    await renderWithTheme(<DateBlock date={new Date(2026, 9, 23, 19, 30)} />);
    expect(screen.getByText("SEX")).toBeTruthy();
    expect(screen.getByText("23")).toBeTruthy();
  });

  test("sábado vira SÁB, sem ponto", async () => {
    await renderWithTheme(<DateBlock date={new Date(2026, 9, 24)} />);
    expect(screen.getByText("SÁB")).toBeTruthy();
  });

  test("é anunciado com a data por extenso", async () => {
    await renderWithTheme(<DateBlock date={new Date(2026, 9, 23)} testID="d" />);
    expect(screen.getByTestId("d").props.accessibilityLabel).toMatch(/23 de outubro/);
  });
});

describe("GameTile", () => {
  test("corta nome longo em duas linhas e meta em uma", async () => {
    const name = "Twilight Imperium: Prophecy of Kings Edição Definitiva";
    await renderWithTheme(<GameTile name={name} meta="3–6 jogadores · 240 minutos" tone="teal" />);
    expect(screen.getByText(name).props.numberOfLines).toBe(2);
    expect(screen.getByText("3–6 jogadores · 240 minutos").props.numberOfLines).toBe(1);
  });

  test("aplica a inclinação pedida", async () => {
    await renderWithTheme(<GameTile name="Azul" tone="teal" tilt={-2} testID="t" />);
    expect(flat("t").transform).toEqual([{ rotate: "-2deg" }]);
  });

  test("com imagem mostra a capa", async () => {
    await renderWithTheme(<GameTile name="Azul" tone="teal" imageUrl="https://example.com/azul.png" testID="t" />);
    expect(screen.getByTestId("t-image").props.source).toEqual({ uri: "https://example.com/azul.png" });
  });

  test("clicável é botão com o nome do jogo", async () => {
    const onPress = jest.fn();
    await renderWithTheme(<GameTile name="Azul" tone="teal" onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button", { name: "Azul" }));
    expect(onPress).toHaveBeenCalled();
  });
});

describe("SegmentedControl", () => {
  const options = [
    { value: "feed", label: "Feed" },
    { value: "amigos", label: "Amigos" },
  ];

  test("marca o segmento atual e troca com háptico", async () => {
    const onChange = jest.fn();
    await renderWithTheme(<SegmentedControl options={options} value="feed" onChange={onChange} />);
    expect(screen.getByRole("tab", { name: "Feed" }).props.accessibilityState).toMatchObject({ selected: true });
    await fireEvent.press(screen.getByRole("tab", { name: "Amigos" }));
    expect(onChange).toHaveBeenCalledWith("amigos");
    expect(Haptics.selectionAsync).toHaveBeenCalled();
  });

  test("tocar no segmento atual não dispara onChange", async () => {
    const onChange = jest.fn();
    await renderWithTheme(<SegmentedControl options={options} value="feed" onChange={onChange} />);
    await fireEvent.press(screen.getByRole("tab", { name: "Feed" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("Input, FieldLabel e IconBox", () => {
  test("Input tem área de toque mínima e placeholder na cor secundária", async () => {
    await renderWithTheme(<Input placeholder="Buscar" testID="in" />);
    expect(screen.getByPlaceholderText("Buscar").props.placeholderTextColor).toBe(light.muted);
    expect(flat("in-box").minHeight).toBeGreaterThanOrEqual(44);
  });

  test("Input repassa digitação", async () => {
    const onChangeText = jest.fn();
    await renderWithTheme(<Input placeholder="Buscar" onChangeText={onChangeText} />);
    await fireEvent.changeText(screen.getByPlaceholderText("Buscar"), "Azul");
    expect(onChangeText).toHaveBeenCalledWith("Azul");
  });

  test("FieldLabel em maiúsculas", async () => {
    await renderWithTheme(<FieldLabel>Jogadores</FieldLabel>);
    expect(textStyle("Jogadores").textTransform).toBe("uppercase");
  });

  test("IconBox pinta com o tom", async () => {
    await renderWithTheme(<IconBox icon={Heart} tone="pink" testID="ib" />);
    expect(flat("ib").backgroundColor).toBe(light.pink);
  });
});
