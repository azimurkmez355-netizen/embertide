import Phaser from 'phaser';
import { COLORS, DEPTH } from './constants';
import { sfxSwitch, sfxCollect, sfxWispPop } from './audio';
import type { PlateDef, LeverDef, GateDef, BoulderDef, ShardDef, WispDef, HazardDef } from './levels';

export function spawnBurst(scene: Phaser.Scene, x: number, y: number, tint: number, quantity = 14): void {
  const emitter = scene.add.particles(x, y, 'tex-spark', {
    speed: { min: 60, max: 160 },
    scale: { start: 0.7, end: 0 },
    alpha: { start: 0.9, end: 0 },
    lifespan: 450,
    tint,
    blendMode: 'ADD',
    emitting: false,
  });
  emitter.setDepth(DEPTH.particlesFront);
  emitter.explode(quantity);
  scene.time.delayedCall(600, () => emitter.destroy());
}

export class PressurePlate {
  id: string;
  x: number;
  y: number;
  radius = 36;
  active = false;
  private sprite: Phaser.GameObjects.Image;
  private gem: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, def: PlateDef) {
    this.id = def.id;
    this.x = def.x;
    this.y = def.y;
    this.sprite = scene.add.image(def.x, def.y, 'tex-plate').setDepth(def.y - 1);
    this.gem = scene.add
      .image(def.x, def.y - 3, 'tex-spark')
      .setTint(COLORS.gold)
      .setScale(1.3)
      .setAlpha(0.3)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(def.y);
  }

  isOverlapping(px: number, py: number): boolean {
    return Phaser.Math.Distance.Between(px, py, this.x, this.y) < this.radius;
  }

  setActive(on: boolean, scene: Phaser.Scene): void {
    if (on === this.active) return;
    this.active = on;
    scene.tweens.add({ targets: this.gem, alpha: on ? 0.95 : 0.3, scale: on ? 1.9 : 1.3, duration: 250 });
    if (on) {
      scene.tweens.add({ targets: this.sprite, scaleX: 0.88, scaleY: 0.88, duration: 120, yoyo: true });
    }
  }

  destroy(): void {
    this.sprite.destroy();
    this.gem.destroy();
  }
}

export class Lever {
  id: string;
  x: number;
  y: number;
  radius = 52;
  activated = false;
  private base: Phaser.GameObjects.Image;
  private handle: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, def: LeverDef) {
    this.id = def.id;
    this.x = def.x;
    this.y = def.y;
    this.base = scene.add.image(def.x, def.y, 'tex-lever-base').setOrigin(0.5, 0.9).setDepth(def.y - 1);
    this.handle = scene.add.image(def.x, def.y - 20, 'tex-lever-handle').setOrigin(0.5, 0.85).setAngle(-32).setDepth(def.y);
  }

  activate(scene: Phaser.Scene): void {
    if (this.activated) return;
    this.activated = true;
    scene.tweens.add({ targets: this.handle, angle: 32, duration: 280, ease: 'Back.easeOut' });
    spawnBurst(scene, this.x, this.y - 20, COLORS.gold, 12);
    sfxSwitch();
  }

  destroy(): void {
    this.base.destroy();
    this.handle.destroy();
  }
}

export class Gate {
  id: string;
  opened = false;
  requiredSwitches: string[];
  collider: Phaser.GameObjects.Rectangle;
  private gfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, def: GateDef) {
    this.id = def.id;
    this.requiredSwitches = def.requiredSwitches;
    this.gfx = scene.add.graphics({ x: def.x, y: def.y });
    this.drawBars(def.w, def.h, def.orientation);
    this.gfx.setDepth(DEPTH.interactive);

    this.collider = scene.add.rectangle(def.x + def.w / 2, def.y + def.h / 2, def.w, def.h, 0, 0);
    scene.physics.add.existing(this.collider, true);
  }

  private drawBars(w: number, h: number, orientation: 'vertical' | 'horizontal'): void {
    const g = this.gfx;
    g.fillStyle(0x4a4058, 1);
    g.fillRect(0, 0, w, h);
    g.fillStyle(0x8a7f99, 1);
    if (orientation === 'vertical') {
      const bars = Math.max(3, Math.round(w / 22));
      for (let i = 0; i < bars; i++) {
        const x = ((i + 0.5) * w) / bars;
        g.fillRect(x - 4, 4, 8, h - 8);
      }
      g.fillStyle(0x241a3d, 1);
      g.fillRect(0, 0, w, 8);
      g.fillRect(0, h - 8, w, 8);
    } else {
      const bars = Math.max(3, Math.round(h / 22));
      for (let i = 0; i < bars; i++) {
        const y = ((i + 0.5) * h) / bars;
        g.fillRect(4, y - 4, w - 8, 8);
      }
      g.fillStyle(0x241a3d, 1);
      g.fillRect(0, 0, 8, h);
      g.fillRect(w - 8, 0, 8, h);
    }
  }

  open(scene: Phaser.Scene): void {
    if (this.opened) return;
    this.opened = true;
    (this.collider.body as Phaser.Physics.Arcade.StaticBody).enable = false;
    scene.tweens.add({
      targets: this.gfx,
      y: this.gfx.y - 46,
      alpha: 0.15,
      duration: 550,
      ease: 'Cubic.easeIn',
    });
    scene.cameras.main.shake(150, 0.0035);
    spawnBurst(scene, this.collider.x, this.collider.y, 0xffe6a8, 18);
    sfxSwitch();
  }

  destroy(): void {
    this.gfx.destroy();
    this.collider.destroy();
  }
}

export class Boulder {
  id: string;
  cleared = false;
  pushZone: BoulderDef['pushZone'];
  collider: Phaser.GameObjects.Rectangle;
  private sprite: Phaser.GameObjects.Image;
  private def: BoulderDef;

