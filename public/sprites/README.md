# FFT Sprite Assets

Download sprite sheets from The Spriters Resource:
https://www.spriters-resource.com/playstation/fft/

## Required Files

Place PNG sprite sheets in the `jobs/` folder with these exact filenames:

### Job Sprite Sheets (battle sprites)
- `jobs/squire.png`
- `jobs/knight.png`
- `jobs/archer.png`
- `jobs/white-mage.png`
- `jobs/black-mage.png`
- `jobs/chemist.png`
- `jobs/monk.png`
- `jobs/thief.png`
- `jobs/time-mage.png`
- `jobs/summoner.png`
- `jobs/geomancer.png`
- `jobs/dragoon.png`
- `jobs/samurai.png`
- `jobs/ninja.png`
- `jobs/calculator.png`
- `jobs/dancer.png`
- `jobs/bard.png`
- `jobs/mime.png`
- `jobs/oracle.png`
- `jobs/mediator.png`

### Story Character Sheets
- `jobs/ramza.png`
- `jobs/delita.png`
- `jobs/agrias.png`

## Sprite Sheet Format

FFT sprite sheets follow this layout:
- Each frame is approximately 48x56 pixels (varies slightly)
- Rows correspond to animation states (idle, walk, attack, cast, hit, death)
- Columns correspond to facing directions (South, West, East, North — or similar)
- The sheet includes all animation frames laid out in a grid

The sprite loader will auto-detect the frame size from the sheet dimensions.
