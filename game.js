'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
    justPressed[e.code] = !keys[e.code];
    keys[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
        e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
    const val = justPressed[code];
    justPressed[code] = false;
    return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap = (v, max) => ((v % max) + max) % max;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const rand = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        const SPEED = 520;
        this.vx = Math.cos(angle) * SPEED;
        this.vy = Math.sin(angle) * SPEED;
        this.ttl = 1.1;
        this.radius = 2;
        this.dead = false;
    }

    update(dt) {
        this.x = wrap(this.x + this.vx * dt, W);
        this.y = wrap(this.y + this.vy * dt, H);
        this.ttl -= dt;
        if (this.ttl <= 0) this.dead = true;
    }

    draw() {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
    constructor(x, y, size = 3) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.radius = RADII[size];
        this.dead = false;

        const angle = rand(0, Math.PI * 2);
        const speed = SPEEDS[size] + rand(-15, 15);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.rotSpeed = rand(-1.2, 1.2);
        this.rot = rand(0, Math.PI * 2);

        // Polígono irregular
        const n = randInt(8, 13);
        this.verts = [];
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            const r = this.radius * rand(0.6, 1.0);
            this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
        }
    }

    update(dt) {
        this.x = wrap(this.x + this.vx * dt, W);
        this.y = wrap(this.y + this.vy * dt, H);
        this.rot += this.rotSpeed * dt;
    }

    split() {
        if (this.size <= 1) return [];
        return [
            new Asteroid(this.x, this.y, this.size - 1),
            new Asteroid(this.x, this.y, this.size - 1),
        ];
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(this.verts[0][0], this.verts[0][1]);
        for (let i = 1; i < this.verts.length; i++)
            ctx.lineTo(this.verts[i][0], this.verts[i][1]);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }
}

// ── Estrella fugaz (Shooting Star) ────────────────────────────────────────────
const STAR_SPEED = [280, 380];   // px/s (3–4× la velocidad de un asteroide)
const STAR_LIFE = [3.5, 5];      // s de vida; la opacidad se desvanece hasta 0
const STAR_POINTS = 300;         // puntos al destruirla
const STAR_TRAIL_MAX = 24;       // puntos del historial de la estela
const STAR_OFFSCREEN = 170;      // margen fuera de pantalla antes de morir (deja salir la cola)

