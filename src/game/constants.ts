export const TILE = 64;

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const PLAYER_SPEED = 230;
export const PLAYER_RADIUS = 22;
export const PLAYER_ACCEL = 0.32;
export const PLAYER_DECEL = 0.4;

export const DASH_SPEED = 620;
export const DASH_DURATION_MS = 160;
export const DASH_COOLDOWN_MS = 1600;

export const PULSE_RADIUS = 110;
export const PULSE_COOLDOWN_MS = 2200;
export const WISP_STUN_MS = 3000;

export const COLORS = {
  emberCore: 0xffcf4a,
  emberEdge: 0xff6b35,
  emberGlow: 0xff9142,
  tideCore: 0x8fedff,
  tideEdge: 0x1a7ba8,
  tideGlow: 0x4fd8f0,
  gold: 0xffb84d,
  success: 0x4de0a0,
  danger: 0xff5d6c,
  ink: 0x150d28,
};

export const DEPTH = {
  background: 0,
  decorBack: 10,
  hazard: 15,
  ground: 20,
  interactive: 30,
  entities: 100,
  decorFront: 500,
  particlesFront: 600,
  ui: 1000,
};
