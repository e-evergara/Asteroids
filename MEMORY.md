# MEMORY.md

Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte. Lo que ya es regla permanente vive en `AGENTS.md`, no aquí.

## Estado

- `AGENTS.md` está en **inglés** (2026-10-16); comentarios, README y comunicación en español.
- Sigue siendo el clon vanilla de Asteroids sin toolchain: no añadir `package.json`, bundler, tests ni lint.
- Último trabajo (2026-10-19): comandos `/worktree` (crear) y `/worktree-remove` (borrar) en `.opencode/commands/` (ver sección propia).
- Unión de worktrees (2026-10-17): `01-triple-shot`, `02-system-of-skins`, `03-shield` en `feat/03-union-worktrees`.
- Features previos: skins (2026-10-17), Estrella fugaz y power-up Velocidad (2026-10-16).

## Comandos de worktree (decisiones)

- Solo comandos, sin agente propio: `agent: build`, `subagent: false`, modelo `opencode/gpt-6-luna#low`.
- Las restricciones ("sin `cd`, sin otros comandos, sin editar archivos") son **solo de prompt**: no hay bloqueo por permisos porque los comandos no admiten `tools` en V2.
- `/worktree`: el argumento se trata como descripción y se resume a slug kebab-case (≤40 caracteres, solo `a-z0-9-`). Argumento vacío no ejecuta nada; error de git se reporta sin reintentos.
- `/worktree-remove`: nombre **literal** (permite espacios, rechaza `/`, `..` y metacaracteres). Orden obligatorio: inferir rama con `git -C .worktrees/<n> branch --show-current` → verificar con `show-ref` → `git worktree remove` → `git branch -d`. Sin `--force` ni `-D`; si el worktree falla, la rama no se toca.
- Ambos ejecutan desde el directorio actual (`.worktrees/` ya existe y está ignorado).

## Unión de worktrees (2026-10-17)

- 3 merges `--no-ff` sobre `d7a3073`; conflictos solo en `game.js` (bloques de `update()` e `initGame()`) resueltos conservando los tres features a la vez.
- Correcciones de integración: `this.shieldCharges = 0` en `Ship.reset()` (antes `NaN` en `checkExtraLife()`) y `asteroids.filter(a => !a.dead)` tras el bloqueo del escudo (si no, asteroide "fantasma" y nivel bloqueado).
- README sincronizado: tecla `T`, sección "Triple shot", fila "Escudo" en Power-ups, vidas extra en Características.
- Al terminar: **cambios staged y sin commitear** (`git reset --soft d7a3073`) a la espera de revisión. Worktrees **sin borrar** (los borra el usuario).

## Triple shot (decisiones)

- Globals `tripleShotActive`/`tripleShotTimer` + `TRIPLE_SHOT_DURATION = 5`; se activa con `T` (reinicia el temporizador si ya estaba activo), se limpia en `initGame()`.
- Mientras activo, `Espacio` lanza 3 `tryShoot()` consecutivos (misma dirección, comparten cooldown).

## Escudo (decisiones)

- Pickup `ShieldPickup` (TTL 10 s, parpadeo 2 s) cada `rand(12, 18)` s solo si no hay otro en pantalla ni escudo activo; efecto 5 s en `ship.shieldTime`.
- Bloqueo: destruye el asteroide con partículas, **no consume** el escudo; 25 % de probabilidad de soltar otro pickup si no hay ninguno.
- Vidas extra cada 10 000 pts (`nextExtraLife`, `checkExtraLife()`, máx. 5 vidas).

## Sistema de skins (decisiones)

- Array `SKINS` (5 entradas `{ name, color, flame }`) + `skinIndex` global; **solo cosmético** (nave + iconos de vidas), el resto sigue monocromo.
- Ciclo en caliente con `K` (`pressed('KeyK')`, rama `'playing'` de `update()`), no abre estados ni pantallas nuevas.
- Persistencia en `localStorage` clave `asteroids.skin`, lectura/escritura en `try/catch` (degrada a skin 0 en `file://` privado). `initGame()` **no** resetea `skinIndex`.
- Documentado en `README.md` (tabla de controles + sección "Skins de la nave").

## Estrella fugaz (decisiones)

- Clase `ShootingStar` propia; array global `shootingStars` + `shootingStarTimer` con `rand(10, 20)` s, solo una en pantalla a la vez (patrón de los power-ups). Se limpia en `nextLevel()`.
- Nace en un **borde aleatorio** y cruza en línea recta hacia el centro con jitter ±0.3 rad; **sin wrap toroidal**: muere al salir de pantalla (margen `STAR_OFFSCREEN = 170` px para que la cola termine de salir).
- Velocidad `rand(280, 380)` px/s (3–4× un asteroide). Vida `rand(3.5, 5)` s con **fade** de opacidad (`alpha = ttl/life`).
- Estela: historial `trail` de hasta `STAR_TRAIL_MAX = 24` posiciones (una por frame); polilínea con grosor (0.5→4 px) y opacidad decrecientes hacia la cola. Corta el trazo si el salto entre puntos > 100 px (protección de borde).
- **Destructible con bala: +300 puntos** (`STAR_POINTS`) y explosión de partículas. **No colisiona con la nave** (bonus puro). Blanco monocromo: el ámbar sigue siendo exclusivo del power-up.
- En estado `'dead'` la estrella sigue moviéndose (como los asteroides); en `'gameover'` no.

## Power-up "Velocidad" (decisiones)

- Aparición **periódica aleatoria**: cada `rand(8, 15)` s, solo si no hay otro en pantalla (temporizador `powerUpTimer`).
- Efecto: **solo impulso x2** (260 → 520 px/s²) durante 5 s; giro y disparo sin cambios. Recogerlo con el efecto activo **recarga** el temporizador, no acumula.
- Visual: círculo con rayo **ámbar `#ffcc00`** (único elemento con color en un juego monocromo), TTL 10 s con parpadeo los últimos 2 s.
- Helper `randomSafePos()` comparte la lógica de distancia segura (130 px) entre asteroides y power-ups.
- HUD en español: barra de progreso `drawSpeedBar()` (120×10 px, arriba a la izquierda, texto `VELOCIDAD x2` al lado). Se vacía en 5 s; relámpagos internos regenerados cada 100 ms (`performance.now()`, ya que `draw()` no recibe `dt`) y parpadeo cuando `speedTimer < 1.5`.

## Errores a evitar

- No olvidar registrar cada prompt en `MEMORY_PROMPTS.md` (append, con timestamp) sin leerlo en sesión.
- Si se cambia `W`/`H`, `POINTS` o `THRUST`, actualizar también `README.md` (tablas y constants).
