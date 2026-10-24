import { isThemePreference, resolveColorScheme } from "../resolveColorScheme";

describe("resolveColorScheme", () => {
  test.each([
    ["system", "dark", "dark"],
    ["system", "light", "light"],
    ["system", null, "light"],
    ["system", undefined, "light"],
    ["light", "dark", "light"],
    ["dark", "light", "dark"],
    ["dark", null, "dark"],
  ] as const)("preferência %s com sistema %s resulta em %s", (preference, system, expected) => {
    expect(resolveColorScheme(preference, system)).toBe(expected);
  });
});

describe("isThemePreference", () => {
  test.each(["system", "light", "dark"])("aceita %s", (value) => {
    expect(isThemePreference(value)).toBe(true);
  });

  test.each([null, "", "Dark", "auto", "undefined"])("rejeita %p salvo por engano", (value) => {
    expect(isThemePreference(value)).toBe(false);
  });
});
