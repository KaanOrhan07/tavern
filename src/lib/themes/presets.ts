export type ThemePreset = {
  key: string;
  name: string;
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
  cardStyle: string;
  categoryCardStyle: string;
  productCardStyle: string;
  headerStyle: string;
  animationLevel: "none" | "low" | "normal";
  introAnimation: string;
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    key: "modern-dark",
    name: "Modern Dark",
    primaryColor: "#D4A857",
    secondaryColor: "#141311",
    accentColor: "#E8C88A",
    backgroundColor: "#0A0A0A",
    surfaceColor: "#1B1916",
    textColor: "#F5EFE0",
    mutedTextColor: "#B8B0A0",
    borderColor: "#2B2823",
    headingFont: "Cormorant Garamond",
    bodyFont: "DM Sans",
    cardRadius: 18,
    buttonRadius: 14,
    cardStyle: "solid",
    categoryCardStyle: "image-overlay",
    productCardStyle: "horizontal",
    headerStyle: "centered",
    animationLevel: "normal",
    introAnimation: "fade",
  },
  {
    key: "minimal-light",
    name: "Minimal Light",
    primaryColor: "#A87F38",
    secondaryColor: "#F1ECE0",
    accentColor: "#C99A4E",
    backgroundColor: "#FBF9F4",
    surfaceColor: "#FFFFFF",
    textColor: "#1D1A13",
    mutedTextColor: "#6B6252",
    borderColor: "#E4DBC8",
    headingFont: "Cormorant Garamond",
    bodyFont: "DM Sans",
    cardRadius: 16,
    buttonRadius: 12,
    cardStyle: "bordered",
    categoryCardStyle: "image-overlay",
    productCardStyle: "horizontal",
    headerStyle: "centered",
    animationLevel: "low",
    introAnimation: "fade",
  },
  {
    key: "coffee",
    name: "Coffee",
    primaryColor: "#C4A484",
    secondaryColor: "#2C1810",
    accentColor: "#E8D5B7",
    backgroundColor: "#1A120B",
    surfaceColor: "#2A1E14",
    textColor: "#F3E9DC",
    mutedTextColor: "#B8A090",
    borderColor: "#3D2B1F",
    headingFont: "Cormorant Garamond",
    bodyFont: "DM Sans",
    cardRadius: 20,
    buttonRadius: 14,
    cardStyle: "solid",
    categoryCardStyle: "image-overlay",
    productCardStyle: "horizontal",
    headerStyle: "centered",
    animationLevel: "normal",
    introAnimation: "blur",
  },
  {
    key: "neon",
    name: "Neon",
    primaryColor: "#22D3EE",
    secondaryColor: "#0F172A",
    accentColor: "#A78BFA",
    backgroundColor: "#020617",
    surfaceColor: "#0F172A",
    textColor: "#F8FAFC",
    mutedTextColor: "#94A3B8",
    borderColor: "#1E293B",
    headingFont: "DM Sans",
    bodyFont: "DM Sans",
    cardRadius: 12,
    buttonRadius: 10,
    cardStyle: "glass",
    categoryCardStyle: "image-overlay",
    productCardStyle: "horizontal",
    headerStyle: "centered",
    animationLevel: "normal",
    introAnimation: "scale",
  },
  {
    key: "luxury",
    name: "Luxury",
    primaryColor: "#C9A227",
    secondaryColor: "#111111",
    accentColor: "#F5E6A8",
    backgroundColor: "#0B0B0B",
    surfaceColor: "#161616",
    textColor: "#FAF6EB",
    mutedTextColor: "#A39E8F",
    borderColor: "#2A2A2A",
    headingFont: "Cormorant Garamond",
    bodyFont: "DM Sans",
    cardRadius: 8,
    buttonRadius: 6,
    cardStyle: "bordered",
    categoryCardStyle: "image-overlay",
    productCardStyle: "horizontal",
    headerStyle: "centered",
    animationLevel: "low",
    introAnimation: "logo",
  },
];

export function getPreset(key: string): ThemePreset {
  return THEME_PRESETS.find((p) => p.key === key) ?? THEME_PRESETS[0]!;
}
