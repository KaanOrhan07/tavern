/**
 * Çevrimdışı işlem kuyruğu (tarayıcı + ileride mobil/masaüstü webview). Sipariş girişi gibi
 * yazma işlemleri internet yokken yerelde saklanır, bağlantı gelince AYNI Idempotency-Key ile sırayla gönderilir;
 * böylece çift gönderim olsa bile sunucu işlemi bir kez uygular (bkz. src/lib/idempotency.ts).
 *
 * Sözleşme (mobil/masaüstü istemciler de aynısını uygulamalıdır):
 *  - Her işlem için bir UUID üret → `Idempotency-Key` başlığı
 *  - Ağ hatasında kuyruğa ekle; 2xx → tamam; 4xx (401/429 hariç) → kalıcı hata, kuyruktan çıkar ve kullanıcıya göster
 *  - 401 (oturum bitti) / 429 / 5xx / ağ hatası → kuyrukta kal, sonra tekrar dene
 */
const KEY = "tavern_offline_queue_v1";
const FAILED_KEY = "tavern_offline_failed_v1";
export const QUEUE_EVENT = "tavern-queue-changed";

export type QueuedRequest = {
  id: string;
  url: string;
  method: string;
  body: string;
  label: string;
  createdAt: number;
};

function read<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
}
function write<T>(key: string, value: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* kota dolu / gizli mod: kuyruk bellekte tutulamaz */
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(QUEUE_EVENT));
}

export const readQueue = () => read<QueuedRequest>(KEY);
export const readFailed = () => read<QueuedRequest & { error: string }>(FAILED_KEY);
export const clearFailed = () => write(FAILED_KEY, []);

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `q-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * JSON gövdeli yazma isteği gönderir. Ağ hatasında kuyruğa alır ({ queued: true, res: null }).
 * Çevrimiçiyken normal fetch gibi davranır (Idempotency-Key ile).
 */
export async function queuedFetch(
  url: string,
  init: { method?: string; body: unknown; label: string }
): Promise<{ res: Response | null; queued: boolean }> {
  const id = newId();
  const method = init.method ?? "POST";
  const body = JSON.stringify(init.body);
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", "Idempotency-Key": id },
      body,
    });
    return { res, queued: false };
  } catch {
    write(KEY, [...readQueue(), { id, url, method, body, label: init.label, createdAt: Date.now() }]);
    return { res: null, queued: true };
  }
}

let flushing = false;

/** Kuyruğu sırayla gönderir. Oturum/ağ sorununda durur (sıra korunur). */
export async function flushQueue(): Promise<{ sent: number; failed: number; remaining: number }> {
  if (flushing) return { sent: 0, failed: 0, remaining: readQueue().length };
  flushing = true;
  let sent = 0;
  let failed = 0;
  try {
    for (const item of readQueue()) {
      let res: Response;
      try {
        res = await fetch(item.url, {
          method: item.method,
          headers: { "Content-Type": "application/json", "Idempotency-Key": item.id },
          body: item.body,
        });
      } catch {
        break; // hâlâ çevrimdışı
      }
      if (res.ok) {
        write(KEY, readQueue().filter((q) => q.id !== item.id));
        sent++;
      } else if (res.status === 401 || res.status === 429 || res.status >= 500) {
        break; // giriş gerekli / yoğunluk / sunucu sorunu: sonra tekrar dene
      } else {
        const data = await res.json().catch(() => null);
        write(KEY, readQueue().filter((q) => q.id !== item.id));
        write(FAILED_KEY, [...readFailed(), { ...item, error: data?.error ?? `Hata ${res.status}` }]);
        failed++;
      }
    }
  } finally {
    flushing = false;
  }
  return { sent, failed, remaining: readQueue().length };
}
