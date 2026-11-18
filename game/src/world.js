// world.js — the simulation of Comet Courier: the courier ship, the
// glowing cargo pods, the colour-matched docks, the drifting asteroids,
// the waves, the combo scoring, the particles and the floating text.
// Rendering lives in render.js; this file only moves numbers around.

import {
  VIEW,
  COLORS,
  POD_COLORS,
  POD_HEX,
  POD_LABEL,
  DOCKS,
  SHIP,
  GAME,
  quotaForWave,
  asteroidCountForWave,
  asteroidSpeedForWave,
  asteroidRadiusForWave,
} from './config.js';
import { makeRng } from './random.js';

function loadBest() {
  try {
    return parseInt(window.localStorage.getItem('comet-courier-best') || '0', 10) || 0;
  } catch (err) {
    return 0;
  }
}

function saveBest(best) {
  try {
    window.localStorage.setItem('comet-courier-best', String(best));
  } catch (err) {
    // Best score is a nicety; the game plays on without storage.
  }
}

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function makeStars(rng) {
  const stars = [];
  for (let i = 0; i < 170; i++) {
    stars.push({
      x: rng.range(0, VIEW.width),
      y: rng.range(0, VIEW.height),
      r: rng.range(0.6, 2.2),
      phase: rng.range(0, Math.PI * 2),
      speed: rng.range(0.4, 1.6),
    });
  }
  return stars;
}

function makeNebula(rng) {
  const blobs = [];
  const hues = ['#1b2a6b', '#3d1b5e', '#0e3a4a', '#4a1b2e'];
  for (let i = 0; i < 6; i++) {
    blobs.push({
      x: rng.range(0, VIEW.width),
      y: rng.range(0, VIEW.height),
      r: rng.range(160, 340),
      color: hues[i % hues.length],
    });
  }
  return blobs;
}

function spawnPodPosition(world) {
  for (let tries = 0; tries < 24; tries++) {
    const x = world.rng.range(90, VIEW.width - 90);
    const y = world.rng.range(90, VIEW.height - 90);
    if (dist(x, y, world.ship.x, world.ship.y) < 150) continue;
    let nearDock = false;
    for (const dock of DOCKS) {
      if (dist(x, y, dock.x, dock.y) < 130) nearDock = true;
    }
    if (nearDock) continue;
    return { x, y };
  }
  return { x: world.rng.range(200, VIEW.width - 200), y: world.rng.range(150, VIEW.height - 150) };
}

function spawnPod(world) {
  const pos = spawnPodPosition(world);
  const color = world.rng.pick(POD_COLORS);
  world.pods.push({
    color,
    x: pos.x,
    y: pos.y,
    bob: world.rng.range(0, Math.PI * 2),
    pulse: world.rng.range(0.8, 1.2),
  });
}

function spawnAsteroid(world, wave) {
  const edge = world.rng.int(0, 3);
  let x;
  let y;
  if (edge === 0) {
    x = world.rng.range(0, VIEW.width);
    y = -50;
  } else if (edge === 1) {
    x = VIEW.width + 50;
    y = world.rng.range(0, VIEW.height);
  } else if (edge === 2) {
    x = world.rng.range(0, VIEW.width);
    y = VIEW.height + 50;
  } else {
    x = -50;
    y = world.rng.range(0, VIEW.height);
  }
  const angle = Math.atan2(VIEW.height / 2 - y, VIEW.width / 2 - x)
    + world.rng.range(-0.7, 0.7);
  const speed = asteroidSpeedForWave(wave) * world.rng.range(0.7, 1.3);
  const verts = [];
  const count = world.rng.int(8, 11);
  for (let i = 0; i < count; i++) {
    verts.push(world.rng.range(0.72, 1.18));
  }
  world.asteroids.push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r: asteroidRadiusForWave(wave) * world.rng.range(0.85, 1.25),
    rot: world.rng.angle(),
    vr: world.rng.range(-0.9, 0.9),
    verts,
  });
}

