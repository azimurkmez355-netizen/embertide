import Phaser from 'phaser';
import { COLORS, DEPTH } from './constants';
import { getPillarSpots, type DecorType, type Rect, type RoomData } from './levels';
import { Boulder, createHazardZones, Gate, Lever, PressurePlate, Shard, Wisp } from './objects';

export interface BuiltLevel {
  room: RoomData;
  wallColliders: Phaser.GameObjects.Rectangle[];
  hazardZones: Phaser.GameObjects.Rectangle[];
  hazardTileSprites: Phaser.GameObjects.TileSprite[];
  plates: PressurePlate[];
  levers: Lever[];
  gates: Gate[];
  boulders: Boulder[];
  shards: Shard[];
  wisps: Wisp[];
  destroy: () => void;
}

function rectPad(r: Rect, pad: number): Rect {
  return { x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2 };
}

export function pointInRect(x: number, y: number, r: Rect): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function addDecor(scene: Phaser.Scene, type: DecorType, x: number, y: number, bucket: Phaser.GameObjects.GameObject[]): void {
  const img = scene.add.image(x, y, `tex-${type}`).setDepth(y);
  if (Math.random() > 0.5) img.setFlipX(true);
  img.setScale(0.85 + Math.random() * 0.3);
  bucket.push(img);
}

function addTorch(scene: Phaser.Scene, x: number, y: number, bucket: Phaser.GameObjects.GameObject[]): void {
  const img = scene.add.image(x, y, 'tex-torch').setOrigin(0.5, 0.95).setDepth(y);
  const glow = scene.add
    .image(x, y - 40, 'tex-glow')
    .setTint(COLORS.emberGlow)
    .setScale(0.9)
    .setAlpha(0.5)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(y - 1);
  scene.tweens.add({
    targets: glow,
    alpha: { from: 0.35, to: 0.6 },
    scale: { from: 0.8, to: 1.05 },
    duration: 500 + Math.random() * 300,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  scene.tweens.add({
    targets: img,
    angle: { from: -2, to: 2 },
    duration: 260 + Math.random() * 140,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  const emitter = scene.add.particles(x, y - 46, 'tex-spark', {
    speed: { min: 8, max: 24 },
    angle: { min: 258, max: 282 },
    scale: { start: 0.45, end: 0 },
    alpha: { start: 0.8, end: 0 },
    lifespan: 600,
    frequency: 110,
    tint: [COLORS.emberEdge, COLORS.emberCore],
    blendMode: 'ADD',
  });
  emitter.setDepth(y + 1);
  bucket.push(img, glow, emitter);
}

export function buildRoom(scene: Phaser.Scene, room: RoomData): BuiltLevel {
  const bucket: Phaser.GameObjects.GameObject[] = [];

  const tileKey = room.theme === 'grass' ? 'tex-tile-grass' : room.theme === 'stone' ? 'tex-tile-stone' : 'tex-tile-sanctum';
  const bg = scene.add
    .tileSprite(room.widthPx / 2, room.heightPx / 2, room.widthPx, room.heightPx, tileKey)
    .setDepth(DEPTH.background);
  bucket.push(bg);

  const wallColliders = room.walls.map((w) => {
    const r = scene.add.rectangle(w.x + w.w / 2, w.y + w.h / 2, w.w, w.h, 0, 0);
    scene.physics.add.existing(r, true);
    bucket.push(r);
    return r;
  });

  const hazardZones = createHazardZones(scene, room.hazards);
  hazardZones.forEach((z) => bucket.push(z));
  const hazardTileSprites = room.hazards.map((hz) => {
    const key = hz.kind === 'lava' ? 'tex-lava' : 'tex-water';
    const ts = scene.add.tileSprite(hz.x + hz.w / 2, hz.y + hz.h / 2, hz.w, hz.h, key).setDepth(DEPTH.hazard);
    bucket.push(ts);
    return ts;
  });

  const plates = room.plates.map((p) => new PressurePlate(scene, p));
  const levers = room.levers.map((l) => new Lever(scene, l));
  const gates = room.gates.map((g) => new Gate(scene, g));
  const boulders = room.boulders.map((b) => new Boulder(scene, b));
  const shards = room.shards.map((s) => new Shard(scene, s));
  const wisps = room.wisps.map((w) => new Wisp(scene, w));

  if (room.exit) {
    const exit = room.exit;
    const cx = exit.x + exit.w / 2;
    const cy = exit.y + exit.h / 2;
    const glow = scene.add
      .image(cx, cy, 'tex-glow')
      .setTint(COLORS.gold)
      .setScale(exit.w / 110, exit.h / 110)
      .setAlpha(0.2)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.ground);
    scene.tweens.add({ targets: glow, alpha: { from: 0.12, to: 0.32 }, duration: 900, yoyo: true, repeat: -1 });
    bucket.push(glow);
  }

  for (const spot of getPillarSpots(room.index)) {
    const img = scene.add.image(spot.x, spot.y, 'tex-pillar').setOrigin(0.5, 0.95).setDepth(spot.y);
    bucket.push(img);
  }

  for (const spot of room.torchSpots) addTorch(scene, spot.x, spot.y, bucket);

  const exclusions: Rect[] = [
    ...room.gates.map((g) => rectPad(g, 40)),
    ...room.plates.map((p) => rectPad({ x: p.x, y: p.y, w: 0, h: 0 }, 46)),
    ...room.levers.map((l) => rectPad({ x: l.x, y: l.y, w: 0, h: 0 }, 40)),
    ...room.boulders.map((b) => rectPad({ x: b.x, y: b.y, w: 0, h: 0 }, 70)),
    ...room.shards.map((s) => rectPad({ x: s.x, y: s.y, w: 0, h: 0 }, 40)),
    rectPad({ x: room.spawnHost.x, y: room.spawnHost.y, w: 0, h: 0 }, 50),
    rectPad({ x: room.spawnGuest.x, y: room.spawnGuest.y, w: 0, h: 0 }, 50),
    ...(room.exit ? [rectPad(room.exit, 24)] : []),
  ];

  for (const scatter of room.decorScatters) {
    for (let i = 0; i < scatter.count; i++) {
      const region = scatter.regions[Math.floor(Math.random() * scatter.regions.length)];
      for (let attempt = 0; attempt < 10; attempt++) {
        const x = region.x + Math.random() * region.w;
        const y = region.y + Math.random() * region.h;
        if (exclusions.some((r) => pointInRect(x, y, r))) continue;
        const type = scatter.types[Math.floor(Math.random() * scatter.types.length)];
        addDecor(scene, type, x, y, bucket);
        break;
      }
    }
  }

  return {
    room,
    wallColliders,
    hazardZones,
    hazardTileSprites,
    plates,
    levers,
    gates,
    boulders,
    shards,
    wisps,
    destroy: () => {
      plates.forEach((p) => p.destroy());
      levers.forEach((l) => l.destroy());
      gates.forEach((g) => g.destroy());
      boulders.forEach((b) => b.destroy());
      shards.forEach((s) => s.destroy());
      wisps.forEach((w) => w.destroy());
      bucket.forEach((o) => o.destroy());
    },
  };
}
