import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/sms";
import { DEFAULT_BUSINESS_TZ, formatDateInTz } from "@/lib/business-timezone";

const DAY_MS = 86_400_000;

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeZone: DEFAULT_BUSINESS_TZ }).format(d);
}

/**
 * Ödeme penceresi bildirimleri (cron günde 1 kez yeterli, saatlik de güvenli — idempotent):
 *  1. Pencere başlangıcından ≤3 gün önce → ana admine panel-içi bildirim
 *  2. Pencere başladığında → işletmeye SMS + panel-içi bildirim
 *  3. Pencere bittiği hâlde ödeme kaydı yoksa → durum "overdue"
 */
export async function runPaymentJobs() {
  const now = new Date();
  const subs = await prisma.businessSubscription.findMany({
    where: { paymentWindowStart: { not: null }, business: { active: true } },
    include: {
      business: { select: { id: true, name: true, businessInfo: { select: { phone: true } } } },
    },
  });

  let adminNotices = 0;
  let businessNotices = 0;
  let overdue = 0;

  for (const sub of subs) {
    const start = sub.paymentWindowStart!;
    const end = new Date(start.getTime() + sub.paymentWindowDays * DAY_MS);
    const untilStart = start.getTime() - now.getTime();

    // 1) 3 gün önce: ana admin uyarısı (pencere başına bir kez)
    if (
      untilStart > 0 &&
      untilStart <= 3 * DAY_MS &&
      (!sub.adminNotifiedAt || sub.adminNotifiedAt < new Date(start.getTime() - 4 * DAY_MS))
    ) {
      await prisma.$transaction([
        prisma.adminNotification.create({
          data: {
            businessId: sub.businessId,
            message: `${sub.business.name}: ödeme günü yaklaşıyor (${fmtDate(start)}, ${sub.paymentWindowDays} günlük pencere)`,
          },
        }),
        prisma.businessSubscription.update({
          where: { businessId: sub.businessId },
          data: { adminNotifiedAt: now },
        }),
      ]);
      adminNotices++;
    }

    // 2) Pencere açıldı: işletmeye SMS + panel bildirimi (pencere başına bir kez)
    if (
      now >= start &&
      now <= end &&
      (!sub.businessNotifiedAt || sub.businessNotifiedAt < start)
    ) {
      const text = `Tavern abonelik ödemeniz için ödeme dönemi başladı (${fmtDate(start)} – ${fmtDate(end)}). Detay için yönetici ile iletişime geçin.`;
      await prisma.$transaction([
        prisma.notification.create({
          data: { businessId: sub.businessId, type: "PAYMENT_DUE", message: text },
        }),
        prisma.businessSubscription.update({
          where: { businessId: sub.businessId },
          data: { businessNotifiedAt: now, paymentStatus: sub.paymentStatus === "overdue" ? "overdue" : "pending" },
        }),
      ]);
      const phone = sub.business.businessInfo?.phone;
      if (phone) await sendSms(phone, text, "transactional");
      businessNotices++;
    }

    // 3) Pencere bitti, ödeme yok → gecikmiş
    if (now > end && sub.paymentStatus !== "current" && sub.paymentStatus !== "overdue") {
      await prisma.businessSubscription.update({
        where: { businessId: sub.businessId },
        data: { paymentStatus: "overdue" },
      });
      overdue++;
    }
  }
  return { adminNotices, businessNotices, overdue, checkedOn: formatDateInTz(now) };
}
