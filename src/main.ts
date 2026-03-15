import { Game } from './game';

async function main() {
  const game = new Game();
  await game.init();
  console.log('FFT Tactics initialized. Controls:');
  console.log('  WASD/Arrows: Pan camera');
  console.log('  Q/E: Rotate map');
  console.log('  Mouse wheel: Zoom');
  console.log('  Right-click drag: Pan');
  console.log('  Left-click: Select/Confirm');
  console.log('  Escape: Cancel');
}

main().catch(console.error);
