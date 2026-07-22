/** Web Audio ile panel bildirim/adisyon uyarı sesi — GainNode ile yükseltilmiş. */
export const NOTIFICATION_GAIN = 2.6;

export function playNotificationChime(
  ctx: AudioContext,
  gainMultiplier = NOTIFICATION_GAIN
) {
  const masterGain = ctx.createGain();
  masterGain.gain.value = gainMultiplier;
  masterGain.connect(ctx.destination);

  const now = ctx.currentTime;
  [880, 1174.66].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const envelope = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    envelope.gain.setValueAtTime(0, now + i * 0.15);
    envelope.gain.linearRampToValueAtTime(0.35, now + i * 0.15 + 0.02);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.5);
    osc.connect(envelope).connect(masterGain);
    osc.start(now + i * 0.15);
    osc.stop(now + i * 0.15 + 0.55);
  });
}

const notificationAudioContexts = new Set<AudioContext>();

export function addNotificationAudioContext(ctx: AudioContext) {
  notificationAudioContexts.add(ctx);
}

export function removeNotificationAudioContext(ctx: AudioContext) {
  notificationAudioContexts.delete(ctx);
}

export function playNotificationChimeOnce() {
  for (const ctx of notificationAudioContexts) {
    if (ctx.state === "running") {
      playNotificationChime(ctx);
      return;
    }
  }
}