  constructor(scene: Phaser.Scene, def: BoulderDef) {
    this.id = def.id;
    this.def = def;
    this.pushZone = def.pushZone;
    this.sprite = scene.add.image(def.x, def.y, 'tex-boulder').setDepth(def.y);
    this.collider = scene.add.rectangle(
      def.blockRect.x + def.blockRect.w / 2,
      def.blockRect.y + def.blockRect.h / 2,
      def.blockRect.w,
      def.blockRect.h,
      0,
      0,
    );
    scene.physics.add.existing(this.collider, true);
  }

  charge(amount: number): void {
    this.sprite.setScale(1 + amount * 0.08);
  }

  clear(scene: Phaser.Scene): void {
    if (this.cleared) return;
    this.cleared = true;
    (this.collider.body as Phaser.Physics.Arcade.StaticBody).enable = false;
    scene.tweens.add({
      targets: this.sprite,
      x: this.sprite.x + this.def.clearedDx,
      y: this.sprite.y + this.def.clearedDy,
      duration: 550,
      ease: 'Cubic.easeOut',
    });
    scene.cameras.main.shake(220, 0.006);
    spawnBurst(scene, this.sprite.x, this.sprite.y, 0xd8d0e6, 20);
  }

  destroy(): void {
    this.sprite.destroy();
    this.collider.destroy();
  }
}

export class Shard {
  id: string;
  x: number;
  y: number;
  radius = 32;
  collected = false;
  private disposed = false;
  private sprite: Phaser.GameObjects.Image;
  private glow: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, def: ShardDef) {
    this.id = def.id;
    this.x = def.x;
    this.y = def.y;
    this.glow = scene.add
      .image(def.x, def.y, 'tex-glow')
      .setTint(COLORS.gold)
      .setScale(1)
      .setAlpha(0.4)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.interactive - 1);
    this.sprite = scene.add.image(def.x, def.y, 'tex-crystal-shard').setDepth(DEPTH.interactive);
    scene.tweens.add({
      targets: [this.sprite, this.glow],
      y: `-=8`,
      duration: 1000 + Math.random() * 300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    scene.tweens.add({ targets: this.sprite, angle: 360, duration: 4200, repeat: -1 });
  }

  isOverlapping(px: number, py: number): boolean {
    return Phaser.Math.Distance.Between(px, py, this.x, this.y) < this.radius;
  }

  collect(scene: Phaser.Scene): void {
    if (this.collected) return;
    this.collected = true;
    spawnBurst(scene, this.x, this.y, COLORS.gold, 18);
    sfxCollect();
    scene.tweens.add({
      targets: [this.sprite, this.glow],
      scale: 0,
      alpha: 0,
      duration: 300,
      onComplete: () => this.destroy(),
    });
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.sprite.destroy();
    this.glow.destroy();
  }
}

export class Wisp {
  id: string;
  x: number;
  y: number;
  radius = 22;
  private scene: Phaser.Scene;
  private sprite: Phaser.GameObjects.Image;
  private glow: Phaser.GameObjects.Image;
  private def: WispDef;
  private t = 0;
  private stunnedUntil = 0;

  constructor(scene: Phaser.Scene, def: WispDef) {
    this.scene = scene;
    this.id = def.id;
    this.def = def;
    this.x = def.path[0].x;
    this.y = def.path[0].y;
    this.glow = scene.add
      .image(this.x, this.y, 'tex-glow')
      .setTint(0xd8b8ff)
      .setScale(0.85)
      .setAlpha(0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.entities - 1);
    this.sprite = scene.add.image(this.x, this.y, 'tex-spark').setScale(1.3).setDepth(DEPTH.entities);
  }

  isStunned(): boolean {
    return this.scene.time.now < this.stunnedUntil;
  }

  pop(stunMs: number): void {
    if (this.isStunned()) return;
    this.stunnedUntil = this.scene.time.now + stunMs;
    spawnBurst(this.scene, this.x, this.y, 0xffffff, 14);
    this.scene.tweens.add({ targets: [this.sprite, this.glow], alpha: 0.15, scale: 0.6, duration: 150 });
    sfxWispPop();
  }

  update(deltaMs: number): void {
    if (this.isStunned()) return;
    this.t += (deltaMs * this.def.speed) / 8000;
    const p = (Math.sin(this.t) + 1) / 2;
    this.x = Phaser.Math.Linear(this.def.path[0].x, this.def.path[1].x, p);
    this.y = Phaser.Math.Linear(this.def.path[0].y, this.def.path[1].y, p);
    this.sprite.setPosition(this.x, this.y);
    this.glow.setPosition(this.x, this.y);
    if (this.sprite.alpha < 1) {
      this.sprite.setAlpha(Math.min(1, this.sprite.alpha + 0.03));
      this.sprite.setScale(Math.min(1.3, this.sprite.scale + 0.02));
      this.glow.setAlpha(Math.min(0.5, this.glow.alpha + 0.015));
      this.glow.setScale(Math.min(0.85, this.glow.scale + 0.012));
    }
  }

  destroy(): void {
    this.sprite.destroy();
    this.glow.destroy();
  }
}

export function createHazardZones(scene: Phaser.Scene, hazards: HazardDef[]): Phaser.GameObjects.Rectangle[] {
  return hazards.map((hz) => {
    const rect = scene.add.rectangle(hz.x + hz.w / 2, hz.y + hz.h / 2, hz.w, hz.h, 0, 0);
    scene.physics.add.existing(rect, true);
    rect.setData('safeFor', hz.kind === 'lava' ? 'ember' : 'tide');
    return rect;
  });
}