class ShootingStar {
    constructor() {
        // Nace en un borde aleatorio y cruza en línea recta hacia el lado opuesto
        const side = randInt(0, 3);   // 0=arriba, 1=derecha, 2=abajo, 3=izquierda
        if (side === 0) { this.x = rand(0, W); this.y = -10; }
        else if (side === 1) { this.x = W + 10; this.y = rand(0, H); }
        else if (side === 2) { this.x = rand(0, W); this.y = H + 10; }
        else { this.x = -10; this.y = rand(0, H); }

        const angle = Math.atan2(H / 2 - this.y, W / 2 - this.x) + rand(-0.3, 0.3);
        const speed = rand(STAR_SPEED[0], STAR_SPEED[1]);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        this.radius = 7;
        this.life = rand(STAR_LIFE[0], STAR_LIFE[1]);
        this.ttl = this.life;
        this.trail = [{ x: this.x, y: this.y }];   // historial de posiciones
        this.dead = false;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        this.ttl -= dt;
        if (this.ttl <= 0) this.dead = true;

        // Muere al alejarse de la pantalla (sin wrap toroidal)
        if (this.x < -STAR_OFFSCREEN || this.x > W + STAR_OFFSCREEN ||
            this.y < -STAR_OFFSCREEN || this.y > H + STAR_OFFSCREEN) this.dead = true;

        // Historial para la estela (un punto por frame)
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > STAR_TRAIL_MAX) this.trail.shift();
    }

    draw() {
        const alpha = Math.max(0, this.ttl / this.life);

        ctx.save();
        ctx.lineCap = 'round';

        // Estela: grosor y opacidad decrecientes hacia la cola
        for (let i = 1; i < this.trail.length; i++) {
            const a = this.trail[i - 1];
            const b = this.trail[i];
            if (Math.hypot(b.x - a.x, b.y - a.y) > 100) continue;   // corta saltos de borde
            const t = i / (this.trail.length - 1);   // 0 = cola, 1 = cabeza
            ctx.strokeStyle = `rgba(255,255,255,${(alpha * t * 0.8).toFixed(3)})`;
            ctx.lineWidth = 0.5 + 3.5 * t;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
        }

        // Cuerpo: círculo blanco desvanecido
        ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// ── Skins de la nave ──────────────────────────────────────────────────────────
// Cada skin define el color de la silueta y el de la llama del propulsor.
// Se cambia en caliente con la tecla K; la elegida se guarda en localStorage.
const SKINS = [
    { name: 'CLÁSICA', color: '#fff',      flame: 'rgba(255, 130, 0, 0.85)' },   // la original
    { name: 'ÁMBAR',   color: '#ffcc00',   flame: 'rgba(255, 170, 0, 0.85)' },
    { name: 'CIAN',    color: '#33e6ff',   flame: 'rgba(0, 140, 255, 0.85)' },
    { name: 'VERDE',   color: '#66ff99',   flame: 'rgba(140, 255, 60, 0.85)' },
    { name: 'MAGENTA', color: '#ff5ce1',   flame: 'rgba(190, 0, 255, 0.85)' },
];
const SKIN_KEY = 'asteroids.skin';   // clave de persistencia en localStorage

// Índice de skin activa; se carga de localStorage (0 si no hay nada válido)
let skinIndex = (() => {
    try {
        const i = parseInt(localStorage.getItem(SKIN_KEY), 10);
        return Number.isInteger(i) && i >= 0 && i < SKINS.length ? i : 0;
    } catch (e) {
        return 0;   // localStorage no disponible: skin clásica sin persistencia
    }
})();

function cycleSkin() {
    skinIndex = (skinIndex + 1) % SKINS.length;
    try { localStorage.setItem(SKIN_KEY, String(skinIndex)); } catch (e) { /* sin persistencia */ }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
    constructor() { this.reset(); }

    reset() {
        this.x = W / 2;
        this.y = H / 2;
        this.angle = -Math.PI / 2;
        this.vx = 0;
        this.vy = 0;
        this.radius = 12;
        this.thrusting = false;
        this.invincible = 3;
        this.shootCooldown = 0;
        this.speedTimer = 0;   // power-up "Velocidad": s restantes de impulso x2
        this.dead = false;

        // Escudo
        this.shieldActive  = false;   // ¿está activo?
        this.shieldTime    = 0;       // tiempo restante (segundos)
        this.shieldMax     = SHIELD_DURATION;     // duración
        this.shieldRadius  = 28;      // radio efectivo del escudo
        this.shieldArc     = Math.PI * 2; // círculo completo
        this.shieldCharges = 0;       // cargas extra (vida extra a los 10000 pts)
    }

    update(dt) {
        if (this.dead) return;
        if (this.invincible > 0) this.invincible -= dt;
        if (this.shootCooldown > 0) this.shootCooldown -= dt;
        if (this.speedTimer > 0) this.speedTimer -= dt;

        const ROT = 3.5;   // rad/s
        const THRUST = this.speedTimer > 0 ? 520 : 260;  // px/s² (x2 con "Velocidad")
        const DRAG = 0.987;

        if (keys['ArrowLeft']) this.angle -= ROT * dt;
        if (keys['ArrowRight']) this.angle += ROT * dt;

        this.thrusting = !!keys['ArrowUp'];
        if (this.thrusting) {
            this.vx += Math.cos(this.angle) * THRUST * dt;
            this.vy += Math.sin(this.angle) * THRUST * dt;
        }

        this.vx *= DRAG;
        this.vy *= DRAG;
        this.x = wrap(this.x + this.vx * dt, W);
        this.y = wrap(this.y + this.vy * dt, H);
    }

    tryShoot(triple = false) {
        if (this.shootCooldown > 0 || this.dead) return [];
        this.shootCooldown = 0.2;
        const NOSE = 21;
        const ox = this.x + Math.cos(this.angle) * NOSE;
        const oy = this.y + Math.sin(this.angle) * NOSE;
        if (!triple) return [new Bullet(ox, oy, this.angle)];
        const da = 0.05; // ~2.86°
        return [
            new Bullet(ox, oy, this.angle - da),
            new Bullet(ox, oy, this.angle),
            new Bullet(ox, oy, this.angle + da),
        ];
    }

    draw() {
        if (this.dead) return;
        // Parpadeo durante invencibilidad de reaparición
        if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        const skin = SKINS[skinIndex];
        ctx.strokeStyle = skin.color;
        ctx.lineWidth = 1.5;
        ctx.lineJoin = 'round';

        // Silueta clásica: triángulo con muesca trasera
        ctx.beginPath();
        ctx.moveTo(20, 0);   // nariz
        ctx.lineTo(-12, -9);   // ala izquierda
        ctx.lineTo(-7, 0);   // muesca trasera
        ctx.lineTo(-12, 9);   // ala derecha
        ctx.closePath();
        ctx.stroke();

        // Llama del propulsor
        if (this.thrusting && Math.random() > 0.35) {
            ctx.beginPath();
            ctx.moveTo(-8, -4);
            ctx.lineTo(-8 - rand(6, 14), 0);
            ctx.lineTo(-8, 4);
            ctx.strokeStyle = skin.flame;
            ctx.stroke();
        }

        // Escudo (esfera azul cielo completa con escudito dentro)
        if (this.shieldActive) {
            let alpha = 0.4;
            if (this.shieldTime < 1.0) {
                // Parpadeo cuando queda poco tiempo
                alpha = (Math.floor(this.shieldTime * 10) % 2 === 0) ? 0.15 : 0.55;
            }
            ctx.save();
            ctx.globalAlpha = alpha;

            // Halo suave
            const g = ctx.createRadialGradient(0, 0, 4, 0, 0, this.shieldRadius + 4);
            g.addColorStop(0, 'rgba(201, 228, 255, 0.95)');
            g.addColorStop(0.6, 'rgba(127, 191, 255, 0.35)');
            g.addColorStop(1, 'rgba(127, 191, 255, 0.1)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, 0, this.shieldRadius + 4, 0, Math.PI * 2);
            ctx.fill();

            // Círculo principal azul cielo
            ctx.strokeStyle = '#7fbfff';
            ctx.fillStyle = 'rgba(201, 228, 255, 0.2)';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, this.shieldRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Brillo superior
            ctx.fillStyle = 'rgba(240, 249, 255, 0.45)';
            ctx.beginPath();
            ctx.arc(-4, -4, 4, 0, Math.PI * 2);
            ctx.fill();

            // Escudito dentro
            ctx.save();
            ctx.scale(0.6, 0.6);
            ctx.strokeStyle = '#f0f9ff';
            ctx.fillStyle = 'rgba(240, 249, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(0, -10);
            ctx.bezierCurveTo(8, -5, 10, 4, 0, 10);
            ctx.bezierCurveTo(-10, 4, -8, -5, 0, -10);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            ctx.restore();
        }

        ctx.restore();
    }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        const angle = rand(0, Math.PI * 2);
        const speed = rand(30, 130);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = rand(0.4, 1.1);
        this.ttl = this.life;
        this.dead = false;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.ttl -= dt;
        if (this.ttl <= 0) this.dead = true;
    }

    draw() {
        const alpha = this.ttl / this.life;
        ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
        ctx.stroke();
    }
}

// ── Shield Pickup (Escudo) ─────────────────────────────────────────────────────
const SHIELD_LIFE = 10;      // s que permanece en pantalla
const SHIELD_DURATION = 5;   // s de efecto al recogerlo
const SHIELD_BLINK = 2;      // s de parpadeo antes de desaparecer

class ShieldPickup {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 14;
        this.ttl = SHIELD_LIFE;
        this.dead = false;
    }

    update(dt) {
        this.ttl -= dt;
        if (this.ttl <= 0) this.dead = true;
    }

    draw() {
        if (this.ttl <= SHIELD_BLINK && Math.floor(this.ttl * 8) % 2 === 0) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        const g = ctx.createRadialGradient(0, 0, 2, 0, 0, this.radius + 6);
        g.addColorStop(0, 'rgba(201, 228, 255, 0.95)');
        g.addColorStop(0.6, 'rgba(127, 191, 255, 0.25)');
        g.addColorStop(1, 'rgba(127, 191, 255, 0.05)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#7fbfff';
        ctx.fillStyle = 'rgba(201, 228, 255, 0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(240, 249, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(-3, -3, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.scale(0.55, 0.55);
        ctx.strokeStyle = '#f0f9ff';
        ctx.fillStyle = 'rgba(240, 249, 255, 0.25)';
        ctx.lineWidth = 1.8;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(0, -9);
        ctx.bezierCurveTo(7, -4, 9, 3, 0, 9);
        ctx.bezierCurveTo(-9, 3, -7, -4, 0, -9);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
    }
}

// ── PowerUp (Velocidad) ───────────────────────────────────────────────────────
const POWERUP_LIFE = 10;      // s que permanece en pantalla
const POWERUP_DURATION = 5;   // s de efecto al recogerlo
const POWERUP_BLINK = 2;      // s de parpadeo antes de desaparecer

class PowerUp {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 13;
        this.ttl = POWERUP_LIFE;
        this.dead = false;
    }

    update(dt) {
        this.ttl -= dt;
        if (this.ttl <= 0) this.dead = true;
    }

    draw() {
        // Parpadeo durante los últimos POWERUP_BLINK segundos
        if (this.ttl <= POWERUP_BLINK && Math.floor(this.ttl * 8) % 2 === 0) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Círculo ámbar (único elemento con color para distinguirlo)
        ctx.strokeStyle = '#ffcc00';
        ctx.fillStyle = 'rgba(255, 204, 0, 0.15)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Rayo
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.moveTo(3, -9);
        ctx.lineTo(-5, 1);
        ctx.lineTo(-1, 1);
        ctx.lineTo(-3, 9);
        ctx.lineTo(5, -1);
        ctx.lineTo(1, -1);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerUps, shootingStars, shieldPickups;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let tripleShotActive = false;
let tripleShotTimer = 0;
const TRIPLE_SHOT_DURATION = 5.0;
let powerUpTimer;   // s hasta el siguiente power-up si no hay ninguno en pantalla
let shootingStarTimer;   // s hasta la siguiente estrella fugaz si no hay ninguna en pantalla
let shieldTimer;    // s hasta el siguiente escudo si no hay ninguno en pantalla

// Posición aleatoria a distancia segura del centro (para spawns)
function randomSafePos() {
    const SAFE_DIST = 130;
    let x, y;
    do {
        x = rand(0, W);
        y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    return { x, y };
}

function spawnAsteroids(count) {
    for (let i = 0; i < count; i++) {
        const { x, y } = randomSafePos();
        asteroids.push(new Asteroid(x, y, 3));
    }
}

function spawnPowerUp() {
    const { x, y } = randomSafePos();
    powerUps.push(new PowerUp(x, y));
}

function spawnShieldPickup() {
    const { x, y } = randomSafePos();
    shieldPickups.push(new ShieldPickup(x, y));
}

function spawnShootingStar() {
    shootingStars.push(new ShootingStar());
}

function initGame() {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    score = 0;
    lives = 3;
    level = 1;
    state = 'playing';
    powerUps = [];
    shieldPickups = [];
    shootingStars = [];
    powerUpTimer = rand(8, 15);
    shootingStarTimer = rand(10, 20);
    deadTimer = 0;
    tripleShotActive = false;
    tripleShotTimer = 0;
    shieldTimer = rand(12, 18);
    nextExtraLife = 10000;
    spawnAsteroids(4);
}

function nextLevel() {
    level++;
    bullets = [];
    particles = [];
    powerUps = [];
    shieldPickups = [];
    shootingStars = [];
    powerUpTimer = rand(8, 15);
    shootingStarTimer = rand(10, 20);
    shieldTimer = rand(12, 18);
    ship.reset();
    spawnAsteroids(3 + level);
}

// Genera vidas extra cada 10000 puntos
function checkExtraLife() {
    if (score >= nextExtraLife) {
        nextExtraLife += 10000;
        lives = Math.min(lives + 1, 5);
        if (ship) {
            ship.shieldCharges = Math.min(ship.shieldCharges + 1, 1);
        }
    }
}

// Variables para vidas extra
let nextExtraLife = 10000;

function explode(x, y, count = 8) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function spawnParticles(x, y, count, life = 0.8) {
    for (let i = 0; i < count; i++) {
        const p = new Particle(x, y);
        p.life = life;
        p.ttl  = life;
        particles.push(p);
    }
}

function killShip() {
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    // Desactivar escudo al morir
    if (ship) {
        ship.shieldActive = false;
        ship.shieldTime   = 0;
    }
    lives--;
    if (lives <= 0) {
        state = 'gameover';
    } else {
        state = 'dead';
        deadTimer = 2;
    }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
    if (state === 'gameover') {
        if (pressed('Space')) initGame();
        particles.forEach(p => p.update(dt));
        particles = particles.filter(p => !p.dead);
        return;
    }

    if (state === 'dead') {
        deadTimer -= dt;
        particles.forEach(p => p.update(dt));
        particles = particles.filter(p => !p.dead);
        asteroids.forEach(a => a.update(dt));
        shootingStars.forEach(s => s.update(dt));
        shootingStars = shootingStars.filter(s => !s.dead);
        if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
        return;
    }

    // Temporizador del triple shot
    if (state === 'playing' && tripleShotActive) {
        tripleShotTimer -= dt;
        if (tripleShotTimer <= 0) {
            tripleShotActive = false;
            tripleShotTimer = 0;
        }
    }

    // Activar triple shot con T
    if (state === 'playing' && pressed('KeyT')) {
        tripleShotActive = true;
        tripleShotTimer = TRIPLE_SHOT_DURATION;
    }

    // Skins: cambiar apariencia de la nave en caliente (K)
    if (pressed('KeyK')) cycleSkin();

    // Disparar
    if (state === 'playing' && pressed('Space')) {
        bullets.push(...ship.tryShoot(tripleShotActive));
    }

    // Actualizar escudo
    if (ship && !ship.dead && state === 'playing' && ship.shieldActive) {
        ship.shieldTime -= dt;
        if (ship.shieldTime <= 0) {
            ship.shieldActive = false;
            ship.shieldTime   = 0;
        }
    }

    // Activar escudo con tecla A (desactivado: ahora aparece automáticamente)
    // Escudo se activa al recoger ShieldPickup

    // Power-up: aparición periódica (solo si no hay ninguno en pantalla)
    if (powerUps.length === 0) {
        powerUpTimer -= dt;
        if (powerUpTimer <= 0) {
            spawnPowerUp();
            powerUpTimer = rand(8, 15);
        }
    }

    // Escudo: aparición periódica automática (solo si no hay ninguno en pantalla)
    if (shieldPickups.length === 0 && !ship.shieldActive) {
        shieldTimer -= dt;
        if (shieldTimer <= 0) {
            spawnShieldPickup();
            shieldTimer = rand(12, 18);
        }
    }

    // Estrella fugaz: aparición periódica (solo una en pantalla a la vez)
    if (shootingStars.length === 0) {
        shootingStarTimer -= dt;
        if (shootingStarTimer <= 0) {
            spawnShootingStar();
            shootingStarTimer = rand(10, 20);
        }
    }

    ship.update(dt);
    bullets.forEach(b => b.update(dt));
    asteroids.forEach(a => a.update(dt));
    particles.forEach(p => p.update(dt));
    powerUps.forEach(p => p.update(dt));
    shieldPickups.forEach(s => s.update(dt));
    shootingStars.forEach(s => s.update(dt));

    bullets = bullets.filter(b => !b.dead);
    particles = particles.filter(p => !p.dead);
    powerUps = powerUps.filter(p => !p.dead);
    shieldPickups = shieldPickups.filter(s => !s.dead);
    shootingStars = shootingStars.filter(s => !s.dead);

    // Bala vs asteroide
    const newAsteroids = [];
    for (const b of bullets) {
        for (const a of asteroids) {
            if (!a.dead && !b.dead && dist(b, a) < a.radius) {
                b.dead = true;
                a.dead = true;
                score += POINTS[a.size];
                checkExtraLife();
                explode(a.x, a.y, a.size * 5);
                newAsteroids.push(...a.split());
            }
        }
    }
    asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
    bullets = bullets.filter(b => !b.dead);

    // Bala vs estrella fugaz
    for (const b of bullets) {
        for (const s of shootingStars) {
            if (!s.dead && !b.dead && dist(b, s) < s.radius) {
                b.dead = true;
                s.dead = true;
                score += STAR_POINTS;
                explode(s.x, s.y, 12);
            }
        }
    }
    shootingStars = shootingStars.filter(s => !s.dead);
    bullets = bullets.filter(b => !b.dead);

    // Nave vs power-up
    for (const p of powerUps) {
        if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
            p.dead = true;
            ship.speedTimer = POWERUP_DURATION;   // recarga, no acumula
            explode(p.x, p.y, 10);
        }
    }
    powerUps = powerUps.filter(p => !p.dead);

    // Nave vs escudo pickup
    for (const s of shieldPickups) {
        if (!s.dead && dist(ship, s) < ship.radius + s.radius) {
            s.dead = true;
            if (!ship.shieldActive) {
                ship.shieldActive = true;
                ship.shieldTime   = SHIELD_DURATION;
                ship.shieldRadius = 28;
                ship.shieldArc    = Math.PI * 2; // círculo completo
            }
            explode(s.x, s.y, 8);
        }
    }
    shieldPickups = shieldPickups.filter(s => !s.dead);

    // Nave vs asteroide
    if (ship.invincible <= 0) {
        for (const a of asteroids) {
            if (!a.dead && dist(ship, a) < ship.radius + a.radius * 0.82) {
                if (ship.shieldActive) {
                    // Escudo bloquea el impacto: destruye asteroide
                    a.dead = true;
                    explode(a.x, a.y, 6); // partículas al bloquear con escudo
                    // Solo por tiempo: no se desactiva
                    // Aleatoriamente, al bloquear un impacto, puede aparecer otro escudo
                    if (Math.random() < 0.25) {
                        if (shieldPickups.length === 0) {
                            spawnShieldPickup();
                            shieldTimer = rand(12, 18);
                        }
                    }
                } else {
                    killShip();
                    break;
                }
            }
        }
    }

    // Filtra asteroides destruidos por el escudo (si no, quedarían "fantasma")
    asteroids = asteroids.filter(a => !a.dead);

    // Nivel completado
    if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
// Icono de vida (usa el color de la skin activa)
function drawLifeIcon(x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 2);
    ctx.strokeStyle = SKINS[skinIndex].color;
    ctx.lineWidth = 1.2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(-6, -5);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-6, 5);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
}

// Barra de progreso del power-up "Velocidad" (arriba a la izquierda)
// Se vacía de izquierda a derecha; relámpagos internos mientras está activa.
const BAR_W = 120;
const BAR_H = 10;
let boltBolts = [];       // relámpagos internos: array de polilíneas [[x,y], ...]
let boltTime = 0;         // timestamp de la última regeneración de relámpagos

function makeBolts(fillW) {
    // 1–2 relámpagos zigzagueantes dentro del área rellena de la barra
    const count = randInt(1, 2);
    const bolts = [];
    for (let i = 0; i < count; i++) {
        const pts = [];
        const segs = randInt(4, 6);
        const x0 = rand(4, Math.max(5, fillW - 4));
        const y0 = rand(2, BAR_H - 2);
        pts.push([x0, y0]);
        for (let s = 1; s <= segs; s++) {
            const x = x0 + rand(-14, 14) * (s / segs) + rand(-6, 6);
            const y = y0 + rand(-3, 3);
            pts.push([
                Math.max(1, Math.min(fillW - 1, x)),
                Math.max(1, Math.min(BAR_H - 1, y)),
            ]);
        }
        bolts.push(pts);
    }
    return bolts;
}

function drawSpeedBar() {
    const x = 14;
    const y = 50;
    const ratio = Math.max(0, Math.min(1, ship.speedTimer / POWERUP_DURATION));
    const fillW = Math.round((BAR_W - 4) * ratio);
    const ending = ship.speedTimer < 1.5;   // aviso de que está por terminar

    // Regenerar relámpagos cada ~100 ms
    const now = performance.now();
    if (now - boltTime > 100) {
        boltBolts = makeBolts(fillW);
        boltTime = now;
    }

    // Borde
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 0.5, y + 0.5, BAR_W - 1, BAR_H - 1);

    if (fillW <= 0) return;

    // Relleno ámbar (parpadea al quedar poco tiempo)
    const flicker = ending && Math.floor(ship.speedTimer * 8) % 2 === 0 ? 0.45 : 0.9;
    ctx.fillStyle = `rgba(255, 204, 0, ${flicker})`;
    ctx.fillRect(x + 2, y + 2, fillW, BAR_H - 4);

    // Relámpagos internos (blanco sobre el relleno)
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    for (const b of boltBolts) {
        ctx.beginPath();
        ctx.moveTo(x + 2 + b[0][0], y + 2 + b[0][1]);
        for (let i = 1; i < b.length; i++)
            ctx.lineTo(x + 2 + b[i][0], y + 2 + b[i][1]);
        ctx.stroke();
    }

    // Etiqueta al lado de la barra
    ctx.fillStyle = '#ffcc00';
    ctx.font = '15px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('VELOCIDAD x2', x + BAR_W + 10, y + BAR_H - 1);
    ctx.fillStyle = '#fff';
}


