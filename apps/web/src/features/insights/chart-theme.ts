import { useTheme } from "reshaped";

/**
 * Chart colors. Series hues are the validated categorical slots 1–3, stepped
 * separately for light and dark surfaces (validated with the dataviz palette
 * checker against the Reshaped slate page colors). Ink, grid and surfaces use
 * Reshaped tokens so charts follow the active theme.
 */
const SERIES = {
  light: { blue: "#2a78d6", orange: "#eb6834", aqua: "#1baf7a" },
  dark: { blue: "#3987e5", orange: "#d95926", aqua: "#199e70" },
} as const;

export const token = {
  text: "var(--rs-color-foreground-neutral)",
  textMuted: "var(--rs-color-foreground-neutral-faded)",
  grid: "var(--rs-color-border-neutral-faded)",
  surface: "var(--rs-color-background-elevation-base)",
  overlay: "var(--rs-color-background-elevation-overlay)",
  cursor: "var(--rs-color-background-neutral-faded)",
} as const;

export function useSeriesColors() {
  const { colorMode } = useTheme();
  return SERIES[colorMode];
}

export const axisTick = { fill: token.textMuted, fontSize: 12 } as const;
