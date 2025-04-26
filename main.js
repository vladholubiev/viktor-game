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
    this.input.once('pointerdown', () => {
      // Unlock audio context on mobile browsers if suspended
      if (this.sound.context && this.sound.context.state === 'suspended') {
        this.sound.context.resume();
      }
      this.scene.start('GameScene', { startFlap: true });
    });
  }
}

class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }
  /**
   * @param {{ startFlap?: boolean }} data
   */
  init(data) {
    // Game start/restart parameters
    this.startFlap = data.startFlap;
    // Reset coin spawn counter and special ticker state
    this.spawnCount = 0;
    this.specialTickerMessage = '';
    this.specialTickerExpires = 0;
    this.isShowingSpecialTicker = false;
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
    // Coins group: no gravity, float horizontally
    this.coins = this.physics.add.group({ allowGravity: false });
    this.coinTimer = this.time.addEvent({ delay: 1000, callback: this.spawnCoin, callbackScope: this, loop: true });

    // Bosses group: no gravity
    // Bosses group: no gravity
    this.bosses = this.physics.add.group({ allowGravity: false });
    this.bossTimer = this.time.addEvent({ delay: 10000, callback: this.spawnBoss, callbackScope: this, loop: true });

    this.coinValueTotal = 0;
    this.multiplier = 1;
    this.interestRate = 0.2; // per second

    this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);
    this.physics.add.overlap(this.player, this.bosses, this.hitBoss, null, this);

    this.scoreText = this.add.text(10, 10, 'Wealth: 0', { font: '18px Arial', fill: '#ffffff' });
    this.coinsText = this.add.text(10, 30, 'Coins: 0', { font: '18px Arial', fill: '#ffffff' });
    // Create the CNBC-style ticker
    this.createTicker();
    // Play background music
    this.bgMusic = this.sound.add('bgm', { loop: true });
    this.bgMusic.play();
  }

  /** Create the scrolling CNBC-style ticker HUD */
  createTicker() {
    const { width } = this.scale;
    this.defaultTickerSpeed = 100; // px/sec
    this.tickerSpeed = this.defaultTickerSpeed;
    this.tickerBG = this.add
      .rectangle(0, 0, width, 30, 0x112244)
      .setOrigin(0)
      .setScrollFactor(0);
    this.tickerText = this.add
      .text(width, 15, '', {
        font: 'bold 20px sans-serif',
        fill: '#ffffff'
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0);
  }

  /** Generate default ticker string with dynamic stats */
  generateTickerString(wealth) {
    const coins = this.coinValueTotal;
    const growthPercent = ((this.multiplier - 1) * 100).toFixed(1);
    const target = 10000;
    let daysToFire = '∞';
    if (wealth >= target) {
      daysToFire = 0;
    } else if (wealth > 0 && this.interestRate > 0) {
      const seconds = Math.log(target / wealth) / this.interestRate;
      const days = Math.ceil(seconds / 86400);
      daysToFire = days > 0 ? days : 0;
    }
    const wealthStr = '$' + wealth.toLocaleString();
    return `VIKTOR • Wealth: ${wealthStr} • Coins: ${coins} • Days to FIRE: ${daysToFire} • Compound Growth: +${growthPercent}%`;
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
    // Ticker update: scroll or show special message
    if (this.isShowingSpecialTicker && this.time.now > this.specialTickerExpires) {
      this.isShowingSpecialTicker = false;
      this.tickerSpeed = this.defaultTickerSpeed;
      this.tickerText.x = this.scale.width;
    }
    const tickerContent = this.isShowingSpecialTicker
      ? this.specialTickerMessage
      : this.generateTickerString(wealth);
    this.tickerText.setText(tickerContent);
    this.tickerText.x -= this.tickerSpeed * (delta / 1000);
    if (this.tickerText.x + this.tickerText.width < 0) {
      this.tickerText.x = this.scale.width;
    }
  }

  spawnCoin() {
    // Increment spawn count and determine if this is a special coin
    this.spawnCount++;
    const isSpecial = this.spawnCount % 20 === 0;
    const { width, height } = this.scale;
    const y = Phaser.Math.Between(50, height - 50);
    const type = Phaser.Math.RND.pick(['coin1', 'coin2']);
    const coin = this.coins.create(width + 50, y, type);
    coin.setVelocityX(-200);
    // Scale coin to ~8% of screen height
    const img = this.textures.get(type).getSourceImage();
    const coinScale = (this.scale.height * 0.08) / img.height;
    coin.setScale(coinScale);
    // Base coin data
    const value = type === 'coin1' ? 1 : 5;
    coin.setData('value', value);
    coin.setData('special', isSpecial);
    // Special coin effect: glowing/pulsing
    if (isSpecial) {
      coin.setTint(0xffff00);
      this.tweens.add({
        targets: coin,
        scale: coinScale * 1.3,
        duration: 500,
        yoyo: true,
        repeat: -1
      });
    }
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
    // Play coin collection sound
    if (coin.getData('special')) {
      this.sound.play('coin_special');
    } else {
      this.sound.play('coin_regular');
    }
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
    // Handle special "Good Investment" coin
    if (coin.getData('special')) {
      // Floating text overlay
      const msg = this.add
        .text(this.player.x, this.player.y - 50, 'GOOD INVESTMENT!', {
          font: 'bold 24px Arial',
          fill: '#00ff00'
        })
        .setOrigin(0.5);
      this.tweens.add({
        targets: msg,
        y: msg.y - 50,
        alpha: { from: 1, to: 0 },
        duration: 1000,
        onComplete: () => msg.destroy()
      });
      // Double current wealth multiplier
      this.multiplier *= 2;
      // Trigger special ticker message
      this.specialTickerMessage = 'Good Investment! Wealth Doubled!';
      this.specialTickerExpires = this.time.now + 3000;
      this.isShowingSpecialTicker = true;
    }
    // Update principal and destroy coin
    this.coinValueTotal += coin.getData('value');
    coin.destroy();
  }

  hitBoss(player, boss) {
    // Play boss hit sound effect
    this.sound.play('boss_hit');
    // Pause physics and timers
    this.physics.pause();
    this.coinTimer.paused = true;
    this.bossTimer.paused = true;
    this.input.off('pointerdown');
    // Boss glow red
    boss.setTint(0xff0000);
    // Boss pulsing red glow effect
    this.tweens.add({
      targets: boss,
      alpha: { from: 1, to: 0.4 },
      yoyo: true,
      repeat: 5,
      duration: 200
    });
    // Halt ticker
    this.tickerSpeed = 0;
    // Delay then go to Game Over
    this.time.delayedCall(2000, () => {
      const wealth = Math.floor(this.coinValueTotal * this.multiplier);
      this.scene.start('GameOverScene', { coins: this.coinValueTotal, wealth });
    });
  }
}

class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOverScene'); }
  init(data) { this.stats = data; }
  create() {
    // Stop background music and play game over sound
    this.sound.stopAll();
    this.sound.play('game_over');
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