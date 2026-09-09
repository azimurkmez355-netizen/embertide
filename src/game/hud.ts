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

export function showToast(message: string, duration = 3200): void {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('show'), duration);
}
