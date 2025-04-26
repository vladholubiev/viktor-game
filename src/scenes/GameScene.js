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
    // Initialize or restore lives
    this.lives = data.lives !== undefined ? data.lives : GAME_CONSTANTS.STARTING_LIVES;
    // Initialize or restore game stats
    this.wealth = data.wealth !== undefined ? data.wealth : 0;
    this.coinsCollected = data.coinsCollected !== undefined ? data.coinsCollected : 0;
    this.multiplier = data.multiplier !== undefined ? data.multiplier : 1;
    this.highestMultiplier = data.highestMultiplier !== undefined ? data.highestMultiplier : 1;
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
    
    // Scale player to ~15% of screen height
    {
      const img = this.textures.get('viktor').getSourceImage();
      const scale = (height * 0.15) / img.height;
      this.player.setScale(scale);
      // Using full sprite for collision to make collecting coins easier
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

    // Initialize goal
    this.goal = GAME_CONSTANTS.GOAL;
    
    // For debugging
    console.log('Initial wealth:', this.wealth, 'type:', typeof this.wealth);

    // Setup physics overlaps
    this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);
    this.physics.add.overlap(this.player, this.bosses, this.hitBoss, null, this);

    // Setup UI
    this.scoreText = this.add.text(10, 10, 'Wealth: 0', { font: '18px Arial', fill: '#ffffff' });
    this.coinsText = this.add.text(10, 30, 'Coins: 0', { font: '18px Arial', fill: '#ffffff' });
    
    // Create lives display
    this.createLivesDisplay();
    
    // Create the CNBC-style ticker
    this.createTicker();
    
    // Play background music
    this.bgMusic = this.sound.add('bgm', { loop: true });
    this.bgMusic.play();
  }

  /** Create lives display with heart icons */
  createLivesDisplay() {
    const { width } = this.scale;
    this.livesGroup = this.add.group();
    
    // Create heart sprites for each life
    this.updateLivesDisplay();
  }
  
  /** Update the lives display based on current lives */
  updateLivesDisplay() {
    // Clear existing hearts
    this.livesGroup.clear(true, true);
    
    // Create new hearts based on current lives
    for (let i = 0; i < this.lives; i++) {
      const heart = this.add.image(this.scale.width - 30 - (i * 35), 50, 'heart');
      
      // Scale heart to appropriate size
      const img = this.textures.get('heart').getSourceImage();
      const heartScale = 35 / img.height;
      heart.setScale(heartScale);
      
      // Add to group for easier management
      this.livesGroup.add(heart);
    }
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
        goal: this.goal,
        lives: 0 // Out of bounds means all lives lost
      });
    }
    
    // Update lives display if it changed
    if (this.livesGroup && this.livesGroup.getLength() !== this.lives) {
      this.updateLivesDisplay();
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
    
    // Special coin effect: glowing/pulsing and spinning
    if (isSpecial) {
      coin.setTint(0xffff00);
      
      // Scale pulsing effect
      this.tweens.add({
        targets: coin,
        scale: coinScale * 1.3,
        duration: 500,
        yoyo: true,
        repeat: -1
      });
      
      // Spinning rotation effect
      this.tweens.add({
        targets: coin,
        angle: 360,
        duration: 1500,
        repeat: -1,
        ease: 'Linear'
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
      
      // Create a much smaller hitbox (40% of visual size)
      // This makes the collision detection more precise and boss harder to hit
      const bodyWidth = img.width * bossScale * 0.4;
      const bodyHeight = img.height * bossScale * 0.4;
      
      // Center the hitbox in the sprite
      const offsetX = (img.width * bossScale - bodyWidth) / 2;
      const offsetY = (img.height * bossScale - bodyHeight) / 2;
      
      boss.body.setSize(bodyWidth, bodyHeight);
      boss.body.setOffset(offsetX, offsetY);
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
    
    // Handle special coin
    if (coin.getData('special')) {
      // Get coin type-specific message
      const coinType = coin.texture.key;
      const specialMessage = GAME_CONSTANTS.SPECIAL_COIN_MESSAGES[coinType];
      
      // Floating text overlay
      const msg = this.add
        .text(this.player.x, this.player.y - 50, specialMessage, {
          font: 'bold 24px Arial',
          fill: '#00ff00',
          align: 'center'
        })
        .setOrigin(0.5);
      
      this.tweens.add({
        targets: msg,
        y: msg.y - 50,
        alpha: { from: 1, to: 0 },
        duration: 2000, // Extended duration to 2 seconds
        onComplete: () => msg.destroy()
      });
      
      // Double current wealth multiplier
      this.multiplier *= 2;
      
      // Update ticker message based on coin type
      this.specialTickerMessage = coinType === 'coin1' ? 
        'Good Investment! Multiplier Doubled!' : 
        'Promotion! Multiplier Doubled!';
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
    
    // Calculate the value added to wealth
    const valueAdded = coinValue * this.multiplier;
    
    // Display floating value text
    const valueText = this.add
      .text(this.player.x + 30, this.player.y, `+${valueAdded}`, {
        font: 'bold 22px Arial',
        fill: '#FFD700' // Gold color
      })
      .setOrigin(0.5);
    
    // Animate the floating value
    this.tweens.add({
      targets: valueText,
      y: valueText.y - 40,
      alpha: { from: 1, to: 0 },
      duration: 1200,
      onComplete: () => valueText.destroy()
    });
    
    this.wealth += valueAdded;
    
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
          goal: this.goal,
          lives: this.lives
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
    
    // Reduce lives
    this.lives--;
    
    // Delay then show Game Over or continue
    this.time.delayedCall(2000, () => {
      if (this.lives > 0) {
        // Update highest multiplier if current is higher
        this.highestMultiplier = Math.max(this.highestMultiplier, this.multiplier);
        
        // Show lives remaining and prompt
        const { width, height } = this.scale;
        const livesText = this.add.text(width / 2, height / 2 - 60, 
          `${this.lives} ${this.lives === 1 ? 'life' : 'lives'} remaining`, 
          { font: '32px Arial', fill: '#ff0000', stroke: '#000000', strokeThickness: 4 }
        ).setOrigin(0.5);
        
        const tapText = this.add.text(width / 2, height / 2, 
          'Tap to proceed', 
          { font: '24px Arial', fill: '#ffffff', stroke: '#000000', strokeThickness: 3 }
        ).setOrigin(0.5);
        
        // Wait for tap to continue
        const continueHandler = () => {
          this.input.off('pointerdown', continueHandler);
          livesText.destroy();
          tapText.destroy();
          
          // Resume the game with remaining lives but keep progress
          this.scene.restart({
            startFlap: true,
            lives: this.lives,
            wealth: this.wealth,
            coinsCollected: this.coinsCollected,
            multiplier: this.multiplier,
            highestMultiplier: this.highestMultiplier
          });
        };
        
        this.input.on('pointerdown', continueHandler);
      } else {
        // No lives left - game over
        this.scene.start('GameOverScene', {
          coins: this.coinsCollected,
          wealth: this.wealth,
          highestMultiplier: this.highestMultiplier,
          goalReached: false,
          goal: this.goal,
          lives: this.lives
        });
      }
    });
  }
}