function drawShieldBar() {
    if (!ship || !ship.shieldActive) return;
    const x = 14;
    const y = 86;
    const ratio = Math.max(0, Math.min(1, ship.shieldTime / SHIELD_DURATION));
    const fillW = Math.round((BAR_W - 4) * ratio);
    const ending = ship.shieldTime < 1.0;

    // Regenerar relámpagos cada ~100 ms (reutiliza sistema de bolts)
    const now = performance.now();
    if (now - boltTime > 100) {
        boltBolts = makeBolts(fillW);
        boltTime = now;
    }

    // Borde
    ctx.strokeStyle = '#7fbfff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 0.5, y + 0.5, BAR_W - 1, BAR_H - 1);

    if (fillW <= 0) return;

    // Relleno azul cielo (parpadea al quedar poco)
    const flicker = ending && Math.floor(ship.shieldTime * 8) % 2 === 0 ? 0.4 : 0.85;
    ctx.fillStyle = `rgba(127, 191, 255, ${flicker})`;
    ctx.fillRect(x + 2, y + 2, fillW, BAR_H - 4);

    // Relámpagos internos (blanco azulado)
    ctx.strokeStyle = '#f0f9ff';
    ctx.lineWidth = 1;
    for (const b of boltBolts) {
        ctx.beginPath();
        ctx.moveTo(x + 2 + b[0][0], y + 2 + b[0][1]);
        for (let i = 1; i < b.length; i++)
            ctx.lineTo(x + 2 + b[i][0], y + 2 + b[i][1]);
        ctx.stroke();
    }

    // Etiqueta
    ctx.fillStyle = '#7fbfff';
    ctx.font = '15px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('ESCUDO', x + BAR_W + 10, y + BAR_H - 1);
    ctx.fillStyle = '#fff';
}

