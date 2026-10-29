import {
  BarChart3,
  BellRing,
  Boxes,
  CalendarDays,
  ClipboardCheck,
  LayoutDashboard,
  LayoutGrid,
  Megaphone,
  Palette,
  Receipt,
  Scissors,
  Settings,
  Sparkles,
  UserCog,
  Users,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { FeatureKey } from "@/lib/feature-defs";

export type NavEntry = {
  href: string;
  label: string;
  group: string;
  icon: LucideIcon;
  ownerOnly?: boolean;
  feature?: FeatureKey;
  /** Alt çubukta (mobil) sabit gösterilir */
  primary?: boolean;
  /** Komut paleti arama eş anlamlıları */
  keywords?: string;
};

export function buildNav(base: string, barber: boolean): NavEntry[] {
  if (barber) {
    return [
      { href: `${base}/dashboard`, label: "Genel Bakış", group: "Günlük", icon: LayoutDashboard, ownerOnly: true, primary: true, keywords: "ana sayfa özet ciro" },
      { href: `${base}/randevular`, label: "Randevular", group: "Günlük", icon: CalendarDays, primary: true, keywords: "takvim müşteri saat" },
      { href: `${base}/hizmetler`, label: "Hizmetler", group: "Yönetim", icon: Scissors, ownerOnly: true, primary: true, keywords: "fiyat süre kesim" },
      { href: `${base}/stok`, label: "Stok", group: "Yönetim", icon: Boxes, ownerOnly: true, feature: "stock", keywords: "malzeme ürün" },
      { href: `${base}/personeller`, label: "Personeller", group: "Yönetim", icon: UserCog, ownerOnly: true, keywords: "çalışan berber ekip" },
      { href: `${base}/raporlar`, label: "Raporlar", group: "Raporlar", icon: BarChart3, ownerOnly: true, keywords: "grafik ciro doluluk no-show personel" },
      { href: `${base}/ayarlar`, label: "Ayarlar", group: "Yönetim", icon: Settings, ownerOnly: true, keywords: "profil çalışma saatleri şifre" },
    ];
  }
  return [
    { href: `${base}/dashboard`, label: "Genel Bakış", group: "Günlük", icon: LayoutDashboard, ownerOnly: true, primary: true, keywords: "ana sayfa özet ciro" },
    { href: `${base}/masalar`, label: "Masalar", group: "Günlük", icon: LayoutGrid, primary: true, keywords: "salon sipariş adisyon" },
    { href: `${base}/adisyon`, label: "Adisyon", group: "Günlük", icon: Receipt, primary: true, keywords: "hesap ödeme fiş" },
    { href: `${base}/talepler`, label: "Talepler", group: "Günlük", icon: BellRing, feature: "staff_requests", primary: true, keywords: "garson çağır hesap iste" },
    { href: `${base}/menu`, label: "Menü", group: "Menü & Pazarlama", icon: UtensilsCrossed, ownerOnly: true, keywords: "ürün kategori fiyat excel qr" },
    { href: `${base}/kampanyalar`, label: "Kampanyalar", group: "Menü & Pazarlama", icon: Megaphone, ownerOnly: true, keywords: "indirim sadakat puan" },
    { href: `${base}/tema`, label: "Tema", group: "Menü & Pazarlama", icon: Palette, ownerOnly: true, keywords: "renk font görünüm tasarım" },
    { href: `${base}/musteriler`, label: "Müşteriler", group: "İşletme", icon: Users, ownerOnly: true, keywords: "telefon sadık puan" },
    { href: `${base}/stok`, label: "Stok", group: "İşletme", icon: Boxes, ownerOnly: true, feature: "stock", keywords: "malzeme envanter" },
    { href: `${base}/giderler`, label: "Giderler", group: "İşletme", icon: Wallet, ownerOnly: true, keywords: "masraf fatura kira" },
    { href: `${base}/personeller`, label: "Personeller", group: "İşletme", icon: UserCog, ownerOnly: true, keywords: "çalışan garson ekip" },
    { href: `${base}/raporlar`, label: "Raporlar", group: "Raporlar", icon: BarChart3, ownerOnly: true, keywords: "grafik ciro satış" },
    { href: `${base}/analiz`, label: "Analiz", group: "Raporlar", icon: Sparkles, ownerOnly: true, keywords: "ai yapay zeka öneri" },
    { href: `${base}/gun-sonu`, label: "Gün Sonu", group: "Raporlar", icon: ClipboardCheck, ownerOnly: true, keywords: "kasa kapanış z raporu" },
    { href: `${base}/ayarlar`, label: "Ayarlar", group: "Sistem", icon: Settings, ownerOnly: true, keywords: "sipariş modu cihaz yazıcı şifre qr geofence" },
  ];
}
