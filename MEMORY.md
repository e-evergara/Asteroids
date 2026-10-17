# MEMORY.md

Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte. Lo que ya es regla permanente vive en `AGENTS.md`, no aquí.

## Estado

- `AGENTS.md` está en **inglés** (2026-10-16); comentarios, README y comunicación en español.
- Sigue siendo el clon vanilla de Asteroids sin toolchain: no añadir `package.json`, bundler, tests ni lint.
- Último feature implementado (2026-10-16): power-up **"Velocidad"** en `game.js`.

## Power-up "Velocidad" (decisiones)

- Aparición **periódica aleatoria**: cada `rand(8, 15)` s, solo si no hay otro en pantalla (temporizador `powerUpTimer`).
- Efecto: **solo impulso x2** (260 → 520 px/s²) durante 5 s; giro y disparo sin cambios. Recogerlo con el efecto activo **recarga** el temporizador, no acumula.
- Visual: círculo con rayo **ámbar `#ffcc00`** (único elemento con color en un juego monocromo), TTL 10 s con parpadeo los últimos 2 s.
- Helper `randomSafePos()` comparte la lógica de distancia segura (130 px) entre asteroides y power-ups.
- HUD en español: `VELOCIDAD x2  N.Ns` bajo el score mientras está activo.

## Errores a evitar

- No olvidar registrar cada prompt en `MEMORY_PROMPTS.md` (append, con timestamp) sin leerlo en sesión.
- Si se cambia `W`/`H`, `POINTS` o `THRUST`, actualizar también `README.md` (tablas y constants).
