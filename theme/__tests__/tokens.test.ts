import { AccentName, contrastRatio, foregroundOn, palettes } from "../tokens";

const accents: AccentName[] = ["yellow", "red", "pink", "lime", "teal", "blue", "lilac", "orange"];
const schemes = ["light", "dark"] as const;

describe("palettes", () => {
  test("mantém os valores de marca definidos no spec", () => {
    expect(palettes.light).toMatchObject({
      bg: "#FFF8E7",
      hero: "#F6E22D",
      surface: "#FFFFFF",
      text: "#1E1414",
      yellow: "#F6E22D",
      red: "#E0262B",
      pink: "#E3156B",
      lime: "#B9D531",
      teal: "#7CC8B4",
      lilac: "#C9B6F0",
    });
    expect(palettes.dark).toMatchObject({
      bg: "#17111C",
      hero: "#3A1530",
      surface: "#261C2C",
      text: "#FFF3D6",
      yellow: "#F4DB3A",
      pink: "#F0418A",
    });
  });

  test("os dois temas definem exatamente os mesmos tokens", () => {
    expect(Object.keys(palettes.dark).sort()).toEqual(Object.keys(palettes.light).sort());
  });

  test.each(schemes)("texto principal e secundário passam AA sobre fundos em %s", (scheme) => {
    const p = palettes[scheme];
    for (const bg of [p.bg, p.surface, p.surface2]) {
      expect(contrastRatio(p.text, bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.muted, bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  test.each(schemes)("texto sobre cores de destaque passa AA grande (3:1) em %s", (scheme) => {
    const p = palettes[scheme];
    for (const accent of accents) {
      expect(contrastRatio(foregroundOn(accent, p), p[accent])).toBeGreaterThanOrEqual(3);
    }
  });

  test.each(schemes)("rótulos da barra de abas são legíveis em %s", (scheme) => {
    const p = palettes[scheme];
    expect(contrastRatio(p.tabText, p.tab)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.tabMuted, p.tab)).toBeGreaterThanOrEqual(3);
  });
});

describe("foregroundOn", () => {
  test("usa branco sobre magenta e vermelho", () => {
    expect(foregroundOn("pink", palettes.light)).toBe(palettes.light.onPink);
    expect(foregroundOn("red", palettes.dark)).toBe(palettes.dark.onPink);
  });

  test("usa o tom escuro sobre amarelo, lima e verde-água", () => {
    for (const accent of ["yellow", "lime", "teal"] as const) {
      expect(foregroundOn(accent, palettes.light)).toBe("#1E1414");
    }
  });
});

describe("contrastRatio", () => {
  test("preto sobre branco é 21:1", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
  });

  test("é simétrico e igual a 1 para a mesma cor", () => {
    expect(contrastRatio("#E0262B", "#FFF8E7")).toBeCloseTo(contrastRatio("#FFF8E7", "#E0262B"), 5);
    expect(contrastRatio("#7CC8B4", "#7CC8B4")).toBe(1);
  });

  test("aceita hex em minúsculas", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 1);
  });
});
