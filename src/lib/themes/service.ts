import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getPreset } from "@/lib/themes/presets";
import type { ThemeUpdateInput } from "@/lib/themes/schema";

export async function getOrCreateThemeSettings(businessId: string) {
  const existing = await prisma.themeSettings.findUnique({ where: { businessId } });
  if (existing) return existing;

  const preset = getPreset("modern-dark");
  return prisma.themeSettings.create({
    data: {
      businessId,
      presetKey: preset.key,
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor,
      accentColor: preset.accentColor,
      backgroundColor: preset.backgroundColor,
      surfaceColor: preset.surfaceColor,
      textColor: preset.textColor,
      mutedTextColor: preset.mutedTextColor,
      borderColor: preset.borderColor,
      headingFont: preset.headingFont,
      bodyFont: preset.bodyFont,
      cardRadius: preset.cardRadius,
      buttonRadius: preset.buttonRadius,
      cardStyle: preset.cardStyle,
      categoryCardStyle: preset.categoryCardStyle,
      productCardStyle: preset.productCardStyle,
      headerStyle: preset.headerStyle,
      animationLevel: preset.animationLevel,
      introAnimation: preset.introAnimation,
    },
  });
}

function presetFields(presetKey: string) {
  const preset = getPreset(presetKey);
  return {
    presetKey: preset.key,
    primaryColor: preset.primaryColor,
    secondaryColor: preset.secondaryColor,
    accentColor: preset.accentColor,
    backgroundColor: preset.backgroundColor,
    surfaceColor: preset.surfaceColor,
    textColor: preset.textColor,
    mutedTextColor: preset.mutedTextColor,
    borderColor: preset.borderColor,
    headingFont: preset.headingFont,
    bodyFont: preset.bodyFont,
    cardRadius: preset.cardRadius,
    buttonRadius: preset.buttonRadius,
    cardStyle: preset.cardStyle,
    categoryCardStyle: preset.categoryCardStyle,
    productCardStyle: preset.productCardStyle,
    headerStyle: preset.headerStyle,
    animationLevel: preset.animationLevel,
    introAnimation: preset.introAnimation,
  };
}

export async function updateThemeSettings(
  businessId: string,
  input: ThemeUpdateInput
) {
  await getOrCreateThemeSettings(businessId);

  const fromPreset = input.presetKey ? presetFields(input.presetKey) : {};
  const { presetKey: _pk, ...rest } = input;

  return prisma.themeSettings.update({
    where: { businessId },
    data: {
      ...fromPreset,
      ...rest,
      ...(input.presetKey ? { presetKey: input.presetKey } : {}),
      themeVersion: { increment: 1 },
    },
  });
}

export async function resetThemeSettings(businessId: string) {
  await getOrCreateThemeSettings(businessId);
  return prisma.themeSettings.update({
    where: { businessId },
    data: {
      ...presetFields("modern-dark"),
      customCssVariables: Prisma.DbNull,
      themeVersion: { increment: 1 },
    },
  });
}
