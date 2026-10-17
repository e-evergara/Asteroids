# Asteroids

Clon del clásico arcade **Asteroids** implementado en canvas HTML5 puro, sin dependencias ni bundler.

## Descripción

Nave espacial en un campo de asteroides con envolvimiento de bordes (el espacio es toroidal). Destruye asteroides para sumar puntos: los grandes se parten en medianos, los medianos en pequeños. Incluye power-ups especiales y tipos de asteroides únicos como la estrella fugaz.

## Tecnologías

- **HTML5 Canvas** — renderizado 2D
- **JavaScript (ES6+)** — lógica del juego en un solo archivo `game.js`
- Sin frameworks, sin bundler, sin dependencias

## Cómo correr

Abre `index.html` directamente en el navegador (doble clic), o usa un servidor local:

```bash
npx serve .
```

Luego visita `http://localhost:3000`.

## Controles

| Tecla     | Acción     |
| --------- | ---------- |
| `←` `→`   | Rotar nave |
| `↑`       | Propulsar  |
| `Espacio` | Disparar   |

## Puntuación

| Asteroide | Puntos |
| --------- | ------ |
| Grande    | 20     |
| Mediano   | 50     |
| Pequeño   | 100    |

## Power-ups

| Power-up   | Efecto                                              | Duración |
| ---------- | --------------------------------------------------- | -------- |
| Velocidad  | La nave acelera el doble (impulso x2: 260 → 520 px/s²) | 5 s      |

- Aparece solo en pantalla, en una posición aleatoria cada 8–15 s, si no hay ninguno ya visible.
- Dura 10 s en pantalla y parpadea en los últimos 2 s antes de desaparecer.
- Recogerlo con el efecto activo recarga el temporizador (no se acumula).
- Mientras el efecto dura, una **barra de progreso** en la esquina superior izquierda (junto al texto `VELOCIDAD x2`) se vacía de izquierda a derecha; tiene relámpagos internos y parpadea al quedar menos de 1,5 s.

## Estrella fugaz

| Asteroide especial | Velocidad                        | Duración              | Puntos |
| ------------------ | -------------------------------- | --------------------- | ------ |
| Estrella fugaz     | 280–380 px/s (3–4× un asteroide) | 3,5–5 s (se desvanece) | 300    |

- Nace en un borde aleatorio y cruza en línea recta hacia el lado opuesto; no se envuelve en los bordes, muere al salir de pantalla.
- Su opacidad se desvanece gradualmente durante toda su vida.
- Deja una **estela** detrás (historial de posiciones) que reduce su grosor y opacidad hacia la cola.
- Se puede destruir con un disparo (+300 puntos y explosión); la nave la atraviesa sin efecto.
- Aparece cada 10–20 s, solo una en pantalla a la vez.

## Características

- 3 vidas con invencibilidad temporal al reaparecer (parpadeo)
- Asteroides se parten en fragmentos más pequeños al ser destruidos
- Partículas de explosión al destruir asteroides
- Power-up "Velocidad" (rayo ámbar) con barra de progreso y relámpagos en el HUD
- Asteroide especial "Estrella fugaz" (blanco, con estela desvaneciente, 300 puntos)