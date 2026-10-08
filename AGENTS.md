# AGENTS.md

## What this is

Vanilla HTML5 canvas Asteroids clone. **No package.json, no bundler, no dependencies, no tests, lint, typecheck, or CI.** Do not add build tooling unless explicitly asked — the zero-toolchain setup is intentional (see `README.md`).

## Run it

Open `index.html` directly in a browser, or serve the folder:

```bash
npx serve .        # then open http://localhost:3000
```

There is no `npm install` / `npm test` / typecheck – don't look for one.
Opening `index.html` directly (file://) also works. There is no other build/verify step.

## Structure

- `index.html` — page, inline CSS, fixed `800x600` canvas, loads `game.js` as a plain `<script>` (no ES modules, no `type="module"`).
- `game.js` — all game logic in one file (~420 lines), top-level `class`/`function` declarations. Keep changes in-file; don't split into modules.
- `favicon.svg` — static icon.

## Architecture

- All game logic lives in a single `game.js`, loaded via a plain `<script>` tag (no ES modules, no imports). Top-level `canvas`/`ctx`/`W`/`H` and classes are globals by design.
- Entry/flow: `initGame()` -> `requestAnimationFrame(loop)` -> `update(dt)` + `draw()` each frame.
- Game state machine: `'playing'` | `'dead'` | `'gameover'` (see `update()`).
- Loop is dt-based with a `0.05s` cap on `dt`; space is toroidal via `wrap(v, max)`, so every moving entity wraps on both axes.

## Non-obvious internals (game.js)

- **Lookup tables are indexed by asteroid size 1–3; index 0 is an unused placeholder:** `RADII`, `SPEEDS`, `POINTS`. Adding a size means extending all three plus related spawn logic.
- **Game state machine:** module-level `state` is one of `'playing' | 'dead' | 'gameover'`, driven by `deadTimer`.
- **Input:** `keys` (held) vs `justPressed` (one-frame edge) — use `pressed(code)` for single-trigger actions like firing.
- Screen wraps toroidally via `wrap(v, max)`; positions are never clamped.
- Main loop is a `requestAnimationFrame` tick (`loop(ts)`) computing `dt` from the previous timestamp — physics values are dt-scaled, not per-frame.

## Conventions

- Code comments and `README.md` are in **Spanish**; keep new comments/docs consistent with that.
- Scores, control tables, and feature descriptions in `README.md` must stay in sync with the constants in `game.js` (e.g. `POINTS`) if gameplay changes.
- Canvas is **800×600**, hardcoded in two places: `index.html` (`<canvas width height>`) and `game.js` (`W`/`H` constants). Change both together.
- User-facing strings, code comments, and the README are in **Spanish** – match that for any new HUD text, overlays, or comments.
- Entity pattern: a `class` with `update(dt)`, `draw()`, and a `dead` boolean flag. Register new entity arrays in `update()` (movement + collision) and `draw()`, and filter out `dead` entries each frame (see `bullets`/`asteroids`/`particles`).
- Tuning constants (speeds, radii, points, thrust, drag) are inline near their class – keep new tuning values local and documented.
