export class BootScene extends Phaser.Scene {
  constructor() { 
    super('BootScene'); 
  }
  
  preload() {
    this.load.image('background', 'game_assets/background.png');
    this.load.image('viktor', 'game_assets/viktor.png');
    this.load.image('coin1', 'game_assets/cashflow_coin.png');
    this.load.image('coin2', 'game_assets/globallogic_coin.png');
    this.load.image('boss', 'game_assets/ibrahimovic_boss.png');
    // Coin explosion effects
    this.load.image('coin1Explode', 'game_assets/cashflow_coin_explosion.png');
    this.load.image('coin2Explode', 'game_assets/globallogic_coin_explosion.png');
    this.load.image('heart', 'game_assets/heart.png');
    // Audio assets
    this.load.audio('bgm', 'game_assets/background.mp3');
    this.load.audio('coin_regular', 'game_assets/coin_regular.mp3');
    this.load.audio('coin_special', 'game_assets/coin_special.mp3');
    this.load.audio('boss_hit', 'game_assets/boss_hit.mp3');
    this.load.audio('game_over', 'game_assets/game_over.mp3');
  }
  
  create() {
    this.scene.start('TitleScene');
  }
}