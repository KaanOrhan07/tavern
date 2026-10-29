export type ThemeColors = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  borderColor: string;
  headingFont: string;
  bodyFont: string;
  cardRadius: number;
  buttonRadius: number;
  animationLevel: string;
};

export function themeToCssVariables(theme: ThemeColors, opts: { bridge?: boolean } = {}): Record<string, string> {
  const base: Record<string, string> = {
    "--tv-primary": theme.primaryColor,
    "--tv-secondary": theme.secondaryColor,
    "--tv-accent": theme.accentColor,
    "--tv-bg": theme.backgroundColor,
    "--tv-surface": theme.surfaceColor,
    "--tv-text": theme.textColor,
    "--tv-muted": theme.mutedTextColor,
    "--tv-border": theme.borderColor,
    "--tv-card-radius": `${theme.cardRadius}px`,
    "--tv-button-radius": `${theme.buttonRadius}px`,
    "--tv-anim":
      theme.animationLevel === "none"
        ? "0"
        : theme.animationLevel === "low"
          ? "0.5"
          : "1",
  };
  if (!opts.bridge) return base;
  return {
    ...base,
    "--tv-heading-font": `"${theme.headingFont}", Georgia, serif`,
    "--tv-body-font": `"${theme.bodyFont}", system-ui, sans-serif`,
    // Tailwind token köprüsü: işletme teması müşteri arayüzündeki bg-ink / text-gold / text-cream sınıflarını yeniden renklendirir
    "--color-ink": theme.backgroundColor,
    "--color-ink-card": theme.surfaceColor,
    "--color-ink-soft": `color-mix(in srgb, ${theme.backgroundColor} 90%, ${theme.surfaceColor} 10%)`,
    "--color-ink-line": theme.borderColor,
    "--color-gold": theme.primaryColor,
    "--color-gold-light": theme.accentColor,
    "--color-gold-dark": `color-mix(in srgb, ${theme.primaryColor} 80%, #000 20%)`,
    "--color-cream": theme.textColor,
    "--color-cream-dim": theme.mutedTextColor,
    "--radius-card": `${theme.cardRadius}px`,
    "--radius-btn": `${theme.buttonRadius}px`,
  };
}

/** Seçili iki fontu yükleyen Google Fonts adresi (yalnızca özelleştirilmiş temalarda kullanılır) */
export function themeFontsHref(theme: Pick<ThemeColors, "headingFont" | "bodyFont">): string {
  const fams = [...new Set([theme.headingFont, theme.bodyFont])]
    .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;500;600;700`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${fams}&display=swap`;
}
