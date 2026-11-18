// config.js — every tuning knob for Comet Courier lives here.
// Change a number here and the whole game retunes: no magic numbers
// scattered through the world or the renderer.

export const VIEW = { width: 1280, height: 720 };

export const COLORS = {
  background: '#050914',
  backgroundEdge: '#02040a',
  star: '#cfe8ff',
  ship: '#35e0ff',
  shipCore: '#eafcff',
  flame: '#ffb02e',
  asteroid: '#8a7a68',
  asteroidDark: '#5d5347',
  amber: '#ffb02e',
  magenta: '#ff4fd8',
  green: '#3dff9e',
  text: '#eaf2ff',
  textDim: '#8fa3c8',
  panel: 'rgba(10, 18, 38, 0.72)',
  panelEdge: 'rgba(120, 170, 255, 0.35)',
  danger: '#ff5d5d',
  gold: '#ffd94d',
};

export const POD_COLORS = ['amber', 'magenta', 'green'];

export const POD_HEX = {
  amber: COLORS.amber,
  magenta: COLORS.magenta,
  green: COLORS.green,
};

export const POD_LABEL = {
  amber: 'AMBER',
  magenta: 'MAGENTA',
  green: 'GREEN',
};

// Docks sit at fixed berths: one per cargo colour.
export const DOCKS = [
  { color: 'amber', x: 96, y: 360 },
  { color: 'magenta', x: 1184, y: 118 },
  { color: 'green', x: 1184, y: 602 },
];

export const SHIP = {
  radius: 16,
  accel: 620,
  maxSpeed: 450,
  drag: 1.15,
  pointerAccel: 780,
};

// Cargo pods: the glowing orbs the courier collects.
export const POD = {
  radius: 13,
  glowRadius: 34,
};

export const GAME = {
  hull: 3,
  comboWindow: 8, // seconds to chain the next delivery
  comboMax: 3,
  baseScore: 100,
  waveBonus: 250,
  podsOnField: 3,
  invulnSeconds: 2,
  pickupRadius: 32,
  dockRadius: 54,
  bannerSeconds: 2.6,
};

export function quotaForWave(wave) {
  return 3 + wave;
}

export function asteroidCountForWave(wave) {
  return 2 + wave;
}

export function asteroidSpeedForWave(wave) {
  return 52 + wave * 13;
}

export function asteroidRadiusForWave(wave) {
  // Later waves throw slightly bigger rocks, capped so the field stays fair.
  return 22 + Math.min(wave, 6) * 2;
}
