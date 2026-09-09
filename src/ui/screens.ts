import { roomClient } from '../room';
import { startGame, stopGame } from '../game/game';
import { showToast } from '../game/hud';
import { resumeAudio, sfxClick, sfxChime, sfxVictory, sfxError } from '../game/audio';
import { TOTAL_SHARDS } from '../game/levels';
import type { PlayerNetState, RoomWorldState } from '../types';

function showScreen(id: string): void {
  document.querySelectorAll('.screen').forEach((el) => el.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  switch (msg) {
    case 'FIREBASE_NOT_CONFIGURED':
      return 'Sunucu henüz yapılandırılmadı. (.env dosyasındaki Firebase ayarlarını tamamlayın)';
    case 'ROOM_NOT_FOUND':
      return 'Oda bulunamadı. Kodu kontrol et.';
    case 'ROOM_FULL':
      return 'Bu oda zaten dolu.';
    case 'ROOM_IN_PROGRESS':
      return 'Bu oyun zaten başlamış.';
    case 'CODE_GENERATION_FAILED':
      return 'Kod üretilemedi, tekrar dene.';
    default:
      return 'Bir şeyler ters gitti. Tekrar dene.';
  }
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

function enterGame(): void {
  showScreen('screen-game');
  resumeAudio();
  startGame(onGameEnd);
}

function onGameEnd(elapsedSeconds: number, shardCount: number): void {
  stopGame();
  const timeEl = document.getElementById('victory-time');
  const shardEl = document.getElementById('victory-shards');
  if (timeEl) timeEl.textContent = formatTime(elapsedSeconds);
  if (shardEl) shardEl.textContent = `${shardCount}/${TOTAL_SHARDS}`;
  showScreen('screen-victory');
  sfxVictory();
  launchConfetti();
  watchForGameStart();
}

function watchForGameStart(): void {
  roomClient.onWorldState = (state: RoomWorldState) => {
    if (state.status === 'playing') enterGame();
  };
}

function resetGuestSlotUI(): void {
  const slot = document.getElementById('guest-slot');
  const statusEl = slot?.querySelector('.slot-status');
  const startBtn = document.getElementById('btn-start-game') as HTMLButtonElement | null;
  slot?.classList.remove('slot-filled');
  slot?.classList.add('slot-empty');
  if (statusEl) statusEl.outerHTML = '<span class="slot-status waiting"><span class="dot-pulse"></span>Bekleniyor</span>';
  if (startBtn) startBtn.disabled = true;
}

function updateGuestSlot(state: PlayerNetState | null): void {
  const slot = document.getElementById('guest-slot');
  const statusEl = slot?.querySelector('.slot-status');
  const startBtn = document.getElementById('btn-start-game') as HTMLButtonElement | null;
  if (state?.connected) {
    slot?.classList.add('slot-filled');
    slot?.classList.remove('slot-empty');
    if (statusEl) statusEl.outerHTML = '<span class="slot-status ready">Hazır</span>';
    if (startBtn) startBtn.disabled = false;
    sfxChime(660);
  } else {
    resetGuestSlotUI();
  }
}

async function handleCreateParty(): Promise<void> {
  resumeAudio();
  sfxClick();
  const btn = document.getElementById('btn-create-party') as HTMLButtonElement;
  btn.disabled = true;
  try {
    const code = await roomClient.createRoom();
    const codeEl = document.getElementById('room-code-text');
    if (codeEl) codeEl.textContent = code;
    resetGuestSlotUI();
    showScreen('screen-create');
    roomClient.onPeerState = (state) => updateGuestSlot(state);
    roomClient.onPeerDisconnected = () => {
      showToast('Arkadaşının bağlantısı kesildi.');
      resetGuestSlotUI();
    };
  } catch (e) {
    sfxError();
    showToast(friendlyError(e));
  } finally {
    btn.disabled = false;
  }
}

function wireCodeInputs(): void {
  const inputs = Array.from({ length: 6 }, (_, i) => document.getElementById(`code-digit-${i}`) as HTMLInputElement);
  inputs.forEach((input, idx) => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/[^0-9]/g, '').slice(-1);
      if (input.value && idx < 5) inputs[idx + 1].focus();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && idx > 0) inputs[idx - 1].focus();
      if (e.key === 'Enter') void handleJoinConfirm();
    });
    input.addEventListener('paste', (e) => {
      const text = e.clipboardData?.getData('text') ?? '';
      const digits = text.replace(/[^0-9]/g, '').slice(0, 6).split('');
      if (!digits.length) return;
      e.preventDefault();
      digits.forEach((d, i) => {
        if (inputs[i]) inputs[i].value = d;
      });
      inputs[Math.min(digits.length, 6) - 1]?.focus();
    });
  });
}

