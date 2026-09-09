export type ElementKind = 'ember' | 'tide';

export type Role = 'host' | 'guest';

export interface PlayerNetState {
  x: number;
  y: number;
  dir: 'up' | 'down' | 'left' | 'right';
  moving: boolean;
  connected: boolean;
  ready: boolean;
  ts: number;
}

export type ObjectStateValue = boolean | number;

export interface RoomWorldState {
  currentRoomIndex: number;
  objects: Record<string, ObjectStateValue>;
  shardsCollected: Record<string, boolean>;
  status: 'lobby' | 'playing' | 'finished';
  startedAt: number | null;
  finishedAt: number | null;
}

export interface RoomDocument {
  code: string;
  createdAt: number;
  host: PlayerNetState | null;
  guest: PlayerNetState | null;
  world: RoomWorldState;
}

export interface NetCallbacks {
  onPeerState: (state: PlayerNetState | null) => void;
  onWorldState: (state: RoomWorldState) => void;
  onPeerDisconnected: () => void;
  onError: (message: string) => void;
}
