// Main game logic for Flappy Viktor – Compound Cashflow Game

class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }
  preload() {
    this.load.image('background', 'game_assets/background.png');
    this.load.image('viktor', 'game_assets/viktor.png');
    this.load.image('coin1', 'game_assets/cashflow_coin.png');
    this.load.image('coin2', 'game_assets/globallogic_coin.png');
    this.load.image('boss', 'game_assets/ibrahimovic_boss.png');
    // Coin explosion effects
    this.load.image('coin1Explode', 'game_assets/cashflow_coin_explosion.png');
    this.load.image('coin2Explode', 'game_assets/globallogic_coin_explosion.png');
  }
  create() {
    this.scene.start('TitleScene');
  }
}

class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }
  create() {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 3, 'VIKTOR', { font: 'bold 48px Arial', fill: '#ffffff' })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height / 2, 'Happy Birthday!', { font: '24px Arial', fill: '#ffffff' })
      .setOrigin(0.5);
    this.add
      .text(width / 2, (height * 2) / 3, 'Tap to Start', { font: '18px Arial', fill: '#ffff00' })
      .setOrigin(0.5);
    this.input.once('pointerdown', () => this.scene.start('GameScene', { startFlap: true }));
  }
}

class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }
  /**
   * @param {{ startFlap?: boolean }} data
   */
  init(data) {
    this.startFlap = data.startFlap;
  }
  create() {
    const { width, height } = this.scale;
    this.add
      .tileSprite(0, 0, width, height, 'background')
      .setOrigin(0)
      .setScrollFactor(0);
    // Create and configure player
    this.player = this.physics.add.sprite(width * 0.2, height / 2, 'viktor')
      .setCollideWorldBounds(true);
    // Scale player to ~15% of screen height and set collision circle
    {
      const img = this.textures.get('viktor').getSourceImage();
      const scale = (height * 0.15) / img.height;
      this.player.setScale(scale);
      // Full sprite used for collision; no custom body shape
    }
    // Initial flap if started with tap from title/restart
    if (this.startFlap) {
      this.player.setVelocityY(-300);
    }
    // Tap to flap
    this.input.on('pointerdown', () => this.player.setVelocityY(-300));

    // Coins group: no gravity, float horizontally
    this.coins = this.physics.add.group({ allowGravity: false });
    this.time.addEvent({ delay: 1000, callback: this.spawnCoin, callbackScope: this, loop: true });

    // Bosses group: no gravity
    this.bosses = this.physics.add.group({ allowGravity: false });
    this.time.addEvent({ delay: 10000, callback: this.spawnBoss, callbackScope: this, loop: true });

    this.coinValueTotal = 0;
    this.multiplier = 1;
    this.interestRate = 0.2; // per second

    this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);
    this.physics.add.overlap(this.player, this.bosses, this.hitBoss, null, this);

    this.scoreText = this.add.text(10, 10, 'Wealth: 0', { font: '18px Arial', fill: '#ffffff' });
    this.coinsText = this.add.text(10, 30, 'Coins: 0', { font: '18px Arial', fill: '#ffffff' });
  }

  update(_, delta) {
    this.multiplier *= 1 + this.interestRate * (delta / 1000);
    const wealth = Math.floor(this.coinValueTotal * this.multiplier);
    this.scoreText.setText('Wealth: ' + wealth);
    this.coinsText.setText('Coins: ' + this.coinValueTotal);

    this.coins.children.each(c => { if (c.x < -c.width) c.destroy(); });
    this.bosses.children.each(b => { if (b.x < -b.width) b.destroy(); });

    if (this.player.y > this.scale.height || this.player.y < 0) {
      this.scene.start('GameOverScene', { coins: this.coinValueTotal, wealth });
    }
  }

  spawnCoin() {
    const { width, height } = this.scale;
    const y = Phaser.Math.Between(50, height - 50);
    const type = Phaser.Math.RND.pick(['coin1', 'coin2']);
    const coin = this.coins.create(width + 50, y, type);
    coin.setVelocityX(-200);
    // Scale coin to ~8% of screen height and set collision circle
    {
      const img = this.textures.get(type).getSourceImage();
      const coinScale = (this.scale.height * 0.08) / img.height;
      coin.setScale(coinScale);
      // Full sprite used for collision; no custom body shape
    }
    const value = type === 'coin1' ? 1 : 5;
    coin.setData('value', value);
  }

  spawnBoss() {
    const { width, height } = this.scale;
    const y = Phaser.Math.Between(50, height - 100);
    const boss = this.bosses.create(width + 100, y, 'boss');
    // Scale boss to ~20% of screen height and set collision circle
    {
      const img = this.textures.get('boss').getSourceImage();
      const bossScale = (this.scale.height * 0.2) / img.height;
      boss.setScale(bossScale);
      // Full sprite used for collision; no custom body shape
    }
    boss.setVelocityX(-250);
  }

  collectCoin(_, coin) {
    // Spawn explosion effect at coin position
    const x = coin.x;
    const y = coin.y;
    const type = coin.texture.key;
    const explosionKey = type === 'coin1' ? 'coin1Explode' : 'coin2Explode';
    const explosion = this.add.sprite(x, y, explosionKey);
    // Scale and animate explosion
    {
      const img = this.textures.get(explosionKey).getSourceImage();
      const expScale = (this.scale.height * 0.08) / img.height;
      explosion.setScale(expScale);
      this.tweens.add({
        targets: explosion,
        alpha: { from: 1, to: 0 },
        scale: expScale * 1.5,
        duration: 300,
        onComplete: () => explosion.destroy()
      });
    }
    // Update score and remove coin
    this.coinValueTotal += coin.getData('value');
    coin.destroy();
  }

  hitBoss() {
    const wealth = Math.floor(this.coinValueTotal * this.multiplier);
    this.scene.start('GameOverScene', { coins: this.coinValueTotal, wealth });
  }
}

class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOverScene'); }
  init(data) { this.stats = data; }
  create() {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 3, 'Game Over', { font: '48px Arial', fill: '#ff0000' })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height / 2, `Coins: ${this.stats.coins}`, { font: '24px Arial', fill: '#ffffff' })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height / 2 + 30, `Wealth: ${this.stats.wealth}`, { font: '24px Arial', fill: '#ffffff' })
      .setOrigin(0.5);
    this.add
      .text(width / 2, (height * 2) / 3, 'Tap to Restart', { font: '18px Arial', fill: '#ffff00' })
      .setOrigin(0.5);
    this.input.once('pointerdown', () => this.scene.start('GameScene', { startFlap: true }));
  }
}

// Game configuration and initialization
const config = {
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
  },
  scene: [BootScene, TitleScene, GameScene, GameOverScene]
};

window.addEventListener('DOMContentLoaded', () => {
  new Phaser.Game(config);
});