function drawHUD() {
    ctx.fillStyle = '#fff';
    ctx.font = '15px monospace';

    ctx.textAlign = 'left';
    ctx.fillText(`SCORE  ${score}`, 14, 26);

    ctx.textAlign = 'center';
    ctx.fillText(`NIVEL ${level}`, W / 2, 26);

    // Indicador del power-up "Velocidad" activo
    if (ship.speedTimer > 0) drawSpeedBar();

    if (tripleShotActive) {
        const x = 14;
        const y = 68;
        const ratio = Math.max(0, Math.min(1, tripleShotTimer / TRIPLE_SHOT_DURATION));
        const fillW = Math.round((BAR_W - 4) * ratio);
        const tsEnding = tripleShotTimer < 1.5;

        const now = performance.now();
        if (now - boltTime > 100) {
            boltBolts = makeBolts(fillW);
            boltTime = now;
        }

        ctx.save();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 0.5, y + 0.5, BAR_W - 1, BAR_H - 1);

        if (fillW > 0) {
            const tsFlick = tsEnding && Math.floor(tripleShotTimer * 8) % 2 === 0 ? 0.45 : 0.9;
            ctx.fillStyle = `rgba(255, 59, 48, ${tsFlick})`;
            ctx.fillRect(x + 2, y + 2, fillW, BAR_H - 4);

            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            for (const b of boltBolts) {
                ctx.beginPath();
                ctx.moveTo(x + 2 + b[0][0], y + 2 + b[0][1]);
                for (let i = 1; i < b.length; i++)
                    ctx.lineTo(x + 2 + b[i][0], y + 2 + b[i][1]);
                ctx.stroke();
            }
        }

        ctx.fillStyle = '#ff3b30';
        ctx.font = '15px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('TRIPLE SHOT', x + BAR_W + 10, y + BAR_H - 1);
        ctx.fillStyle = '#fff';
        ctx.restore();
    }

    for (let i = 0; i < lives; i++)
        drawLifeIcon(W - 16 - i * 22, 18);

    drawShieldBar();

}

function drawOverlay(title, sub) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 46px monospace';
    ctx.fillText(title, W / 2, H / 2 - 18);
    ctx.font = '18px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    particles.forEach(p => p.draw());
    asteroids.forEach(a => a.draw());
    powerUps.forEach(p => p.draw());
    shieldPickups.forEach(s => s.draw());
    shootingStars.forEach(s => s.draw());
    bullets.forEach(b => b.draw());
    ship.draw();

    drawHUD();

    if (state === 'gameover')
        drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    update(dt);
    draw();
    requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);