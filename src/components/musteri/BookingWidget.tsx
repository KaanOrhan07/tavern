"use client";

import { useEffect, useState } from "react";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { formatKurus } from "@/lib/utils";

type Service = { id: string; name: string; durationMinutes: number; priceKurus: number };
type Staff = { id: string; name: string };
type Slot = { startAt: string; endAt: string };

export function BookingWidget({ slug }: { slug: string }) {
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
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
          if (data.services[0]) setServiceId(data.services[0].id);
          if (data.staff[0]) setStaffId(data.staff[0].id);
        }
      })
      .catch(() => setError("Randevu bilgileri yüklenemedi"));
  }, [slug]);

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

  const today = new Date().toISOString().slice(0, 10);
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
        <p className="font-medium text-ok">Randevunuz alındı!</p>
        <p className="text-sm text-cream-dim">
          {new Date(success.startAt).toLocaleString("tr-TR", {
            dateStyle: "full",
            timeStyle: "short",
          })}
        </p>
        <Button variant="secondary" onClick={cancelBooking} disabled={loading}>
          Randevuyu İptal Et
        </Button>
      </Card>
    );
  }

  return (
    <form onSubmit={book} className="space-y-4">
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
        <Input
          type="date"
          min={today}
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setSelectedSlot(null);
          }}
          required
        />
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
                  {new Date(slot.startAt).toLocaleTimeString("tr-TR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
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
        />
      </div>

      <Button type="submit" disabled={loading || !selectedSlot || staff.length === 0} className="w-full">
        {loading ? "Kaydediliyor..." : "Randevu Al"}
      </Button>
    </form>
  );
}
