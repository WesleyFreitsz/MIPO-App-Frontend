import type { ColorScheme } from "./tokens";

export type ThemePreference = "system" | "light" | "dark";

export const THEME_PREFERENCE_KEY = "mipo.themePreference";

const preferences: readonly string[] = ["system", "light", "dark"];

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && preferences.includes(value);
}

export function resolveColorScheme(
  preference: ThemePreference,
  system: ColorScheme | "unspecified" | null | undefined,
): ColorScheme {
  if (preference !== "system") return preference;
  return system === "dark" ? "dark" : "light";
}
