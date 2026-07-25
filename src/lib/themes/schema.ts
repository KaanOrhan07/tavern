import { z } from "zod";

export const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

export const ALLOWED_FONTS = [
  "Cormorant Garamond",
  "DM Sans",
  "Playfair Display",
  "Source Sans 3",
  "IBM Plex Sans",
] as const;

export const themeUpdateSchema = z.object({
  presetKey: z.string().max(50).optional(),
  primaryColor: hexColorSchema.optional(),
  secondaryColor: hexColorSchema.optional(),
  accentColor: hexColorSchema.optional(),
  backgroundColor: hexColorSchema.optional(),
  surfaceColor: hexColorSchema.optional(),
  textColor: hexColorSchema.optional(),
  mutedTextColor: hexColorSchema.optional(),
  borderColor: hexColorSchema.optional(),
  headingFont: z.enum(ALLOWED_FONTS).optional(),
  bodyFont: z.enum(ALLOWED_FONTS).optional(),
  cardRadius: z.number().int().min(0).max(32).optional(),
  buttonRadius: z.number().int().min(0).max(32).optional(),
  cardStyle: z.enum(["solid", "bordered", "glass"]).optional(),
  categoryCardStyle: z.string().max(40).optional(),
  productCardStyle: z.string().max(40).optional(),
  headerStyle: z.string().max(40).optional(),
  animationLevel: z.enum(["none", "low", "normal"]).optional(),
  introAnimation: z.enum(["fade", "scale", "blur", "logo"]).optional(),
});

export type ThemeUpdateInput = z.infer<typeof themeUpdateSchema>;
