import { gameConfig } from './config.js';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { GameScene } from './scenes/GameScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';

// Create config with scenes
const config = {
  ...gameConfig,
  scene: [BootScene, TitleScene, GameScene, GameOverScene]
};

// Initialize game when DOM content is loaded
window.addEventListener('DOMContentLoaded', () => {
  new Phaser.Game(config);
});