export class TitleScene extends Phaser.Scene {
  constructor() { 
    super('TitleScene'); 
  }
  
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