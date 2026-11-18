// shots.js — deterministic screenshot scenes for Comet Courier.
//
// The game reads ?shot=start | play | end (plus optional &seed=N) and
// builds one frozen, fully-drawn frame from a seeded world: no wall
// clock, no live input, no audio. Once the frame is drawn it sets
// window.__shotReady so the screenshot tool knows the scene is done.

import { VIEW, POD_HEX } from './config.js';
import { createWorld } from './world.js';
import { drawWorld } from './render.js';

function step(world, seconds) {
  const dt = 1 / 60;
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i++) {
    world.update(dt, null, null);
  }
}

function seedWorld(seed, best) {
  const world = createWorld(seed, best);
  world.time = 0;
  return world;
}

export function applyShot(ctx, shot, seed) {
  let world;

  if (shot === 'start') {
    // Title screen over a living starfield with drifting asteroids.
    world = seedWorld(seed, 1250);
    world.state = 'title';
    step(world, 2.5);
    world.state = 'title';
  } else if (shot === 'play') {
    // Mid-gameplay: wave 2, a healthy score, a x2 combo running, an amber
    // pod already aboard, asteroids closing in, HUD fully lit.
    world = seedWorld(seed, 2400);
    world.startGame(seed + 7);
    world.score = 1250;
    world.wave = 2;
    world.delivered = 3;
    world.quota = 5;
    world.combo = 2;
    world.comboTimer = 5.2;
    world.hull = 3;
    world.ship.x = 520;
    world.ship.y = 330;
    world.ship.vx = -190;
    world.ship.vy = -40;
    world.ship.angle = Math.PI - 0.25;
    world.ship.thrusting = true;
    const amber = world.pods.find((pod) => pod.color === 'amber') || world.pods[0];
    world.carrying = amber;
    world.pods = world.pods.filter((pod) => pod !== amber);
    world.asteroids[0].x = 700;
    world.asteroids[0].y = 240;
    if (world.asteroids[1]) {
      world.asteroids[1].x = 380;
      world.asteroids[1].y = 520;
    }
    world.particles.push({
      x: 470, y: 340, vx: -90, vy: 40, life: 0.25, maxLife: 0.28, size: 3,
      color: '#ffb02e',
    });
    world.particles.push({
      x: 478, y: 330, vx: -110, vy: -20, life: 0.2, maxLife: 0.28, size: 4,
      color: '#ffb02e',
    });
    world.floaters.push({
      x: 640, y: 250, text: '+200', color: POD_HEX.amber, life: 0.9, maxLife: 1.25, size: 24,
    });
    step(world, 0.4);
    world.state = 'playing';
    world.ship.thrusting = true;
  } else if (shot === 'end') {
    // Game over: hull gone, wreckage bursting, final score on screen.
    world = seedWorld(seed, 3200);
    world.startGame(seed + 13);
    world.score = 2340;
    world.wave = 3;
    world.delivered = 4;
    world.quota = 6;
    world.combo = 1;
    world.comboTimer = 0;
    world.hull = 0;
    world.ship.x = 640;
    world.ship.y = 360;
    world.finishGameOver();
    world.endTimer = 0.7;
    step(world, 0.25);
    world.state = 'gameover';
    world.endTimer = 0.7;
  } else {
    world = seedWorld(seed, 0);
    world.state = 'title';
  }

  // Draw the frozen frame once, at the full logical viewport.
  ctx.save();
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  drawWorld(ctx, world);
  ctx.restore();
  window.__shotReady = true;
  return world;
}
