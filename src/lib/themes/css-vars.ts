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

export function themeToCssVariables(theme: ThemeColors): Record<string, string> {
  return {
    "--tv-primary": theme.primaryColor,
    "--tv-secondary": theme.secondaryColor,
    "--tv-accent": theme.accentColor,
    "--tv-bg": theme.backgroundColor,
    "--tv-surface": theme.surfaceColor,
    "--tv-text": theme.textColor,
    "--tv-muted": theme.mutedTextColor,
    "--tv-border": theme.borderColor,
    "--tv-heading-font": theme.headingFont,
    "--tv-body-font": theme.bodyFont,
    "--tv-card-radius": `${theme.cardRadius}px`,
    "--tv-button-radius": `${theme.buttonRadius}px`,
    "--tv-anim":
      theme.animationLevel === "none"
        ? "0"
        : theme.animationLevel === "low"
          ? "0.5"
          : "1",
  };
}