function getEnteredCode(): string {
  return Array.from({ length: 6 }, (_, i) => (document.getElementById(`code-digit-${i}`) as HTMLInputElement).value).join('');
}

function clearCodeInputs(): void {
  for (let i = 0; i < 6; i++) {
    const el = document.getElementById(`code-digit-${i}`) as HTMLInputElement;
    if (el) el.value = '';
  }
  const err = document.getElementById('join-error');
  if (err) err.textContent = '';
}

async function handleJoinConfirm(): Promise<void> {
  const code = getEnteredCode();
  const errEl = document.getElementById('join-error');
  if (code.length !== 6) {
    if (errEl) errEl.textContent = 'Lütfen 6 haneli kodu tamamla.';
    return;
  }
  resumeAudio();
  sfxClick();
  const btn = document.getElementById('btn-confirm-join') as HTMLButtonElement;
  btn.disabled = true;
  try {
    await roomClient.joinRoom(code);
    showScreen('screen-wait-start');
    roomClient.onPeerDisconnected = () => {
      showToast('Ev sahibi ayrıldı.');
      roomClient.leave();
      showScreen('screen-menu');
    };
    watchForGameStart();
  } catch (e) {
    sfxError();
    if (errEl) errEl.textContent = friendlyError(e);
  } finally {
    btn.disabled = false;
  }
}

function launchConfetti(): void {
  const canvas = document.getElementById('confetti-canvas') as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const resize = () => {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
  };
  resize();

  const colors = ['#ff6b35', '#ffcf4a', '#2ec4e8', '#ffb84d', '#ffffff'];
  const pieces = Array.from({ length: 140 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.6,
    vy: 2 + Math.random() * 3,
    vx: (Math.random() - 0.5) * 2,
    size: 5 + Math.random() * 6,
    color: colors[Math.floor(Math.random() * colors.length)],
    rot: Math.random() * Math.PI,
    vrot: (Math.random() - 0.5) * 0.2,
  }));

  let frame = 0;
  const maxFrames = 60 * 5;
  const onResize = () => resize();
  window.addEventListener('resize', onResize);

  function step(): void {
    frame++;
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const active = document.getElementById('screen-victory')?.classList.contains('active');
    if (!active || frame >= maxFrames) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      window.removeEventListener('resize', onResize);
      return;
    }
    for (const p of pieces) {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function wireLeaveActions(): void {
  document.querySelectorAll<HTMLElement>('[data-action="leave-room"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      sfxClick();
      roomClient.leave();
      showScreen('screen-menu');
    });
  });

  document.getElementById('btn-leave-game')?.addEventListener('click', () => {
    if (!window.confirm('Oyundan çıkmak istediğine emin misin?')) return;
    stopGame();
    roomClient.leave();
    showScreen('screen-menu');
  });

  document.getElementById('btn-back-menu')?.addEventListener('click', () => {
    sfxClick();
    roomClient.leave();
    showScreen('screen-menu');
  });
}

function wireNavButtons(): void {
  document.querySelectorAll<HTMLElement>('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => {
      sfxClick();
      showScreen(btn.getAttribute('data-nav')!);
    });
  });
}

function wireCopyButton(): void {
  document.getElementById('btn-copy-code')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-copy-code') as HTMLButtonElement;
    const code = document.getElementById('room-code-text')?.textContent ?? '';
    try {
      await navigator.clipboard.writeText(code);
      btn.classList.add('copied');
      btn.textContent = '✅';
      window.setTimeout(() => {
        btn.classList.remove('copied');
        btn.textContent = '📋';
      }, 1500);
    } catch {
      showToast('Kopyalanamadı, kodu elle yazabilirsin.');
    }
  });
}

function wirePlayAgain(): void {
  document.getElementById('btn-play-again')?.addEventListener('click', () => {
    sfxClick();
    roomClient.resetForReplay();
  });
}

export function initApp(): void {
  document.getElementById('btn-create-party')?.addEventListener('click', () => void handleCreateParty());
  document.getElementById('btn-join-room')?.addEventListener('click', () => {
    sfxClick();
    clearCodeInputs();
    showScreen('screen-join');
    document.getElementById('code-digit-0')?.focus();
  });
  document.getElementById('btn-confirm-join')?.addEventListener('click', () => void handleJoinConfirm());

  wireCodeInputs();
  wireNavButtons();
  wireLeaveActions();
  wireCopyButton();
  wirePlayAgain();

  document.getElementById('btn-start-game')?.addEventListener('click', () => {
    sfxClick();
    roomClient.startGame();
  });

  showScreen('screen-menu');
}
