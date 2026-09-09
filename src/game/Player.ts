import Phaser from 'phaser';
import { COLORS, DEPTH, PLAYER_RADIUS, PLAYER_SPEED } from './constants';
import type { ElementKind } from '../types';

export type Facing = 'up' | 'down' | 'left' | 'right';

export class Player extends Phaser.GameObjects.Container {
  element: ElementKind;
  isLocal: boolean;
  facing: Facing = 'down';
  moving = false;

  private bodySprite: Phaser.GameObjects.Image;
  private glowSprite: Phaser.GameObjects.Image;
  private trail: Phaser.GameObjects.Particles.ParticleEmitter;
  private idleTween?: Phaser.Tweens.Tween;
  private squashTween?: Phaser.Tweens.Tween;
  private remoteTarget: Phaser.Math.Vector2;
  private lastBumpAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, element: ElementKind, isLocal: boolean) {
    super(scene, x, y);
    this.element = element;
    this.isLocal = isLocal;
    this.remoteTarget = new Phaser.Math.Vector2(x, y);

    const glowColor = element === 'ember' ? COLORS.emberGlow : COLORS.tideGlow;
    const edgeColor = element === 'ember' ? COLORS.emberEdge : COLORS.tideEdge;

    this.glowSprite = scene.add
      .image(0, 4, 'tex-glow')
      .setTint(glowColor)
      .setScale(1.15)
      .setAlpha(0.5)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.bodySprite = scene.add.image(0, 0, element === 'ember' ? 'tex-ember-body' : 'tex-tide-body').setOrigin(0.5, 0.78);

    this.add([this.glowSprite, this.bodySprite]);
    scene.add.existing(this);

    if (isLocal) {
      scene.physics.add.existing(this);
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setCircle(PLAYER_RADIUS, -PLAYER_RADIUS, -PLAYER_RADIUS - 6);
      body.setCollideWorldBounds(true);
    }

    this.trail = scene.add.particles(0, 0, 'tex-spark', {
      speed: { min: 4, max: 18 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.55, end: 0 },
      lifespan: 460,
      frequency: 140,
      tint: edgeColor,
      blendMode: 'ADD',
    });
    this.trail.startFollow(this, 0, 16);
    this.trail.setDepth(DEPTH.entities - 1);

    this.startIdleAnim();
  }

  private startIdleAnim(): void {
    this.idleTween?.stop();
    this.idleTween = this.scene.tweens.add({
      targets: this.bodySprite,
      y: { from: 0, to: -5 },
      duration: 900 + Math.random() * 200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  setFacing(dir: Facing): void {
    if (dir === this.facing) return;
    this.facing = dir;
    if (dir === 'left') this.bodySprite.setFlipX(true);
    else if (dir === 'right') this.bodySprite.setFlipX(false);
  }

  setMoving(isMoving: boolean): void {
    if (isMoving === this.moving) return;
    this.moving = isMoving;
    this.trail.frequency = isMoving ? 55 : 140;
    this.pop(isMoving ? 1.12 : 1.08, isMoving ? 0.88 : 0.93);
  }

  private pop(sx: number, sy: number): void {
    this.squashTween?.stop();
    this.setScale(sx, sy);
    this.squashTween = this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: 220,
      ease: 'Back.easeOut',
    });
  }

  bump(fromX: number, fromY: number): void {
    const now = this.scene.time.now;
    if (now - this.lastBumpAt < 400) return;
    this.lastBumpAt = now;
    const angle = Phaser.Math.Angle.Between(fromX, fromY, this.x, this.y);
    const kx = Math.cos(angle) * 30;
    const ky = Math.sin(angle) * 30;
    this.scene.tweens.add({
      targets: this,
      x: this.x + kx,
      y: this.y + ky,
      duration: 160,
      yoyo: false,
      ease: 'Cubic.easeOut',
    });
    const burst = this.scene.add.particles(this.x, this.y, 'tex-spark', {
      speed: { min: 40, max: 90 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 350,
      quantity: 10,
      tint: 0xffffff,
      blendMode: 'ADD',
    });
    burst.setDepth(DEPTH.particlesFront);
    this.scene.time.delayedCall(360, () => burst.destroy());
  }

  updateLocal(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    wasd: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>,
  ): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    let vx = 0;
    let vy = 0;
    if (cursors.left.isDown || wasd.left.isDown) vx -= 1;
    if (cursors.right.isDown || wasd.right.isDown) vx += 1;
    if (cursors.up.isDown || wasd.up.isDown) vy -= 1;
    if (cursors.down.isDown || wasd.down.isDown) vy += 1;

    const isMoving = vx !== 0 || vy !== 0;
    if (isMoving) {
      const len = Math.sqrt(vx * vx + vy * vy);
      body.setVelocity((vx / len) * PLAYER_SPEED, (vy / len) * PLAYER_SPEED);
      if (Math.abs(vx) > Math.abs(vy)) this.setFacing(vx > 0 ? 'right' : 'left');
      else if (vy !== 0) this.setFacing(vy > 0 ? 'down' : 'up');
    } else {
      body.setVelocity(0, 0);
    }
    this.setMoving(isMoving);
    this.setDepth(this.y);
  }

  setRemoteTarget(x: number, y: number, dir: Facing, moving: boolean): void {
    this.remoteTarget.set(x, y);
    this.setFacing(dir);
    this.setMoving(moving);
  }

  updateRemoteInterpolation(): void {
    const dx = this.remoteTarget.x - this.x;
    const dy = this.remoteTarget.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0.5) {
      const t = dist > 120 ? 1 : 0.25;
      this.x += dx * t;
      this.y += dy * t;
    }
    this.setDepth(this.y);
  }

  setGhost(active: boolean): void {
    this.setAlpha(active ? 0.35 : 1);
  }

  destroy(fromScene?: boolean): void {
    this.trail.destroy();
    this.idleTween?.stop();
    this.squashTween?.stop();
    super.destroy(fromScene);
  }
}
