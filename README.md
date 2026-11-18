# Comet Courier

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Zallan03/comet-courier/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Zallan03/comet-courier/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A deep-space delivery arcade, built for the [make.fun best-game-01 bounty](https://make.fun/bounty/best-game-01). Play it here: https://make.fun/r/tmbrnhrj

You are the pilot of a lone courier ship working the comet lanes. Glowing
cargo pods drift through the belt — scoop one up, then race it to the dock
that matches its colour before the next rock finds your hull.

## How to play

- **Pick up cargo:** fly into a glowing pod. You can carry one pod at a time.
- **Deliver:** fly into the dock with the matching colour (amber, magenta or
  green). A wrong dock bounces you off — no points, no mercy.
- **Combo:** deliver again within 8 seconds to raise your multiplier, up to
  **x3**. Let the timer run out and the combo resets.
- **Clear the wave:** deliver the wave's quota and you earn a wave bonus.
  Each new wave adds more cargo and faster, bigger asteroids.
- **Survive:** three asteroid hits ends the run. A hit also drops the cargo
  you are carrying and grants two seconds of shield.
- **Best score** is saved in your browser (localStorage).

## Scoring

| Action | Points |
| --- | --- |
| Deliver a pod | 100 × current combo (x1–x3) |
| Chain a delivery within 8 s | Combo +1 (max x3) |
| Clear a wave | 250 × wave number |
| Asteroid hit | −1 hull (and you drop your cargo) |

Wave quotas grow with each wave (wave 1 needs 4 deliveries, wave 2 needs 5,
and so on), and every wave adds another asteroid and a little more speed.

| Input | Action |
| --- | --- |
| WASD / Arrow keys | Thrust |
| Mouse / touch (hold) | Steer toward the pointer |
| Enter / Space / tap | Launch from the title screen |
| P or Esc | Pause / resume |
| M | Mute / unmute |
| R | Fly again after game over |

## Run it

No build step, no network, no dependencies. Serve the `game/` folder with
any static server and open `index.html`:

```sh
npx serve game
# or
python3 -m http.server --directory game 8080
```

All art is drawn in canvas code and all sound is synthesized live with
WebAudio — the game loads nothing from outside its own folder.

Deterministic screenshot scenes (used for the entry's screenshots):

- `game/index.html?shot=start` — title screen
- `game/index.html?shot=play` — mid-gameplay with the HUD
- `game/index.html?shot=end` — game-over screen

Add `&seed=N` to any of them for a different deterministic layout.

## Files

- `game/index.html` — the page, a full-screen canvas
- `game/src/main.js` — bootstrap and the 60 Hz game loop
- `game/src/config.js` — every tuning constant
- `game/src/world.js` — ship, pods, docks, asteroids, waves, scoring
- `game/src/render.js` — all drawing, HUD and screens
- `game/src/input.js` — keyboard, mouse and touch
- `game/src/audio.js` — synthesized WebAudio effects and ambient pad
- `game/src/shots.js` — deterministic screenshot scenes
- `game/src/random.js` — seeded RNG
- `main.ts` — the make.fun entrypoint (copies `game/` + `screenshots/`,
  writes `dossier.json`)
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

## License

MIT — see [LICENSE](LICENSE).
