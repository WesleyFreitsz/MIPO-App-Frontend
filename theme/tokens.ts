export type ColorName =
  | "bg"
  | "hero"
  | "surface"
  | "surface2"
  | "sunken"
  | "text"
  | "muted"
  | "line"
  | "shadow"
  | "yellow"
  | "red"
  | "pink"
  | "lime"
  | "teal"
  | "blue"
  | "lilac"
  | "orange"
  | "tab"
  | "tabText"
  | "tabMuted"
  | "onColor"
  | "onPink"
  | "success"
  | "overlay";

export type Palette = Record<ColorName, string>;

export type AccentName = "yellow" | "red" | "pink" | "lime" | "teal" | "blue" | "lilac" | "orange";

export type ColorScheme = "light" | "dark";

const light: Palette = {
  bg: "#FFF8E7",
  hero: "#F6E22D",
  surface: "#FFFFFF",
  surface2: "#FFF1CC",
  sunken: "#F3E7C9",
  text: "#1E1414",
  muted: "#6B5A52",
  line: "#1E1414",
  shadow: "#1E1414",
  yellow: "#F6E22D",
  red: "#E0262B",
  pink: "#E3156B",
  lime: "#B9D531",
  teal: "#7CC8B4",
  blue: "#4A6FD8",
  lilac: "#C9B6F0",
  orange: "#F59A23",
  tab: "#1E1414",
  tabText: "#F6E22D",
  tabMuted: "#8D7B5E",
  onColor: "#1E1414",
  onPink: "#FFFFFF",
  success: "#3DBE5B",
  overlay: "rgba(20,10,15,0.55)",
};

const dark: Palette = {
  bg: "#17111C",
  hero: "#3A1530",
  surface: "#261C2C",
  surface2: "#33263A",
  sunken: "#120D16",
  text: "#FFF3D6",
  muted: "#B9A8B8",
  line: "#000000",
  shadow: "#000000",
  yellow: "#F4DB3A",
  red: "#F0474B",
  pink: "#F0418A",
  lime: "#C3DD4A",
  teal: "#7CC8B4",
  blue: "#7B95F0",
  lilac: "#B9A2EE",
  orange: "#F7A940",
  tab: "#0B070D",
  tabText: "#F4DB3A",
  tabMuted: "#7C6A80",
  onColor: "#1E1414",
  onPink: "#FFFFFF",
  success: "#3DBE5B",
  overlay: "rgba(0,0,0,0.6)",
};

export const palettes: Record<ColorScheme, Palette> = { light, dark };

const accentsWithLightForeground: AccentName[] = ["pink", "red"];

export function foregroundOn(accent: AccentName, palette: Palette): string {
  return accentsWithLightForeground.includes(accent) ? palette.onPink : palette.onColor;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { chip: 999, icon: 12, button: 14, input: 14, tile: 16, card: 20, sheet: 28 } as const;

export const stroke = { regular: 2.5, thin: 2, thick: 3 } as const;

export const offset = { card: 4, button: 3, hero: 5 } as const;

export const fontFamily = {
  display: "Fredoka_700Bold",
  displaySemi: "Fredoka_600SemiBold",
  body: "Nunito_600SemiBold",
  bodyBold: "Nunito_700Bold",
  bodyHeavy: "Nunito_800ExtraBold",
  bodyBlack: "Nunito_900Black",
} as const;

export const typeScale = {
  hero: 30,
  screenTitle: 26,
  section: 18,
  cardTitle: 16,
  body: 13,
  caption: 12,
  micro: 10.5,
} as const;

export { contrastRatio } from "./contrast";
