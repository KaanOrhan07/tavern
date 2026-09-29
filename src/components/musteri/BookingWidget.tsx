"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { formatKurus } from "@/lib/utils";
import { DEFAULT_BUSINESS_TZ, addDaysYmd, todayYmdInTz } from "@/lib/business-timezone";
import { weekdayOfYmd } from "@/lib/appointments-shared";
import { CustomerAccountChip } from "@/components/musteri/CustomerAccountChip";

type Service = { id: string; name: string; durationMinutes: number; priceKurus: number };
type Staff = { id: string; name: string };
type Slot = { startAt: string; endAt: string; label: string };

export function BookingWidget({ slug }: { slug: string }) {
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState("");
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerProfileId, setCustomerProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ cancelToken: string; startAt: string } | null>(null);

  useEffect(() => {
    fetch(`/api/public/appointments/meta?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
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
    if (!serviceId || !staffId || !date) {
      setSlots([]);
      return;
    }
    fetch(
      `/api/public/appointments/slots?slug=${encodeURIComponent(slug)}&serviceId=${serviceId}&staffId=${staffId}&date=${date}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setSlots(data.slots);
      })
      .catch(() => setSlots([]));
  }, [slug, serviceId, staffId, date]);

  const today = todayYmdInTz();
  const selectedService = services.find((s) => s.id === serviceId);

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

  if (success) {
    return (
      <Card className="space-y-3">
        <p className="font-medium text-ok">Randevu talebiniz alındı!</p>
        <p className="text-sm text-cream-dim">
          İşletme onayladıktan sonra randevunuz kesinleşir.
        </p>
        <p className="text-sm text-cream-dim">
          {new Date(success.startAt).toLocaleString("tr-TR", {
            dateStyle: "full",
            timeStyle: "short",
            timeZone: DEFAULT_BUSINESS_TZ,
          })}
        </p>
        <Button variant="secondary" onClick={cancelBooking} disabled={loading}>
          Randevuyu İptal Et
        </Button>
        {customerProfileId && (
          <Link href="/panel/hesabim" className="block text-center text-sm text-gold hover:underline">
            Hesabımda gör
          </Link>
        )}
      </Card>
    );
  }

  return (
    <form onSubmit={book} className="space-y-4">
      <div className="flex justify-end">
        <CustomerAccountChip returnTo={`/${slug}/randevu`} />
      </div>

      {!customerProfileId && (
        <p className="rounded-lg border border-ink-line bg-ink-card px-3 py-2 text-xs text-cream-dim">
          İstersen{" "}
          <Link href={`/panel/kayit-ol?next=/${slug}/randevu`} className="text-gold hover:underline">
            hesap aç
          </Link>{" "}
          — randevu geçmişin ve sık gittiğin yerler kaydolur. Misafir olarak da devam edebilirsin.
        </p>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <div>
        <Label>Hizmet</Label>
        <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.durationMinutes} dk · {formatKurus(s.priceKurus)}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label>Personel</Label>
        <Select value={staffId} onChange={(e) => setStaffId(e.target.value)} required>
          {staff.length === 0 ? (
            <option value="">Personel tanımlı değil</option>
          ) : (
            staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))
          )}
        </Select>
      </div>

      <div>
        <Label>Tarih</Label>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {Array.from({ length: 21 }, (_, i) => addDaysYmd(today, i)).map((ymd) => {
            const open = workDays.includes(weekdayOfYmd(ymd));
            const [y, m, d] = ymd.split("-").map(Number);
            const dt = new Date(Date.UTC(y, m - 1, d));
            const dow = new Intl.DateTimeFormat("tr-TR", { weekday: "short", timeZone: "UTC" }).format(dt);
            return (
              <button
                key={ymd}
                type="button"
                disabled={!open}
                title={open ? undefined : "Bu gün kapalı"}
                onClick={() => {
                  setDate(ymd);
                  setSelectedSlot(null);
                }}
                className={`flex min-w-14 shrink-0 flex-col items-center rounded-lg border px-2 py-2 text-xs ${
                  date === ymd
                    ? "border-gold bg-gold text-ink"
                    : open
                      ? "border-ink-line hover:border-gold-dark cursor-pointer"
                      : "border-ink-line/40 text-cream-dim/40 line-through cursor-not-allowed"
                }`}
              >
                <span>{dow}</span>
                <span className="text-base font-semibold">{d}</span>
              </button>
            );
          })}
        </div>
        {!date && <p className="text-[11px] text-cream-dim">Randevu için bir gün seçin. Üstü çizili günler işletme kapalı.</p>}
      </div>

      {date && (
        <div>
          <Label>Saat {selectedService ? `(~${selectedService.durationMinutes} dk)` : ""}</Label>
          {slots.length === 0 ? (
            <p className="text-sm text-cream-dim">Bu gün için müsait saat yok.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.startAt}
                  type="button"
                  onClick={() => setSelectedSlot(slot.startAt)}
                  className={`rounded-lg border px-3 py-2 text-sm cursor-pointer ${
                    selectedSlot === slot.startAt
                      ? "border-gold bg-gold text-ink"
                      : "border-ink-line hover:border-gold-dark"
                  }`}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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
          required
          readOnly={Boolean(customerProfileId)}
        />
      </div>

      <Button type="submit" disabled={loading || !selectedSlot || staff.length === 0} className="w-full">
        {loading ? "Kaydediliyor..." : "Randevu Al"}
      </Button>
    </form>
  );
}
