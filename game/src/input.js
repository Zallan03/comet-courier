// input.js — keyboard, mouse and touch for Comet Courier.
//
// One object owns every device: WASD / arrow keys thrust the ship,
// holding the pointer (mouse or finger) steers it toward that point,
// and edge-triggered "pressed" keys drive the menus (Enter to launch,
// P to pause, M to mute, R to fly again).
import { VIEW } from './config.js';

const PREVENT = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
]);

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    pressed: new Set(),
    pointer: { x: VIEW.width / 2, y: VIEW.height / 2, down: false, seen: false, justDown: false },
    axisX: 0,
    axisY: 0,
  };

  function toLogical(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * VIEW.width,
      y: ((clientY - rect.top) / rect.height) * VIEW.height,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (PREVENT.has(event.code)) event.preventDefault();
    if (!event.repeat) input.pressed.add(event.code);
    input.keys.add(event.code);
  });
  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
    input.pointer.down = false;
  });

  canvas.addEventListener('pointerdown', (event) => {
    const p = toLogical(event.clientX, event.clientY);
    input.pointer.x = p.x;
    input.pointer.y = p.y;
    input.pointer.down = true;
    input.pointer.seen = true;
    input.pointer.justDown = true;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    const p = toLogical(event.clientX, event.clientY);
    input.pointer.x = p.x;
    input.pointer.y = p.y;
    input.pointer.seen = true;
  });
  canvas.addEventListener('pointerup', () => {
    input.pointer.down = false;
  });
  canvas.addEventListener('pointercancel', () => {
    input.pointer.down = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  input.down = (code) => input.keys.has(code);

  input.wasPressed = (code) => input.pressed.has(code);

  // -1/0/+1 thrust axes from the keys held this frame.
  input.readAxes = () => {
    let x = 0;
    let y = 0;
    if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) x -= 1;
    if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) x += 1;
    if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) y -= 1;
    if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.SQRT2;
      x *= inv;
      y *= inv;
    }
    input.axisX = x;
    input.axisY = y;
    return input;
  };

  // Edge-triggered keys are consumed once per frame by the game loop.
  input.endFrame = () => {
    input.pressed.clear();
    input.pointer.justDown = false;
  };

  return input;
}
