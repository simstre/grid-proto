import { Game } from './game';

async function main() {
  // Show loading indicator
  const loadingEl = document.createElement('div');
  loadingEl.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0a0a1e;
    color: #8888aa;
    font-family: 'Press Start 2P', 'Courier New', monospace;
    font-size: 14px;
    z-index: 5000;
    letter-spacing: 3px;
  `;
  loadingEl.textContent = 'Loading...';
  document.body.appendChild(loadingEl);

  const game = new Game();
  await game.init();

  // Remove loading indicator
  loadingEl.remove();

  console.log('GRID PROTO initialized.');
  console.log('  WASD: Pan camera | Q/E: Rotate | Scroll: Zoom');
  console.log('  Click: Select | Escape: Cancel | M: Mute');
}

main().catch(console.error);
