import { formatMoney } from '../utils/formatters.js';

export class GameOverScene extends Phaser.Scene {
  constructor() { 
    super('GameOverScene'); 
  }
  
  init(data) { 
    this.stats = data; 
  }
  
  create() {
    // Stop background music and play game over sound
    this.sound.stopAll();
    this.sound.play('game_over');
    
    const { width, height } = this.scale;
    
    // Title
    const title = this.stats.goalReached ? 'Victory!' : 'Game Over';
    const titleColor = this.stats.goalReached ? '#00ff00' : '#ff0000';
    
    this.add
      .text(width / 2, height / 4, title, { font: '48px Arial', fill: titleColor })
      .setOrigin(0.5);
    
    // Summary stats
    const startY = height / 2 - 60;
    const lineSpacing = 30;
    
    this.add
      .text(width / 2, startY, `Final Wealth: ${formatMoney(this.stats.wealth)}`, { font: '24px Arial', fill: '#ffffff' })
      .setOrigin(0.5);
    
    const toGoal = Math.max(this.stats.goal - this.stats.wealth, 0);
    this.add
      .text(width / 2, startY + lineSpacing, `To Goal: ${formatMoney(toGoal)}`, { font: '24px Arial', fill: '#ffffff' })
      .setOrigin(0.5);
    
    this.add
      .text(width / 2, startY + lineSpacing * 2, `Coins Collected: ${this.stats.coins}`, { font: '24px Arial', fill: '#ffffff' })
      .setOrigin(0.5);
    
    const mult = this.stats.highestMultiplier;
    const multStr = Number.isInteger(mult) ? mult : mult.toFixed(2);
    this.add
      .text(width / 2, startY + lineSpacing * 3, `Highest Multiplier: x${multStr}`, { font: '24px Arial', fill: '#ffffff' })
      .setOrigin(0.5);
    
    // Restart prompt
    this.add
      .text(width / 2, height * 3 / 4, 'Tap to Restart', { font: '18px Arial', fill: '#ffff00' })
      .setOrigin(0.5);
    
    this.input.once('pointerdown', () => this.scene.start('GameScene', { startFlap: true }));
  }
}