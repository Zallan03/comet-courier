// main.js — bootstrap and game loop for Comet Courier.
//
// Sets up the canvas at a fixed 1280x720 logical viewport, wires input
// and audio, and runs a fixed 60 Hz simulation step. With ?shot= in the
// URL it draws one deterministic screenshot scene instead (see shots.js).

import { VIEW } from './config.js';
import { createInput } from './input.js';
import { createWorld } from './world.js';
import { drawWorld } from './render.js';
import { createAudio } from './audio.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = params.get('seed');
const seed = seedParam ? parseInt(seedParam, 10) || 0 : 20261118;

// Fit the 1280x720 canvas into the window, keeping its aspect ratio and
// rendering crisply on high-DPI screens.
function fitCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = VIEW.width * dpr;
  canvas.height = VIEW.height * dpr;
  const scale = Math.min(
    window.innerWidth / VIEW.width,
    window.innerHeight / VIEW.height,
  );
  canvas.style.width = `${Math.floor(VIEW.width * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW.height * scale)}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener('resize', fitCanvas);
fitCanvas();

if (shot) {
  // Deterministic screenshot mode: draw one frozen scene, then keep
  // repainting that same scene every frame. Headless Chrome fires late
  // viewport resizes after load, and a resize resets the canvas backing
  // store — a single draw would be wiped out before the screenshot.
  const world = applyShot(ctx, shot, seed);
  window.addEventListener('resize', () => {
    fitCanvas();
    drawWorld(ctx, world);
  });
  const repaint = () => {
    drawWorld(ctx, world);
    window.requestAnimationFrame(repaint);
  };
  window.requestAnimationFrame(repaint);
} else {
  const input = createInput(canvas);
  const audio = createAudio();
  let world = createWorld((Date.now() % 2147483647) >>> 0);
  window.__world = world;

  function launch() {
    audio.ensure();
    audio.startPad();
    audio.launch();
    world.startGame((Date.now() % 2147483647) >>> 0);
  }

  function togglePause() {
    if (world.state === 'playing') {
      world.state = 'paused';
    } else if (world.state === 'paused') {
      world.state = 'playing';
    }
  }

  // Hiding the tab mid-run pauses instead of letting asteroids eat the ship.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && world.state === 'playing') {
      world.state = 'paused';
    }
  });

  const STEP = 1 / 60;
  let acc = 0;
  let last = performance.now();

  function frame(now) {
    const elapsed = Math.min(0.25, (now - last) / 1000);
    last = now;
    acc += elapsed;

    // Menu keys, handled once per animation frame.
    if (input.wasPressed('KeyM')) audio.toggleMute();
    if (world.state === 'title') {
      if (
        input.wasPressed('Enter') ||
        input.wasPressed('Space') ||
        input.pointer.justDown
      ) {
        launch();
      }
    } else if (world.state === 'playing') {
      if (input.wasPressed('KeyP') || input.wasPressed('Escape')) togglePause();
    } else if (world.state === 'paused') {
      if (input.wasPressed('KeyP') || input.wasPressed('Escape')) togglePause();
    } else if (world.state === 'gameover') {
      if (input.wasPressed('KeyR') || input.wasPressed('Enter') || input.pointer.justDown) {
        launch();
      }
    }

    let guard = 0;
    while (acc >= STEP && guard < 5) {
      world.update(STEP, input, audio);
      acc -= STEP;
      guard += 1;
    }
    if (guard >= 5) acc = 0;

    drawWorld(ctx, world);
    input.endFrame();
    window.requestAnimationFrame(frame);
  }

  window.requestAnimationFrame(frame);
}
