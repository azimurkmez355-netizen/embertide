import {
  ref,
  onValue,
  update,
  runTransaction,
  get,
  onDisconnect,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/database';
import { getDb } from './firebase';
import type { PlayerNetState, RoomWorldState, Role, ObjectStateValue } from './types';

const SYNC_INTERVAL_MS = 80;
const MAX_CODE_ATTEMPTS = 8;

function randomCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function freshWorldState(): RoomWorldState {
  return {
    currentRoomIndex: 0,
    objects: {},
    shardsCollected: {},
    status: 'lobby',
    startedAt: null,
    finishedAt: null,
  };
}

function freshPlayerState(): PlayerNetState {
  return { x: 0, y: 0, dir: 'down', moving: false, connected: true, ready: true, ts: Date.now() };
}

export class RoomClient {
  code: string | null = null;
  role: Role | null = null;

  onPeerState: ((state: PlayerNetState | null) => void) | null = null;
  onWorldState: ((state: RoomWorldState) => void) | null = null;
  onPeerDisconnected: (() => void) | null = null;

  private unsubPeer: Unsubscribe | null = null;
  private unsubWorld: Unsubscribe | null = null;
  private lastSentAt = 0;
  private peerWasConnected = false;
  private worldCache: RoomWorldState = freshWorldState();

  get myPath(): string {
    return `rooms/${this.code}/${this.role === 'host' ? 'host' : 'guest'}`;
  }

  get peerPath(): string {
    return `rooms/${this.code}/${this.role === 'host' ? 'guest' : 'host'}`;
  }

  get worldPath(): string {
    return `rooms/${this.code}/world`;
  }

  async createRoom(): Promise<string> {
    const db = getDb();
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const candidate = randomCode();
      const roomRef = ref(db, `rooms/${candidate}`);
      const result = await runTransaction(roomRef, (current) => {
        if (current !== null) return undefined;
        return {
          code: candidate,
          createdAt: Date.now(),
          host: freshPlayerState(),
          guest: null,
          world: freshWorldState(),
        };
      });
      if (result.committed) {
        this.code = candidate;
        this.role = 'host';
        this.worldCache = freshWorldState();
        onDisconnect(ref(db, `rooms/${candidate}/host`)).update({ connected: false });
        this.attachListeners();
        return candidate;
      }
    }
    throw new Error('CODE_GENERATION_FAILED');
  }

  async joinRoom(code: string): Promise<void> {
    const db = getDb();
    const roomRef = ref(db, `rooms/${code}`);
    const snap = await get(roomRef);
    if (!snap.exists()) throw new Error('ROOM_NOT_FOUND');
    const data = snap.val();
    if (data?.world?.status && data.world.status !== 'lobby') throw new Error('ROOM_IN_PROGRESS');
    if (!data?.host?.connected) throw new Error('ROOM_NOT_FOUND');

    const guestRef = ref(db, `rooms/${code}/guest`);
    const result = await runTransaction(guestRef, (current) => {
      if (current && current.connected) return undefined;
      return freshPlayerState();
    });
    if (!result.committed) throw new Error('ROOM_FULL');

    this.code = code;
    this.role = 'guest';
    this.worldCache = (data.world as RoomWorldState) ?? freshWorldState();
    onDisconnect(ref(db, `rooms/${code}/guest`)).update({ connected: false });
    this.attachListeners();
  }

  private attachListeners(): void {
    const db = getDb();
    this.peerWasConnected = false;
    this.unsubPeer = onValue(ref(db, this.peerPath), (snap) => {
      const val = snap.exists() ? (snap.val() as PlayerNetState) : null;
      if (this.peerWasConnected && (!val || !val.connected)) {
        this.onPeerDisconnected?.();
      }
      if (val?.connected) this.peerWasConnected = true;
      this.onPeerState?.(val);
    });
    this.unsubWorld = onValue(ref(db, this.worldPath), (snap) => {
      if (!snap.exists()) return;
      this.worldCache = snap.val() as RoomWorldState;
      this.onWorldState?.(this.worldCache);
    });
  }

  getWorldSnapshot(): RoomWorldState {
    return this.worldCache;
  }

  updateMyState(partial: Pick<PlayerNetState, 'x' | 'y' | 'dir' | 'moving'>, force = false): void {
    if (!this.code || !this.role) return;
    const now = Date.now();
    if (!force && now - this.lastSentAt < SYNC_INTERVAL_MS) return;
    this.lastSentAt = now;
    update(ref(getDb(), this.myPath), { ...partial, connected: true, ready: true, ts: now }).catch(() => {});
  }

  startGame(): void {
    if (!this.code) return;
    update(ref(getDb(), this.worldPath), { status: 'playing', startedAt: serverTimestamp() }).catch(() => {});
  }

  setWorldObject(id: string, value: ObjectStateValue): void {
    if (!this.code) return;
    update(ref(getDb(), `${this.worldPath}/objects`), { [id]: value }).catch(() => {});
  }

  collectShard(id: string): void {
    if (!this.code) return;
    update(ref(getDb(), `${this.worldPath}/shardsCollected`), { [id]: true }).catch(() => {});
  }

  advanceRoom(index: number): void {
    if (!this.code) return;
    update(ref(getDb(), this.worldPath), { currentRoomIndex: index }).catch(() => {});
  }

  finishGame(): void {
    if (!this.code) return;
    update(ref(getDb(), this.worldPath), { status: 'finished', finishedAt: serverTimestamp() }).catch(() => {});
  }

  resetForReplay(): void {
    if (!this.code) return;
    update(ref(getDb(), this.worldPath), {
      status: 'playing',
      currentRoomIndex: 0,
      objects: {},
      shardsCollected: {},
      startedAt: serverTimestamp(),
      finishedAt: null,
    }).catch(() => {});
  }

  leave(): void {
    if (this.code && this.role) {
      update(ref(getDb(), this.myPath), { connected: false }).catch(() => {});
    }
    this.unsubPeer?.();
    this.unsubWorld?.();
    this.unsubPeer = null;
    this.unsubWorld = null;
    this.code = null;
    this.role = null;
    this.onPeerState = null;
    this.onWorldState = null;
    this.onPeerDisconnected = null;
    this.worldCache = freshWorldState();
  }
}

export const roomClient = new RoomClient();
