import { formatMoney } from '../utils/formatters.js';
import { GAME_CONSTANTS } from '../config.js';

export class GameScene extends Phaser.Scene {
  constructor() { 
    super('GameScene'); 
  }
  
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
    
    // Background
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
      this.player.setVelocityY(GAME_CONSTANTS.PLAYER_JUMP_VELOCITY);
    }
    
    // Tap to flap
    this.input.on('pointerdown', () => 
      this.player.setVelocityY(GAME_CONSTANTS.PLAYER_JUMP_VELOCITY)
    );

    // Coins group: no gravity, float horizontally
    this.coins = this.physics.add.group({ allowGravity: false });
    this.coinTimer = this.time.addEvent({ 
      delay: GAME_CONSTANTS.COIN_SPAWN_INTERVAL, 
      callback: this.spawnCoin, 
      callbackScope: this, 
      loop: true 
    });

    // Bosses group: no gravity
    this.bosses = this.physics.add.group({ allowGravity: false });
    this.bossTimer = this.time.addEvent({ 
      delay: GAME_CONSTANTS.BOSS_SPAWN_INTERVAL, 
      callback: this.spawnBoss, 
      callbackScope: this, 
      loop: true 
    });

    // Initialize game stats
    this.wealth = 0;
    this.coinsCollected = 0;
    this.multiplier = 1;
    this.highestMultiplier = 1;
    this.goal = GAME_CONSTANTS.GOAL;
    
    // For debugging
    console.log('Initial wealth:', this.wealth, 'type:', typeof this.wealth);

    // Setup physics overlaps
    this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);
    this.physics.add.overlap(this.player, this.bosses, this.hitBoss, null, this);

    // Setup UI
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
    this.defaultTickerSpeed = GAME_CONSTANTS.DEFAULT_TICKER_SPEED;
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
  generateTickerString() {
    const wealth = this.wealth;
    const toGoal = Math.max(this.goal - wealth, 0);
    const coins = this.coinsCollected;
    const multiplier = this.multiplier;
    const multiplierStr = Number.isInteger(multiplier) ? multiplier : multiplier.toFixed(2);
    const wealthStr = formatMoney(wealth);
    const toGoalStr = formatMoney(toGoal);
    
    return `VIKTOR • Wealth: ${wealthStr} • To Goal: ${toGoalStr} • Coins: ${coins} • Multiplier: x${multiplierStr}`;
  }

  update(_, delta) {
    // Update HUD
    this.scoreText.setText('Wealth: ' + formatMoney(this.wealth));
    this.coinsText.setText('Coins: ' + this.coinsCollected);

    // Clean up off-screen objects
    this.coins.children.each(c => { if (c.x < -c.width) c.destroy(); });
    this.bosses.children.each(b => { if (b.x < -b.width) b.destroy(); });

    // Check out-of-bounds: game over
    if (this.player.y > this.scale.height || this.player.y < 0) {
      this.physics.pause();
      this.coinTimer.paused = true;
      this.bossTimer.paused = true;
      this.input.off('pointerdown');
      this.scene.start('GameOverScene', {
        coins: this.coinsCollected,
        wealth: this.wealth,
        highestMultiplier: this.highestMultiplier,
        goalReached: false,
        goal: this.goal
      });
    }
    
    // Ticker update: scroll or show special message
    if (this.isShowingSpecialTicker && this.time.now > this.specialTickerExpires) {
      this.isShowingSpecialTicker = false;
      this.tickerSpeed = this.defaultTickerSpeed;
      this.tickerText.x = this.scale.width;
    }
    
    const tickerContent = this.isShowingSpecialTicker
      ? this.specialTickerMessage
      : this.generateTickerString();
    
    this.tickerText.setText(tickerContent);
    this.tickerText.x -= this.tickerSpeed * (delta / 1000);
    
    if (this.tickerText.x + this.tickerText.width < 0) {
      this.tickerText.x = this.scale.width;
    }
  }

  spawnCoin() {
    // Increment spawn count (keeping this for potential future use)
    this.spawnCount++;
    
    const { width, height } = this.scale;
    const y = Phaser.Math.Between(50, height - 50);
    const type = Phaser.Math.RND.pick(['coin1', 'coin2']);
    
    // Determine if this is a special coin based on type-specific chance
    const specialChance = GAME_CONSTANTS.SPECIAL_COIN_CHANCE[type];
    const isSpecial = Phaser.Math.RND.integerInRange(1, specialChance) === 1;
    
    const coin = this.coins.create(width + 50, y, type);
    coin.setVelocityX(-200);
    
    // Scale coin to ~8% of screen height
    const img = this.textures.get(type).getSourceImage();
    const coinScale = (this.scale.height * 0.08) / img.height;
    coin.setScale(coinScale);
    
    // Base coin data
    const value = GAME_CONSTANTS.COIN_VALUES[type];
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
        .text(this.player.x, this.player.y - 50, 'GOOD\nINVESTMENT!', {
          font: 'bold 24px Arial',
          fill: '#00ff00',
          align: 'center'
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
      this.specialTickerMessage = 'Good Investment! Multiplier Doubled!';
      this.specialTickerExpires = this.time.now + 3000;
      this.isShowingSpecialTicker = true;
    }
    
    // Get coin value before destroying it
    const coinValue = coin.getData('value');
    
    // Now destroy the coin
    coin.destroy();
    
    // Update stats: coins collected and wealth
    this.coinsCollected++;
    
    // Debug
    console.log('Before update: wealth =', this.wealth, 'value =', coinValue, 'multiplier =', this.multiplier);
    
    this.wealth += coinValue * this.multiplier;
    
    // Debug
    console.log('After update: wealth =', this.wealth);
    
    // Check win condition
    if (this.wealth >= this.goal) {
      this.physics.pause();
      this.coinTimer.paused = true;
      this.bossTimer.paused = true;
      this.input.off('pointerdown');
      this.tickerSpeed = 0;
      
      this.time.delayedCall(1000, () => {
        this.scene.start('GameOverScene', {
          coins: this.coinsCollected,
          wealth: this.wealth,
          highestMultiplier: this.highestMultiplier,
          goalReached: true,
          goal: this.goal
        });
      });
    }
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
    
    // Delay then show Game Over summary
    this.time.delayedCall(2000, () => {
      this.scene.start('GameOverScene', {
        coins: this.coinsCollected,
        wealth: this.wealth,
        highestMultiplier: this.highestMultiplier,
        goalReached: false,
        goal: this.goal
      });
    });
  }
}