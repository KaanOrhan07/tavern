import type { Campaign, CampaignTranslation } from "@/generated/prisma/client";

export type CampaignWithTranslations = Campaign & {
  translations: CampaignTranslation[];
};

function formatHhmm(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function isWithinCampaignTimeWindow(
  startTime: string | null,
  endTime: string | null,
  now: Date
): boolean {
  if (!startTime && !endTime) return true;
  const hhmm = formatHhmm(now);
  if (startTime && endTime) {
    if (startTime <= endTime) {
      return hhmm >= startTime && hhmm <= endTime;
    }
    return hhmm >= startTime || hhmm <= endTime;
  }
  if (startTime) return hhmm >= startTime;
  if (endTime) return hhmm <= endTime;
  return true;
}

export function isCampaignActiveNow(
  campaign: Pick<
    Campaign,
    "active" | "startsAt" | "endsAt" | "daysOfWeek" | "startTime" | "endTime"
  >,
  now = new Date()
): boolean {
  if (!campaign.active) return false;
  if (now < campaign.startsAt || now > campaign.endsAt) return false;
  if (campaign.daysOfWeek.length > 0 && !campaign.daysOfWeek.includes(now.getDay())) {
    return false;
  }
  return isWithinCampaignTimeWindow(campaign.startTime, campaign.endTime, now);
}

export function filterActiveCampaigns<T extends CampaignWithTranslations>(
  campaigns: T[],
  now = new Date()
): T[] {
  return campaigns
    .filter((c) => isCampaignActiveNow(c, now))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.getTime() - b.createdAt.getTime());
}
