export interface Vec2 {
  x: number;
  y: number;
}

export type DecorType =
  | 'tree'
  | 'bush'
  | 'flower-a'
  | 'flower-b'
  | 'rock'
  | 'crystal-decor'
  | 'torch'
  | 'reed'
  | 'pillar';

export interface DecorScatter {
  types: DecorType[];
  count: number;
  regions: Rect[];
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface HazardDef extends Rect {
  id: string;
  kind: 'lava' | 'water';
}

export interface PlateDef {
  id: string;
  x: number;
  y: number;
}

export interface LeverDef {
  id: string;
  x: number;
  y: number;
}

export interface GateDef extends Rect {
  id: string;
  orientation: 'vertical' | 'horizontal';
  requiredSwitches: string[];
}

export interface BoulderDef {
  id: string;
  x: number;
  y: number;
  clearedDx: number;
  clearedDy: number;
  pushZone: Rect;
  blockRect: Rect;
}

export interface ShardDef {
  id: string;
  x: number;
  y: number;
}

export interface WispDef {
  id: string;
  path: [Vec2, Vec2];
  speed: number;
}

export interface ExitZoneDef extends Rect {
  nextRoom: number;
}

export interface RoomData {
  index: number;
  name: string;
  theme: 'grass' | 'stone' | 'sanctum';
  widthPx: number;
  heightPx: number;
  spawnHost: Vec2;
  spawnGuest: Vec2;
  walls: Rect[];
  hazards: HazardDef[];
  plates: PlateDef[];
  levers: LeverDef[];
  gates: GateDef[];
  boulders: BoulderDef[];
  shards: ShardDef[];
  wisps: WispDef[];
  exit: ExitZoneDef | null;
  decorScatters: DecorScatter[];
  torchSpots: Vec2[];
}

const T = 64;
const tile = (n: number): number => n * T;

export const ROOMS: RoomData[] = [
  {
    index: 0,
    name: 'Çayır Kapısı',
    theme: 'grass',
    widthPx: tile(26),
    heightPx: tile(15),
    spawnHost: { x: 160, y: 448 },
    spawnGuest: { x: 224, y: 448 },
    walls: [
      { x: 0, y: 0, w: tile(26), h: T },
      { x: 0, y: tile(14), w: tile(26), h: T },
      { x: 0, y: 0, w: T, h: tile(15) },
      { x: tile(25), y: 0, w: T, h: tile(15) },
      { x: tile(17), y: T, w: T, h: tile(5) },
      { x: tile(17), y: tile(10), w: T, h: tile(4) },
    ],
    hazards: [],
    plates: [
      { id: 'r0_plateA', x: 864, y: 416 },
      { id: 'r0_plateB', x: 864, y: 608 },
    ],
    levers: [],
    gates: [
      {
        id: 'r0_gate',
        x: tile(17),
        y: tile(6),
        w: T,
        h: tile(4),
        orientation: 'vertical',
        requiredSwitches: ['r0_plateA', 'r0_plateB'],
      },
    ],
    boulders: [],
    shards: [
      { id: 'r0_shard1', x: 160, y: 160 },
      { id: 'r0_shard2', x: 1504, y: 224 },
      { id: 'r0_shard3', x: 800, y: 800 },
    ],
    wisps: [],
    exit: { x: tile(18), y: tile(6), w: tile(7), h: tile(4), nextRoom: 1 },
    decorScatters: [
      {
        types: ['tree', 'bush', 'rock'],
        count: 22,
        regions: [
          { x: T, y: T, w: tile(25) - T, h: tile(6) - T },
          { x: T, y: tile(9), w: tile(25) - T, h: tile(14) - tile(9) },
        ],
      },
      {
        types: ['flower-a', 'flower-b'],
        count: 16,
        regions: [{ x: T, y: T, w: tile(25) - T, h: tile(14) - T }],
      },
      {
        types: ['crystal-decor'],
        count: 4,
        regions: [{ x: tile(12), y: tile(5), w: tile(4), h: tile(6) }],
      },
    ],
    torchSpots: [
      { x: tile(17) + 32, y: tile(6) - 20 },
      { x: tile(17) + 32, y: tile(10) + 20 },
    ],
  },
  {
    index: 1,
    name: 'Kırık Köprü',
    theme: 'stone',
    widthPx: tile(22),
    heightPx: tile(16),
    spawnHost: { x: 608, y: 800 },
    spawnGuest: { x: 672, y: 800 },
    walls: [
      { x: 0, y: 0, w: tile(22), h: T },
      { x: 0, y: tile(15), w: tile(22), h: T },
      { x: 0, y: 0, w: T, h: tile(16) },
      { x: tile(21), y: 0, w: T, h: tile(16) },
      { x: tile(1), y: tile(1), w: tile(7), h: tile(9) - T },
      { x: tile(14), y: tile(1), w: tile(7), h: tile(9) - T },
      { x: tile(1), y: tile(14), w: tile(7), h: T },
      { x: tile(14), y: tile(14), w: tile(7), h: T },
    ],
    hazards: [
      { id: 'r1_lava', kind: 'lava', x: tile(2), y: tile(10), w: tile(5), h: tile(4) },
      { id: 'r1_water', kind: 'water', x: tile(15), y: tile(10), w: tile(5), h: tile(4) },
    ],
    plates: [],
    levers: [
      { id: 'r1_lever1', x: 96, y: 736 },
      { id: 'r1_lever2', x: 1312, y: 736 },
    ],
    gates: [
      {
        id: 'r1_gateMain',
        x: tile(8),
        y: tile(8),
        w: tile(6),
        h: T,
        orientation: 'horizontal',
        requiredSwitches: ['r1_lever1', 'r1_lever2'],
      },
    ],
    boulders: [],
    shards: [
      { id: 'r1_shard1', x: 96, y: 672 },
      { id: 'r1_shard2', x: 1312, y: 864 },
      { id: 'r1_shard3', x: 672, y: 160 },
    ],
    wisps: [],
    exit: { x: tile(8), y: tile(1), w: tile(6), h: tile(2), nextRoom: 2 },
    decorScatters: [
      {
        types: ['rock', 'crystal-decor'],
        count: 18,
        regions: [
          { x: tile(1), y: tile(1), w: tile(7), h: tile(8) },
          { x: tile(14), y: tile(1), w: tile(7), h: tile(8) },
        ],
      },
      {
        types: ['reed'],
        count: 6,
        regions: [{ x: tile(13), y: tile(9), w: tile(3), h: tile(6) }],
      },
    ],
    torchSpots: [
      { x: tile(8) - 24, y: tile(6) + 32 },
      { x: tile(14) + 24, y: tile(6) + 32 },
      { x: tile(8) - 24, y: tile(3) + 32 },
      { x: tile(14) + 24, y: tile(3) + 32 },
    ],
  },
  {
    index: 2,
    name: 'Kristal Sanktuar',
    theme: 'sanctum',
    widthPx: tile(18),
    heightPx: tile(18),
    spawnHost: { x: 544, y: 928 },
    spawnGuest: { x: 608, y: 928 },
    walls: [
      { x: 0, y: 0, w: tile(18), h: T },
      { x: 0, y: tile(17), w: tile(18), h: T },
      { x: 0, y: 0, w: T, h: tile(18) },
      { x: tile(17), y: 0, w: T, h: tile(18) },
      { x: tile(1), y: tile(9), w: tile(7), h: T },
      { x: tile(10), y: tile(9), w: tile(7), h: T },
    ],
    hazards: [],
    plates: [],
    levers: [],
    gates: [],
    boulders: [
      {
        id: 'r2_boulder',
        x: 576,
        y: 608,
        clearedDx: 0,
        clearedDy: -70,
        pushZone: { x: tile(8), y: tile(10), w: tile(2), h: T },
        blockRect: { x: tile(8), y: tile(9), w: tile(2), h: T },
      },
    ],
    shards: [
      { id: 'r2_shard1', x: 160, y: 864 },
      { id: 'r2_shard2', x: 224, y: 224 },
      { id: 'r2_shard3', x: 928, y: 224 },
    ],
    wisps: [
      { id: 'r2_wisp1', path: [{ x: 288, y: 288 }, { x: 480, y: 288 }], speed: 40 },
      { id: 'r2_wisp2', path: [{ x: 672, y: 416 }, { x: 864, y: 416 }], speed: 34 },
    ],
    exit: { x: tile(6), y: tile(1), w: tile(6), h: tile(2), nextRoom: -1 },
    decorScatters: [
      {
        types: ['crystal-decor', 'rock'],
        count: 20,
        regions: [
          { x: tile(1), y: tile(10), w: tile(16), h: tile(7) },
          { x: tile(1), y: tile(1), w: tile(16), h: tile(8) },
        ],
      },
    ],
    torchSpots: [
      { x: tile(2) + 20, y: tile(11) },
      { x: tile(15) - 20, y: tile(11) },
    ],
  },
];

export function getPillarSpots(roomIndex: number): Vec2[] {
  if (roomIndex !== 2) return [];
  return [
    { x: tile(2) + 32, y: tile(2) + 55 },
    { x: tile(15) + 32, y: tile(2) + 55 },
    { x: tile(2) + 32, y: tile(7) + 55 },
    { x: tile(15) + 32, y: tile(7) + 55 },
  ];
}

export const TOTAL_SHARDS = ROOMS.reduce((sum, r) => sum + r.shards.length, 0);
