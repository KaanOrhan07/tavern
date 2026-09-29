-- Tavern 2.2.1 — Zamanlayıcı kurulumu (Supabase SQL Editor'de BİR KEZ çalıştırın)
--
-- pg_cron zamanlayıcıdır, pg_net ise uygulamanın /api/jobs/* uçlarına asenkron HTTP POST atar.
-- Uçlar `Authorization: Bearer <CRON_SECRET>` ile korunur (Vercel'deki CRON_SECRET ile aynı değer).
--
-- ⚠️ Aşağıdaki iki yer tutucuyu değiştirin:
--   <APP_URL>      → örn. https://tavern.vercel.app  (sonunda / olmadan)
--   <CRON_SECRET>  → Vercel env değişkeni CRON_SECRET değeri

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Var olan aynı isimli işleri temizle (tekrar çalıştırılabilirlik)
select cron.unschedule(jobid) from cron.job where jobname in ('tavern-appointments', 'tavern-payments');

-- Randevu: talep süresi dolanlar, 1 saat kala müşteri SMS'i, gün sonu arşivi — her 5 dakikada
select cron.schedule(
  'tavern-appointments',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := '<APP_URL>/api/jobs/appointments',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>', 'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- Ödeme penceresi bildirimleri (3 gün önce admin, pencere başında işletme) — günde bir, 06:00 UTC (09:00 TR)
select cron.schedule(
  'tavern-payments',
  '0 6 * * *',
  $$
  select net.http_post(
    url := '<APP_URL>/api/jobs/payments',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>', 'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- Kontrol: select * from cron.job;   |   Çalışma geçmişi: select * from cron.job_run_details order by start_time desc limit 20;
