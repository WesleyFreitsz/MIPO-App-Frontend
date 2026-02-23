/**
 * Tema MIPO - Estética jovem gamer / jogos de tabuleiro
 * Cores quentes, acolhedoras, com toques de diversão e profissionalismo
 */
export const theme = {
  colors: {
    // Base
    background: "#faf6f1",      // Creme suave - como papel de tabuleiro
    surface: "#ffffff",
    surfaceElevated: "#ffffff",

    // Primárias
    primary: "#c73636",         // Vermelho coral - ação, dados
    primaryDark: "#9f1d1d",
    primaryLight: "#fef2f2",

    // Secundárias
    secondary: "#0d9488",       // Teal - moderno, calmo
    accent: "#f59e0b",          // Dourado - conquistas, recompensas
    accentLight: "#fef3c7",

    // Texto
    text: "#1c1917",
    textSecondary: "#57534e",
    textMuted: "#a8a29e",

    // Estados
    success: "#059669",
    successLight: "#d1fae5",
    warning: "#d97706",
    error: "#dc2626",
    info: "#0284c7",

    // Bordas e divisores
    border: "#e7e5e4",
    borderLight: "#f5f5f4",
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },

  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },

  typography: {
    fontSizes: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      hero: 28,
    },
    fontWeights: {
      normal: "400" as const,
      medium: "500" as const,
      semibold: "600" as const,
      bold: "700" as const,
    },
  },

  shadows: {
    sm: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 8,
    },
  },
};

export type Theme = typeof theme;
