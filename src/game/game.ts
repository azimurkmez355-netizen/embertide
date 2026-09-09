import Phaser from 'phaser';
import { createGameConfig, GameScene } from './GameScene';

let game: Phaser.Game | null = null;

export function startGame(onEnd: (elapsedSeconds: number, shardCount: number) => void): void {
  if (game) return;
  GameScene.onGameEnd = onEnd;
  game = new Phaser.Game(createGameConfig());
}

export function stopGame(): void {
  GameScene.onGameEnd = null;
  game?.destroy(true);
  game = null;
}

export function isGameRunning(): boolean {
  return game !== null;
}