function burst(world, x, y, color, n, speed) {
  for (let i = 0; i < n; i++) {
    const a = world.rng.angle();
    const s = world.rng.range(speed * 0.25, speed);
    world.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: world.rng.range(0.35, 0.9),
      maxLife: 0.9,
      size: world.rng.range(2, 5),
      color,
    });
  }
}

function floater(world, x, y, text, color, size) {
  world.floaters.push({ x, y, text, color, life: 1.25, maxLife: 1.25, size: size || 22 });
}

function buildWave(world, wave) {
  world.asteroids = [];
  const count = asteroidCountForWave(wave);
  for (let i = 0; i < count; i++) spawnAsteroid(world, wave);
  world.pods = [];
  for (let i = 0; i < GAME.podsOnField; i++) spawnPod(world);
}

// (Re)initializes every data field of a world in place. Methods are
// defined once in createWorld and close over the same object, so reset
// must never swap the object or copy another world's methods in —
// a copied method would keep updating the world it was born in.
function initState(world, seed, best) {
  const rng = makeRng(seed >>> 0);
  world.rng = rng;
  world.seed = seed >>> 0;
  world.time = 0;
  world.state = 'title'; // title | playing | waveclear | paused | gameover
  world.score = 0;
  world.best = typeof best === 'number' ? best : loadBest();
  world.combo = 1;
  world.comboTimer = 0;
  world.wave = 1;
  world.delivered = 0;
  world.quota = quotaForWave(1);
  world.hull = GAME.hull;
  world.shake = 0;
  world.bannerTimer = 0;
  world.endTimer = 0;
  world.flash = null;
  world.flashTimer = 0;
  world.ship = {
    x: VIEW.width / 2,
    y: VIEW.height / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    thrusting: false,
    invuln: 0,
  };
  world.carrying = null;
  world.pods = [];
  world.asteroids = [];
  world.particles = [];
  world.floaters = [];
  world.stars = makeStars(rng);
  world.nebula = makeNebula(rng);
  buildWave(world, 1);
}

