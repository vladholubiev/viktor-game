 # Flappy Viktor – Compound Cashflow Game
 
 This is a simple web-based game built with Phaser.js, optimized for mobile browsers (including iPhone). It features a tap-to-fly mechanic, coin collection, and a compound interest–driven “wealth” display.
 
 ## Setup
 1. Ensure you have a `game_assets` folder at the project root containing:
    - `viktor.png` (main character)
    - `ibrahimovic_boss.png` (boss)
    - `background.png` (scenery)
    - `cashflow_coin.png` (coin type 1)
    - `globallogic_coin.png` (coin type 2)
 2. Open `index.html` in your browser. For local testing, you can run a static server. For example:
    ```bash
    npx serve .
    # or
    python3 -m http.server 8000
    ```
    Then navigate to `http://localhost:5000/` or the appropriate port.
 
 ## Gameplay
 - Tap/click to make Viktor fly upwards.
 - Collect coins to build principal; coin types are worth 1 or 5 points.
 - Watch your wealth grow over time via compound interest (rate = 20% per second).
 - Avoid the boss or falling off-screen.
 - On Game Over, tap/click to restart.
 
 ## Mobile Compatibility
 - Responsive canvas fits full viewport.
 - Touch controls supported.
 
 ## Customization
 - Replace or add sounds, adjust interest rate, or tweak spawning timings in `main.js`.