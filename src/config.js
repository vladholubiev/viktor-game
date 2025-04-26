// Game configuration
export const gameConfig = {
  type: Phaser.AUTO,
  scale: {
    parent: 'game-container',
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 600 }, debug: false }
  }
};

// Game constants
export const GAME_CONSTANTS = {
  GOAL: 1000000000, // 1 billion goal
  DEFAULT_TICKER_SPEED: 100, // px/sec
  COIN_SPAWN_INTERVAL: 1000, // ms
  BOSS_SPAWN_INTERVAL: 10000, // ms
  PLAYER_JUMP_VELOCITY: -300,
  // Coin values
  COIN_VALUES: {
    coin1: 10,  // cashflow coin value
    coin2: 20   // globallogic coin value
  }
};