import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from './constants';
import { generateTextures } from './textures';
import { Player, type Facing } from './Player';
import { ROOMS } from './levels';
import { buildRoom, pointInRect, type BuiltLevel } from './LevelBuilder';
import { roomClient } from '../room';
import type { ElementKind, PlayerNetState, RoomWorldState } from '../types';
import { setHudConnection, setHudRoomCode, setHudShardCount, showToast } from './hud';
import { sfxBump } from './audio';

type WasdKeys = Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;

export class GameScene extends Phaser.Scene {
  static onGameEnd: ((elapsedSeconds: number, shardCount: number) => void) | null = null;

  private localElement: ElementKind = 'ember';
  private localPlayer!: Player;
  private remotePlayer!: Player;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: WasdKeys;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private currentRoomIndex = 0;
  private level!: BuiltLevel;
  private startTime = 0;
  private boulderHold: Record<string, number> = {};
  private ended = false;
  private roomTransitionRequested = false;

  constructor() {
    super('GameScene');
  }

  create(): void {
    generateTextures(this);

    this.ended = false;
    this.roomTransitionRequested = false;
    this.boulderHold = {};
    this.localElement = roomClient.role === 'host' ? 'ember' : 'tide';

    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = {
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.interactKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.spaceKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    kb.addCapture(['SPACE', 'W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'E']);

    this.cameras.main.setBackgroundColor('#05070d');
    this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'tex-vignette')
      .setScrollFactor(0)
      .setDepth(DEPTH.ui - 1)
      .setBlendMode(Phaser.BlendModes.MULTIPLY);

    setHudRoomCode(roomClient.code ?? '------');
    setHudConnection(true);

    roomClient.onPeerState = (state) => this.handlePeerState(state);
    roomClient.onWorldState = (state) => this.handleWorldState(state);
    roomClient.onPeerDisconnected = () => showToast('Partnerin bağlantısı kesildi.');

    this.startTime = this.time.now;
    this.loadRoom(roomClient.getWorldSnapshot().currentRoomIndex ?? 0);
    setHudShardCount(Object.keys(roomClient.getWorldSnapshot().shardsCollected ?? {}).length);

    this.events.once('shutdown', () => this.cleanup());
  }

  private loadRoom(index: number): void {
    this.level?.destroy();
    this.localPlayer?.destroy();
    this.remotePlayer?.destroy();

    const room = ROOMS[index];
    this.currentRoomIndex = index;
    this.roomTransitionRequested = false;
    this.level = buildRoom(this, room);

    this.physics.world.setBounds(0, 0, room.widthPx, room.heightPx);
    this.cameras.main.setBounds(0, 0, room.widthPx, room.heightPx);
    const zoom = Math.max(1, GAME_WIDTH / room.widthPx, GAME_HEIGHT / room.heightPx);
    this.cameras.main.setZoom(zoom);

    const isHost = roomClient.role === 'host';
    const localSpawn = isHost ? room.spawnHost : room.spawnGuest;
    const remoteSpawn = isHost ? room.spawnGuest : room.spawnHost;
    const remoteElement: ElementKind = this.localElement === 'ember' ? 'tide' : 'ember';

    this.localPlayer = new Player(this, localSpawn.x, localSpawn.y, this.localElement, true);
    this.remotePlayer = new Player(this, remoteSpawn.x, remoteSpawn.y, remoteElement, false);
    this.remotePlayer.setRemoteTarget(remoteSpawn.x, remoteSpawn.y, 'down', false);

    this.cameras.main.startFollow(this.localPlayer, true, 0.12, 0.12);

    this.physics.add.collider(this.localPlayer, this.level.wallColliders);
    this.physics.add.collider(
      this.localPlayer,
      this.level.gates.map((g) => g.collider),
    );
    this.physics.add.collider(
      this.localPlayer,
      this.level.boulders.map((b) => b.collider),
    );
    this.physics.add.collider(
      this.localPlayer,
      this.level.hazardZones,
      (playerObj, hazardObj) => {
        const rect = hazardObj as Phaser.GameObjects.Rectangle;
        (playerObj as Player).bump(rect.x, rect.y);
        sfxBump();
      },
      (playerObj, hazardObj) =>
        (playerObj as Player).element !== (hazardObj as Phaser.GameObjects.Rectangle).getData('safeFor'),
      this,
    );

    roomClient.updateMyState(
      { x: localSpawn.x, y: localSpawn.y, dir: 'down', moving: false },
      true,
    );
    this.applyWorldStateToLevel(roomClient.getWorldSnapshot());
  }

  private handlePeerState(state: PlayerNetState | null): void {
    setHudConnection(Boolean(state?.connected));
    if (!this.remotePlayer) return;
    if (!state) {
      this.remotePlayer.setGhost(true);
      return;
    }
    this.remotePlayer.setGhost(!state.connected);
    this.remotePlayer.setRemoteTarget(state.x, state.y, state.dir as Facing, state.moving);
  }

  private handleWorldState(state: RoomWorldState): void {
    if (!this.ended && state.currentRoomIndex !== this.currentRoomIndex) {
      this.loadRoom(state.currentRoomIndex);
    }
    this.applyWorldStateToLevel(state);
    setHudShardCount(Object.keys(state.shardsCollected ?? {}).length);

    if (state.status === 'finished' && !this.ended) {
      this.onVictory();
    }
  }

  private applyWorldStateToLevel(state: RoomWorldState): void {
    if (!this.level) return;
    const objs = state.objects ?? {};
    for (const gate of this.level.gates) {
      if (objs[gate.id]) gate.open(this);
    }
    for (const lever of this.level.levers) {
      if (objs[lever.id]) lever.activate(this);
    }
    for (const boulder of this.level.boulders) {
      if (objs[boulder.id]) boulder.clear(this);
    }
    const collected = state.shardsCollected ?? {};
    for (const shard of this.level.shards) {
      if (collected[shard.id] && !shard.collected) shard.collect(this);
    }
  }

  private updatePlatesAndGates(): void {
    for (const plate of this.level.plates) {
      const covered =
        plate.isOverlapping(this.localPlayer.x, this.localPlayer.y) ||
        plate.isOverlapping(this.remotePlayer.x, this.remotePlayer.y);
      plate.setActive(covered, this);
    }
    const objs = roomClient.getWorldSnapshot().objects ?? {};
    for (const gate of this.level.gates) {
      if (gate.opened) continue;
      const satisfied = gate.requiredSwitches.every((id) => {
        const plate = this.level.plates.find((p) => p.id === id);
        if (plate) return plate.active;
        return Boolean(objs[id]);
      });
      if (satisfied) {
        roomClient.setWorldObject(gate.id, true);
        gate.open(this);
      }
    }
  }

  private updateLeverInteraction(): void {
    const pressed = Phaser.Input.Keyboard.JustDown(this.interactKey) || Phaser.Input.Keyboard.JustDown(this.spaceKey);
    if (!pressed) return;
    for (const lever of this.level.levers) {
      if (lever.activated) continue;
      if (Phaser.Math.Distance.Between(this.localPlayer.x, this.localPlayer.y, lever.x, lever.y) < lever.radius) {
        roomClient.setWorldObject(lever.id, true);
        lever.activate(this);
        break;
      }
    }
  }

  private updateBoulders(delta: number): void {
    for (const boulder of this.level.boulders) {
      if (boulder.cleared) {
        delete this.boulderHold[boulder.id];
        continue;
      }
      const zone = boulder.pushZone;
      const localIn = pointInRect(this.localPlayer.x, this.localPlayer.y, zone);
      const remoteIn = pointInRect(this.remotePlayer.x, this.remotePlayer.y, zone);
      if (localIn && remoteIn) {
        const held = (this.boulderHold[boulder.id] ?? 0) + delta;
        this.boulderHold[boulder.id] = held;
        boulder.charge(Math.min(1, held / 500));
        if (held >= 500) {
          roomClient.setWorldObject(boulder.id, 1);
          boulder.clear(this);
        }
      } else {
        this.boulderHold[boulder.id] = 0;
        boulder.charge(0);
      }
    }
  }

  private updateShards(): void {
    for (const shard of this.level.shards) {
      if (shard.collected) continue;
      if (shard.isOverlapping(this.localPlayer.x, this.localPlayer.y)) {
        roomClient.collectShard(shard.id);
        shard.collect(this);
      }
    }
  }

  private updateWispBumps(): void {
    for (const wisp of this.level.wisps) {
      if (Phaser.Math.Distance.Between(this.localPlayer.x, this.localPlayer.y, wisp.x, wisp.y) < wisp.radius + 20) {
        this.localPlayer.bump(wisp.x, wisp.y);
      }
    }
  }

  private updateExit(): void {
    if (this.ended || this.roomTransitionRequested) return;
    const exit = ROOMS[this.currentRoomIndex].exit;
    if (!exit) return;
    const localIn = pointInRect(this.localPlayer.x, this.localPlayer.y, exit);
    const remoteIn = pointInRect(this.remotePlayer.x, this.remotePlayer.y, exit);
    if (!(localIn && remoteIn)) return;

    this.roomTransitionRequested = true;
    if (exit.nextRoom === -1) {
      this.ended = true;
      roomClient.finishGame();
      this.onVictory();
    } else {
      roomClient.advanceRoom(exit.nextRoom);
    }
  }

  private onVictory(): void {
    this.ended = true;
    this.cameras.main.stopFollow();
    const elapsed = Math.round((this.time.now - this.startTime) / 1000);
    const shardCount = Object.keys(roomClient.getWorldSnapshot().shardsCollected ?? {}).length;
    GameScene.onGameEnd?.(elapsed, shardCount);
  }

  private cleanup(): void {
    this.level?.destroy();
    roomClient.onPeerState = null;
    roomClient.onWorldState = null;
    roomClient.onPeerDisconnected = null;
  }

  update(_time: number, delta: number): void {
    if (!this.localPlayer || !this.level) return;

    this.localPlayer.updateLocal(this.cursors, this.wasd);
    this.remotePlayer?.updateRemoteInterpolation();

    roomClient.updateMyState({
      x: this.localPlayer.x,
      y: this.localPlayer.y,
      dir: this.localPlayer.facing,
      moving: this.localPlayer.moving,
    });

    this.level.hazardTileSprites.forEach((ts, i) => {
      ts.tilePositionX += delta * 0.02;
      ts.tilePositionY += Math.sin(this.time.now / 1000 + i) * 0.015;
    });
    this.level.wisps.forEach((w) => w.update(delta));

    if (!this.ended) {
      this.updatePlatesAndGates();
      this.updateLeverInteraction();
      this.updateBoulders(delta);
      this.updateShards();
      this.updateWispBumps();
      this.updateExit();
    }
  }
}

export function createGameConfig(): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#05070d',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    scene: [GameScene],
  };
}
