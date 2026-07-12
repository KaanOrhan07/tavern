"use client";

/**
 * Mutfak termal yazıcısı entegrasyonu — ESC/POS komutları,
 * Web Bluetooth veya WebUSB üzerinden tarayıcıdan doğrudan.
 * Not: Web Bluetooth yalnızca Chrome/Edge'de çalışır (iOS Safari desteklemez).
 */

type PrinterConnection =
  | { kind: "bluetooth"; characteristic: BluetoothRemoteGATTCharacteristic }
  | { kind: "usb"; device: USBDevice; endpoint: number };

let connection: PrinterConnection | null = null;

export function isPrinterConnected() {
  return connection !== null;
}

export function isPrinterSupported() {
  if (typeof navigator === "undefined") return false;
  return "bluetooth" in navigator || "usb" in navigator;
}

export async function connectBluetoothPrinter(): Promise<void> {
  const device = await navigator.bluetooth.requestDevice({
    // Termal yazıcıların çoğu bu seri port servisini kullanır
    filters: [{ services: ["000018f0-0000-1000-8000-00805f9b34fb"] }],
    optionalServices: ["000018f0-0000-1000-8000-00805f9b34fb"],
  });
  const server = await device.gatt!.connect();
  const service = await server.getPrimaryService(
    "000018f0-0000-1000-8000-00805f9b34fb"
  );
  const characteristic = await service.getCharacteristic(
    "00002af1-0000-1000-8000-00805f9b34fb"
  );
  connection = { kind: "bluetooth", characteristic };
  device.addEventListener("gattserverdisconnected", () => {
    connection = null;
  });
}

export async function connectUsbPrinter(): Promise<void> {
  const device = await navigator.usb.requestDevice({ filters: [] });
  await device.open();
  if (device.configuration === null) await device.selectConfiguration(1);
  const iface = device.configuration!.interfaces.find((i) =>
    i.alternate.endpoints.some((e) => e.direction === "out")
  );
  if (!iface) throw new Error("Yazıcı çıkış ucu bulunamadı");
  await device.claimInterface(iface.interfaceNumber);
  const endpoint = iface.alternate.endpoints.find(
    (e) => e.direction === "out"
  )!.endpointNumber;
  connection = { kind: "usb", device, endpoint };
}

async function write(data: Uint8Array) {
  if (!connection) throw new Error("Yazıcı bağlı değil");
  if (connection.kind === "bluetooth") {
    // BLE paket sınırı nedeniyle parçalara bölerek gönder
    const CHUNK = 100;
    for (let i = 0; i < data.length; i += CHUNK) {
      await connection.characteristic.writeValueWithoutResponse(
        data.slice(i, i + CHUNK)
      );
    }
  } else {
    await connection.device.transferOut(connection.endpoint, data as BufferSource);
  }
}

// --- ESC/POS yardımcıları ---

const ESC = 0x1b;
const GS = 0x1d;

/** Türkçe karakterleri ASCII karşılığına çevirir (kod sayfası sorunlarını önler). */
function toAscii(text: string): string {
  const map: Record<string, string> = {
    ç: "c", Ç: "C", ğ: "g", Ğ: "G", ı: "i", İ: "I",
    ö: "o", Ö: "O", ş: "s", Ş: "S", ü: "u", Ü: "U",
  };
  return text.replace(/[çÇğĞıİöÖşŞüÜ]/g, (ch) => map[ch] ?? ch);
}

function encode(text: string): number[] {
  return [...toAscii(text)].map((ch) => {
    const code = ch.charCodeAt(0);
    return code < 128 ? code : 0x3f; // bilinmeyen karakter → '?'
  });
}

export type KitchenTicket = {
  tableName: string;
  items: { name: string; quantity: number }[];
  time: Date;
};

/** "Ne hazırlanacak" mutfak fişini basar. */
export async function printKitchenTicket(ticket: KitchenTicket) {
  const bytes: number[] = [];
  bytes.push(ESC, 0x40); // init
  bytes.push(ESC, 0x61, 0x01); // ortala
  bytes.push(ESC, 0x21, 0x30); // büyük font
  bytes.push(...encode(ticket.tableName), 0x0a);
  bytes.push(ESC, 0x21, 0x00); // normal font
  bytes.push(
    ...encode(
      ticket.time.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })
    ),
    0x0a
  );
  bytes.push(...encode("--------------------------------"), 0x0a);
  bytes.push(ESC, 0x61, 0x00); // sola hizala
  bytes.push(ESC, 0x21, 0x10); // çift yükseklik
  for (const item of ticket.items) {
    bytes.push(...encode(`${item.quantity} x ${item.name}`), 0x0a);
  }
  bytes.push(ESC, 0x21, 0x00);
  bytes.push(...encode("--------------------------------"), 0x0a);
  bytes.push(0x0a, 0x0a, 0x0a);
  bytes.push(GS, 0x56, 0x00); // kağıdı kes
  await write(new Uint8Array(bytes));
}
