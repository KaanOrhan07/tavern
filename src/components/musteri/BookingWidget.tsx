"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Scissors,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { formatKurus } from "@/lib/utils";
import { DEFAULT_BUSINESS_TZ, addDaysYmd, todayYmdInTz } from "@/lib/business-timezone";
import { weekdayOfYmd } from "@/lib/appointments-shared";
import { toDisplayImageUrl } from "@/lib/storage-url";
import { CustomerAccountChip } from "@/components/musteri/CustomerAccountChip";

type Service = {
  id: string;
  name: string;
  durationMinutes: number;
  priceKurus: number;
  imageUrl?: string | null;
  description?: string | null;
};
type Staff = { id: string; name: string; imageUrl?: string | null };
type Slot = { startAt: string; endAt: string; label: string };
type BusinessMeta = {
  name: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  gallery: string[];
};

function Avatar({ name, imageUrl, size }: { name: string; imageUrl?: string | null; size: number }) {
  const resolved = imageUrl ? toDisplayImageUrl(imageUrl) : null;
  const [failed, setFailed] = useState(false);
  if (resolved && !failed) {
    return (
      <Image
        src={resolved}
        alt={name}
        width={size}
        height={size}
        className="h-full w-full object-cover"
        unoptimized={resolved.startsWith("/api/")}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span className="flex h-full w-full items-center justify-center bg-gold/15 text-base font-semibold text-gold">
      {name.slice(0, 1).toLocaleUpperCase("tr")}
    </span>
  );
}

export function BookingWidget({ slug }: { slug: string }) {
  const [business, setBusiness] = useState<BusinessMeta | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState("");
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerProfileId, setCustomerProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ cancelToken: string; startAt: string } | null>(null);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const slotsRef = useRef<HTMLDivElement | null>(null);

  // Scroll ilerlemesini aurora gradyanına bağla (--sp: 0..1)
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const max = el.scrollHeight - window.innerHeight;
        const sp = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
        el.style.setProperty("--sp", sp.toFixed(3));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [business]);

  useEffect(() => {
    fetch(`/api/public/appointments/meta?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setBusiness(data.business);
          setServices(data.services);
          setStaff(data.staff);
          if (Array.isArray(data.workDays)) setWorkDays(data.workDays);
          if (data.services[0]) setServiceId(data.services[0].id);
          if (data.staff[0]) setStaffId(data.staff[0].id);
        }
      })
      .catch(() => setError("Randevu bilgileri yüklenemedi"));
  }, [slug]);

  useEffect(() => {
    fetch("/api/public/customer/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data?.profile) return;
        setCustomerProfileId(data.profile.id);
        setCustomerPhone(data.profile.phone ?? "");
        if (data.profile.fullName) setCustomerName(data.profile.fullName);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- yükleme durumu; slot verisi fetch sonrası gelir
    setSlots(null);
    if (!serviceId || !staffId || !date) return;
    let cancelled = false;
    fetch(
      `/api/public/appointments/slots?slug=${encodeURIComponent(slug)}&serviceId=${serviceId}&staffId=${staffId}&date=${date}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setSlots(data.ok ? data.slots : []);
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, serviceId, staffId, date]);

  const today = todayYmdInTz();
  const selectedService = services.find((s) => s.id === serviceId);
  const selectedStaff = staff.find((s) => s.id === staffId);
  const canBook = Boolean(selectedSlot && serviceId && staffId && customerName && customerPhone);

  function pickDate(ymd: string) {
    setDate(ymd);
    setSelectedSlot(null);
    requestAnimationFrame(() => slotsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  async function book(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/public/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        serviceId,
        staffId,
        startAt: selectedSlot,
        customerName,
        customerPhone,
        customerProfileId: customerProfileId ?? undefined,
      }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.appointment) {
      setSuccess({ cancelToken: data.appointment.cancelToken, startAt: data.appointment.startAt });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setError(data?.error ?? "Randevu alınamadı");
    }
    setLoading(false);
  }

  async function cancelBooking() {
    if (!success) return;
    setLoading(true);
    const res = await fetch("/api/public/appointments/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cancelToken: success.cancelToken }),
    });
    if (res.ok) {
      setSuccess(null);
      setSelectedSlot(null);
      setError(null);
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "İptal edilemedi");
    }
    setLoading(false);
  }

  const cover = business?.bannerUrl ? toDisplayImageUrl(business.bannerUrl) : null;
  const logo = business?.logoUrl ? toDisplayImageUrl(business.logoUrl) : null;
  const gallery = (business?.gallery ?? []).map(toDisplayImageUrl);

  if (success) {
    return (
      <div className="relative mx-auto max-w-lg px-4 pt-10">
        <div className="anim-scale-in flex flex-col items-center rounded-3xl border border-gold/30 bg-ink-card p-6 text-center shadow-[var(--shadow-3)]">
          <span className="anim-pop flex h-16 w-16 items-center justify-center rounded-full bg-ok/15 text-ok">
            <CheckCircle2 className="h-9 w-9" aria-hidden />
          </span>
          <h2 className="mt-4 text-xl font-semibold text-cream [font-family:var(--tv-heading-font,inherit)]">
            Randevu talebin alındı!
          </h2>
          <p className="mt-1 text-sm text-cream-dim">İşletme onayladığında randevun kesinleşir ve sana haber verilir.</p>
          <div className="mt-4 w-full rounded-2xl border border-ink-line bg-ink px-4 py-3 text-sm">
            <p className="font-medium text-gold">
              {new Date(success.startAt).toLocaleString("tr-TR", {
                dateStyle: "full",
                timeStyle: "short",
                timeZone: DEFAULT_BUSINESS_TZ,
              })}
            </p>
            {selectedService && selectedStaff && (
              <p className="mt-1 text-cream-dim">
                {selectedService.name} · {selectedStaff.name}
              </p>
            )}
          </div>
          <div className="mt-5 flex w-full flex-col gap-2">
            {customerProfileId && (
              <Link
                href="/panel/hesabim"
                className="pressable flex min-h-11 items-center justify-center rounded-xl bg-gold font-semibold text-ink hover:bg-gold-light"
              >
                Hesabımda gör
              </Link>
            )}
            <Button variant="secondary" onClick={cancelBooking} disabled={loading}>
              {loading ? "İptal ediliyor…" : "Randevuyu iptal et"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative isolate">
      {/* Akan gradyan arka plan (scroll'a tepki verir) */}
      <div className="aurora pointer-events-none fixed inset-0 -z-10" aria-hidden />

      {/* ---------- Kapak ---------- */}
      <header className="relative overflow-hidden rounded-b-[2rem]">
        <div className="absolute inset-0 -z-10" aria-hidden>
          {cover ? (
            <Image
              src={cover}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover brightness-[0.5] [animation:kenburns_18s_ease-out_forwards]"
              unoptimized={cover.startsWith("/api/")}
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--color-gold)_32%,transparent),transparent_60%)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-ink/70 to-ink" />
        </div>

        <div className="flex flex-col items-center px-5 pb-8 pt-[max(2.75rem,calc(env(safe-area-inset-top)+1.75rem))] text-center">
          <div className="mb-3 flex w-full justify-end">
            <CustomerAccountChip returnTo={`/${slug}/randevu`} />
          </div>
          {logo ? (
            <Image
              src={logo}
              alt={business?.name ?? ""}
              width={76}
              height={76}
              className="h-[4.75rem] w-[4.75rem] rounded-2xl object-cover shadow-[var(--shadow-3)] ring-2 ring-gold/50"
              priority
              unoptimized={logo.startsWith("/api/")}
            />
          ) : (
            <div className="flex h-[4.75rem] w-[4.75rem] items-center justify-center rounded-2xl bg-gold/20 text-2xl font-semibold text-gold ring-2 ring-gold/50">
              {(business?.name ?? "").slice(0, 1)}
            </div>
          )}
          <h1 className="anim-fade-up mt-3 text-balance text-2xl font-semibold leading-tight text-cream [font-family:var(--tv-heading-font,inherit)]">
            {business?.name ?? "Randevu"}
          </h1>
          <p className="anim-fade-up mt-1 inline-flex items-center gap-1.5 text-sm text-cream-dim">
            <Sparkles className="h-4 w-4 text-gold" aria-hidden />
            Birkaç adımda randevunu oluştur
          </p>
        </div>
      </header>

      {/* ---------- Galeri ---------- */}
      {gallery.length > 0 && (
        <div className="fade-edges hide-scrollbar -mt-3 flex gap-3 overflow-x-auto px-4 pb-1 [-webkit-overflow-scrolling:touch]">
          {gallery.map((src, i) => (
            <div
              key={i}
              className="anim-fade-up relative h-28 w-40 shrink-0 overflow-hidden rounded-2xl border border-white/10 shadow-[var(--shadow-2)]"
              style={{ ["--i" as string]: Math.min(i, 8) }}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="160px"
                className="object-cover"
                unoptimized={src.startsWith("/api/")}
              />
            </div>
          ))}
        </div>
      )}

      <div className="mx-auto max-w-lg space-y-7 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-6">
        {error && (
          <p className="anim-fade-in rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        {!customerProfileId && (
          <p className="rounded-xl border border-ink-line bg-ink-card/70 px-3 py-2.5 text-xs text-cream-dim">
            İstersen{" "}
            <Link href={`/panel/kayit-ol?next=/${slug}/randevu`} className="font-medium text-gold hover:underline">
              hesap aç
            </Link>{" "}
            — randevu geçmişin kaydolur. Misafir olarak da devam edebilirsin.
          </p>
        )}

        {/* ---------- Adım 1: Hizmet ---------- */}
        <section>
          <StepHead icon={<Scissors className="h-4 w-4" aria-hidden />} n={1} title="Hizmet seç" />
          {services.length === 0 ? (
            <p className="text-sm text-cream-dim">Henüz hizmet tanımlanmamış.</p>
          ) : (
            <div className="stagger grid grid-cols-2 gap-3">
              {services.map((s, i) => {
                const img = s.imageUrl ? toDisplayImageUrl(s.imageUrl) : null;
                const active = serviceId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setServiceId(s.id);
                      setSelectedSlot(null);
                    }}
                    style={{ ["--i" as string]: Math.min(i, 10) }}
                    aria-pressed={active}
                    className={`pressable group relative flex min-h-[8.5rem] flex-col justify-end overflow-hidden rounded-2xl border p-3 text-start shadow-[var(--shadow-1)] ${
                      active ? "border-gold ring-2 ring-gold" : "border-ink-line hover:border-gold-dark"
                    }`}
                  >
                    <span className="absolute inset-0 -z-10" aria-hidden>
                      {img ? (
                        <Image
                          src={img}
                          alt=""
                          fill
                          sizes="(max-width:640px) 50vw, 240px"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          unoptimized={img.startsWith("/api/")}
                        />
                      ) : (
                        <span className="block h-full w-full bg-gradient-to-br from-gold/25 via-ink-card to-ink-soft" />
                      )}
                      <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                    </span>
                    {active && (
                      <span className="anim-pop absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gold text-ink">
                        <Check className="h-4 w-4" aria-hidden />
                      </span>
                    )}
                    <span className="text-sm font-semibold leading-snug text-white drop-shadow">{s.name}</span>
                    {s.description && (
                      <span className="mt-0.5 line-clamp-1 text-[11px] text-white/70">{s.description}</span>
                    )}
                    <span className="mt-1 flex items-center justify-between text-[11px] text-white/85">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" aria-hidden />
                        {s.durationMinutes} dk
                      </span>
                      <span className="font-semibold text-gold">{formatKurus(s.priceKurus)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ---------- Adım 2: Personel ---------- */}
        {serviceId && (
          <section className="anim-fade-up">
            <StepHead icon={<UserIcon className="h-4 w-4" aria-hidden />} n={2} title="Personel seç" />
            {staff.length === 0 ? (
              <p className="text-sm text-cream-dim">Personel tanımlı değil.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {staff.map((s) => {
                  const active = staffId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setStaffId(s.id);
                        setSelectedSlot(null);
                      }}
                      aria-pressed={active}
                      className={`pressable flex min-w-[4.5rem] flex-col items-center gap-1.5 rounded-2xl border p-2.5 ${
                        active ? "border-gold bg-gold/10 ring-1 ring-gold" : "border-ink-line hover:border-gold-dark"
                      }`}
                    >
                      <span
                        className={`relative h-14 w-14 overflow-hidden rounded-full ring-2 ${
                          active ? "ring-gold" : "ring-ink-line"
                        }`}
                      >
                        <Avatar name={s.name} imageUrl={s.imageUrl} size={56} />
                        {active && (
                          <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-ink ring-2 ring-ink-card">
                            <Check className="h-3 w-3" aria-hidden />
                          </span>
                        )}
                      </span>
                      <span className="max-w-[4.5rem] truncate text-xs font-medium text-cream">{s.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ---------- Adım 3: Tarih ---------- */}
        {serviceId && staffId && (
          <section className="anim-fade-up">
            <StepHead icon={<Calendar className="h-4 w-4" aria-hidden />} n={3} title="Gün seç" />
            <div className="fade-edges hide-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-2 [-webkit-overflow-scrolling:touch]">
              {Array.from({ length: 21 }, (_, i) => addDaysYmd(today, i)).map((ymd) => {
                const open = workDays.includes(weekdayOfYmd(ymd));
                const [y, m, d] = ymd.split("-").map(Number);
                const dt = new Date(Date.UTC(y, m - 1, d));
                const dow = new Intl.DateTimeFormat("tr-TR", { weekday: "short", timeZone: "UTC" }).format(dt);
                const active = date === ymd;
                return (
                  <button
                    key={ymd}
                    type="button"
                    disabled={!open}
                    title={open ? undefined : "Bu gün kapalı"}
                    onClick={() => pickDate(ymd)}
                    className={`pressable flex min-w-[3.5rem] shrink-0 flex-col items-center rounded-xl border px-2 py-2.5 ${
                      active
                        ? "border-gold bg-gold text-ink"
                        : open
                          ? "border-ink-line bg-ink-card hover:border-gold-dark"
                          : "cursor-not-allowed border-ink-line/40 text-cream-dim/40 line-through"
                    }`}
                  >
                    <span className="text-[11px] uppercase">{dow}</span>
                    <span className="text-lg font-semibold tabular">{d}</span>
                  </button>
                );
              })}
            </div>
            {!date && (
              <p className="text-[11px] text-cream-dim">Bir gün seç. Üstü çizili günler işletme kapalı.</p>
            )}
          </section>
        )}

        {/* ---------- Adım 4: Saat ---------- */}
        {date && (
          <section ref={slotsRef} className="anim-fade-up scroll-mt-20">
            <StepHead
              icon={<Clock className="h-4 w-4" aria-hidden />}
              n={4}
              title={`Saat seç${selectedService ? ` · ~${selectedService.durationMinutes} dk` : ""}`}
            />
            {slots === null ? (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="skeleton h-10 w-20 rounded-xl" />
                ))}
              </div>
            ) : slots.length === 0 ? (
              <p className="rounded-xl border border-dashed border-ink-line px-3 py-4 text-center text-sm text-cream-dim">
                Bu gün için müsait saat yok. Başka bir gün dene.
              </p>
            ) : (
              <div className="stagger flex flex-wrap gap-2">
                {slots.map((slot, i) => {
                  const active = selectedSlot === slot.startAt;
                  return (
                    <button
                      key={slot.startAt}
                      type="button"
                      onClick={() => setSelectedSlot(slot.startAt)}
                      aria-pressed={active}
                      style={{ ["--i" as string]: Math.min(i, 12) }}
                      className={`pressable tabular min-w-[4.5rem] rounded-xl border px-3 py-2.5 text-sm font-medium ${
                        active
                          ? "border-gold bg-gold text-ink"
                          : "border-ink-line bg-ink-card hover:border-gold-dark"
                      }`}
                    >
                      {slot.label}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ---------- Bilgiler ---------- */}
        {selectedSlot && (
          <section className="anim-fade-up space-y-3">
            <StepHead icon={<UserIcon className="h-4 w-4" aria-hidden />} n={5} title="Bilgilerin" />
            <div>
              <Label>Ad Soyad</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="05xx xxx xx xx"
                inputMode="tel"
                autoComplete="tel"
                required
                readOnly={Boolean(customerProfileId)}
              />
            </div>
          </section>
        )}
      </div>

      {/* ---------- Yapışkan özet çubuğu ---------- */}
      <form
        onSubmit={book}
        className="glass safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-ink-line px-4 pt-2.5"
      >
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            {selectedService ? (
              <>
                <p className="truncate text-sm font-medium text-cream">
                  {selectedService.name}
                  {selectedStaff ? ` · ${selectedStaff.name}` : ""}
                </p>
                <p className="truncate text-xs text-cream-dim">
                  {selectedSlot
                    ? new Date(selectedSlot).toLocaleString("tr-TR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: DEFAULT_BUSINESS_TZ,
                      })
                    : "Gün ve saat seç"}{" "}
                  · <span className="font-semibold text-gold">{formatKurus(selectedService.priceKurus)}</span>
                </p>
              </>
            ) : (
              <p className="text-sm text-cream-dim">Hizmet seçerek başla</p>
            )}
          </div>
          <Button type="submit" disabled={!canBook || loading} className="shrink-0">
            {loading ? (
              "Kaydediliyor…"
            ) : (
              <>
                Randevu Al
                <ChevronRight className="h-4 w-4" aria-hidden />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

function StepHead({ icon, n, title }: { icon: React.ReactNode; n: number; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold/15 text-gold">{icon}</span>
      <h2 className="text-sm font-semibold text-cream">
        <span className="text-cream-dim">{n}.</span> {title}
      </h2>
    </div>
  );
}