export function createWorld(seed, best) {
  const world = {};
  initState(world, seed, best);

  world.reset = (newSeed) => {
    initState(world, newSeed, world.best);
    world.state = 'title';
  };

  world.startGame = (newSeed) => {
    world.reset(newSeed);
    world.state = 'playing';
  };

  world.targetDock = () => {
    if (!world.carrying) return null;
    return DOCKS.find((dock) => dock.color === world.carrying.color) || null;
  };

  world.nextWave = () => {
    world.wave += 1;
    world.delivered = 0;
    world.quota = quotaForWave(world.wave);
    world.combo = 1;
    world.comboTimer = 0;
    buildWave(world, world.wave);
    if (world.carrying) {
      world.pods.push({
        color: world.carrying.color,
        x: Math.min(Math.max(world.ship.x + 60, 90), VIEW.width - 90),
        y: Math.min(Math.max(world.ship.y, 90), VIEW.height - 90),
        bob: 0,
        pulse: 1,
      });
      world.carrying = null;
    }
    world.state = 'playing';
  };

  world.finishGameOver = () => {
    world.state = 'gameover';
    world.endTimer = 0;
    if (world.score > world.best) {
      world.best = world.score;
      saveBest(world.best);
    }
    burst(world, world.ship.x, world.ship.y, COLORS.ship, 46, 320);
    burst(world, world.ship.x, world.ship.y, COLORS.flame, 30, 240);
    burst(world, world.ship.x, world.ship.y, '#ffffff', 18, 180);
    world.shake = 18;
  };

  world.deliverPod = (dock, sfx) => {
    const points = GAME.baseScore * world.combo;
    world.score += points;
    floater(world, dock.x, dock.y - 64, `+${points}`, POD_HEX[dock.color], 26);
    if (world.combo > 1) {
      floater(world, dock.x, dock.y - 34, `COMBO x${world.combo}`, COLORS.gold, 17);
    }
    burst(world, dock.x, dock.y, POD_HEX[dock.color], 26, 260);
    burst(world, dock.x, dock.y, '#ffffff', 10, 160);
    if (sfx) sfx.deliver(world.combo);
    if (world.comboTimer > 0) {
      world.combo = Math.min(world.combo + 1, GAME.comboMax);
    } else {
      world.combo = 1;
    }
    world.comboTimer = GAME.comboWindow;
    world.carrying = null;
    world.delivered += 1;
    spawnPod(world);
    if (world.delivered >= world.quota) {
      const bonus = GAME.waveBonus * world.wave;
      world.score += bonus;
      world.state = 'waveclear';
      world.bannerTimer = GAME.bannerSeconds;
      floater(world, VIEW.width / 2, VIEW.height / 2 - 40, `WAVE BONUS +${bonus}`, COLORS.gold, 30);
      if (sfx) sfx.waveClear();
    }
  };

  world.hitAsteroid = (asteroid, sfx) => {
    world.hull -= 1;
    world.ship.invuln = GAME.invulnSeconds;
    world.shake = 16;
    const kx = world.ship.x - asteroid.x;
    const ky = world.ship.y - asteroid.y;
    const kd = Math.hypot(kx, ky) || 1;
    world.ship.vx += (kx / kd) * 340;
    world.ship.vy += (ky / kd) * 340;
    burst(world, world.ship.x, world.ship.y, COLORS.danger, 26, 280);
    burst(world, world.ship.x, world.ship.y, COLORS.asteroid, 14, 180);
    if (world.carrying) {
      const pos = spawnPodPosition(world);
      world.pods.push({
        color: world.carrying.color,
        x: pos.x,
        y: pos.y,
        bob: 0,
        pulse: 1,
      });
      floater(world, world.ship.x, world.ship.y - 40, 'CARGO LOST', COLORS.danger, 18);
      world.carrying = null;
    }
    if (sfx) sfx.hit();
    if (world.hull <= 0) {
      world.finishGameOver();
      if (sfx) sfx.gameOver();
    }
  };

  world.update = (dt, input, sfx) => {
    world.time += dt;
    if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 26);
    if (world.flashTimer > 0) world.flashTimer -= dt;

    for (let i = world.particles.length - 1; i >= 0; i--) {
      const p = world.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - 1.6 * dt;
      p.vy *= 1 - 1.6 * dt;
      p.life -= dt;
      if (p.life <= 0) world.particles.splice(i, 1);
    }
    for (let i = world.floaters.length - 1; i >= 0; i--) {
      const f = world.floaters[i];
      f.y -= 34 * dt;
      f.life -= dt;
      if (f.life <= 0) world.floaters.splice(i, 1);
    }
    for (const pod of world.pods) pod.bob += dt * 2.2;

    if (world.state === 'waveclear') {
      world.bannerTimer -= dt;
      if (world.bannerTimer <= 0) world.nextWave();
      return;
    }
    if (world.state === 'gameover') {
      world.endTimer += dt;
      return;
    }
    if (world.state !== 'playing') {
      // Title screen: asteroids drift gently behind the menu.
      for (const ast of world.asteroids) {
        ast.x += ast.vx * 0.4 * dt;
        ast.y += ast.vy * 0.4 * dt;
        ast.rot += ast.vr * 0.4 * dt;
        if (ast.x < -80) ast.x = VIEW.width + 70;
        if (ast.x > VIEW.width + 80) ast.x = -70;
        if (ast.y < -80) ast.y = VIEW.height + 70;
        if (ast.y > VIEW.height + 80) ast.y = -70;
      }
      return;
    }

    const ship = world.ship;
    if (ship.invuln > 0) ship.invuln -= dt;
    if (world.comboTimer > 0) {
      world.comboTimer -= dt;
      if (world.comboTimer <= 0) world.combo = 1;
    }

    // Steering: keys first, held pointer second.
    let ax = 0;
    let ay = 0;
    let thrusting = false;
    let steeringByPointer = false;
    if (input) {
      input.readAxes();
      ax = input.axisX;
      ay = input.axisY;
      if (ax !== 0 || ay !== 0) thrusting = true;
      if (!thrusting && input.pointer.down) {
        const dx = input.pointer.x - ship.x;
        const dy = input.pointer.y - ship.y;
        const d = Math.hypot(dx, dy);
        if (d > 12) {
          ax = dx / d;
          ay = dy / d;
          thrusting = true;
          steeringByPointer = true;
        }
      }
    }
    if (thrusting) {
      const accel = steeringByPointer ? SHIP.pointerAccel : SHIP.accel;
      ship.vx += ax * accel * dt;
      ship.vy += ay * accel * dt;
      ship.angle = Math.atan2(ay, ax);
      if (world.rng.chance(0.7)) {
        world.particles.push({
          x: ship.x - Math.cos(ship.angle) * 18,
          y: ship.y - Math.sin(ship.angle) * 18,
          vx: -Math.cos(ship.angle) * 120 + world.rng.range(-30, 30),
          vy: -Math.sin(ship.angle) * 120 + world.rng.range(-30, 30),
          life: 0.28,
          maxLife: 0.28,
          size: world.rng.range(2, 4),
          color: COLORS.flame,
        });
      }
    }
    ship.thrusting = thrusting;
    const damp = Math.exp(-SHIP.drag * dt);
    ship.vx *= damp;
    ship.vy *= damp;
    const speed = Math.hypot(ship.vx, ship.vy);
    if (speed > SHIP.maxSpeed) {
      ship.vx = (ship.vx / speed) * SHIP.maxSpeed;
      ship.vy = (ship.vy / speed) * SHIP.maxSpeed;
    }
    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;
    if (ship.x < 22) { ship.x = 22; ship.vx = Math.abs(ship.vx) * 0.4; }
    if (ship.x > VIEW.width - 22) { ship.x = VIEW.width - 22; ship.vx = -Math.abs(ship.vx) * 0.4; }
    if (ship.y < 22) { ship.y = 22; ship.vy = Math.abs(ship.vy) * 0.4; }
    if (ship.y > VIEW.height - 22) { ship.y = VIEW.height - 22; ship.vy = -Math.abs(ship.vy) * 0.4; }

    for (const ast of world.asteroids) {
      ast.x += ast.vx * dt;
      ast.y += ast.vy * dt;
      ast.rot += ast.vr * dt;
      if (ast.x < -70) ast.x = VIEW.width + 60;
      if (ast.x > VIEW.width + 70) ast.x = -60;
      if (ast.y < -70) ast.y = VIEW.height + 60;
      if (ast.y > VIEW.height + 70) ast.y = -60;
    }

    // Pick up a pod when empty-handed.
    if (!world.carrying) {
      for (let i = world.pods.length - 1; i >= 0; i--) {
        const pod = world.pods[i];
        if (dist(ship.x, ship.y, pod.x, pod.y) < GAME.pickupRadius) {
          world.carrying = pod;
          world.pods.splice(i, 1);
          burst(world, pod.x, pod.y, POD_HEX[pod.color], 14, 160);
          floater(world, pod.x, pod.y - 30, POD_LABEL[pod.color] + ' CARGO', POD_HEX[pod.color], 16);
          if (sfx) sfx.pickup();
          break;
        }
      }
    }

    // Deliver at the matching dock, or bounce off the wrong one.
    if (world.carrying) {
      for (const dock of DOCKS) {
        if (dist(ship.x, ship.y, dock.x, dock.y) < GAME.dockRadius) {
          if (dock.color === world.carrying.color) {
            world.deliverPod(dock, sfx);
          } else if (world.flashTimer <= 0) {
            world.flash = `WRONG DOCK — NEED ${POD_LABEL[world.carrying.color]}`;
            world.flashTimer = 1.4;
            if (sfx) sfx.wrongDock();
            const dx = ship.x - dock.x;
            const dy = ship.y - dock.y;
            const d = Math.hypot(dx, dy) || 1;
            ship.vx += (dx / d) * 260;
            ship.vy += (dy / d) * 260;
          }
          break;
        }
      }
    }

    // Asteroid hits.
    if (ship.invuln <= 0) {
      for (const ast of world.asteroids) {
        if (dist(ship.x, ship.y, ast.x, ast.y) < ast.r + SHIP.radius - 4) {
          world.hitAsteroid(ast, sfx);
          break;
        }
      }
    }
  };

  return world;
}
