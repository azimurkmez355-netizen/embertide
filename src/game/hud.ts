let toastTimer: number | undefined;

export function setHudRoomCode(code: string): void {
  const el = document.getElementById('hud-room-label');
  if (el) el.innerHTML = `Oda: <strong>${code}</strong>`;
}

export function setHudConnection(connected: boolean): void {
  const el = document.getElementById('hud-connection');
  if (!el) return;
  el.innerHTML = connected
    ? '<span class="dot-pulse ok"></span>Bağlı'
    : '<span class="dot-pulse"></span>Bağlantı bekleniyor';
}

export function setHudShardCount(n: number): void {
  const el = document.getElementById('hud-shard-count');
  if (el) el.textContent = String(n);
}

const abilityReady: Record<string, boolean> = {};

export function setAbilityCooldown(id: 'dash' | 'pulse', readyFraction: number): void {
  const el = document.getElementById(`hud-ability-${id}`);
  if (!el) return;
  const pct = Math.max(0, Math.min(1, 1 - readyFraction)) * 100;
  el.style.setProperty('--pct', String(pct));
  const isReady = readyFraction >= 1;
  if (isReady && !abilityReady[id]) el.classList.add('flash');
  else if (!isReady) el.classList.remove('flash');
  abilityReady[id] = isReady;
  el.classList.toggle('on-cooldown', !isReady);
}

export function showToast(message: string, duration = 3200): void {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('show'), duration);
}
