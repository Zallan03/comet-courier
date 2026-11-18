// render.js — every pixel of Comet Courier is drawn here in canvas code:
// the starfield and nebulae, the docks, pods, asteroids and courier ship,
// the particles, the HUD, and the title / wave / pause / game-over screens.
// No images, no fonts loaded from anywhere: only code and system fonts.

import { VIEW, COLORS, POD, POD_HEX, POD_LABEL, DOCKS, GAME } from './config.js';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

function padScore(n) {
  return String(Math.max(0, Math.floor(n))).padStart(6, '0');
}

function drawBackground(ctx, world) {
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  grad.addColorStop(0, COLORS.background);
  grad.addColorStop(1, COLORS.backgroundEdge);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  for (const blob of world.nebula) {
    const g = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.r);
    g.addColorStop(0, blob.color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = g;
    ctx.fillRect(blob.x - blob.r, blob.y - blob.r, blob.r * 2, blob.r * 2);
  }
  ctx.globalAlpha = 1;

  for (const star of world.stars) {
    const tw = 0.55 + 0.45 * Math.sin(world.time * star.speed + star.phase);
    ctx.globalAlpha = tw;
    ctx.fillStyle = COLORS.star;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // A soft vignette pulls the eye toward the playfield.
  const vig = ctx.createRadialGradient(
    VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.45,
    VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.95,
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

function drawDock(ctx, world, dock) {
  const hex = POD_HEX[dock.color];
  const isTarget = world.carrying && world.carrying.color === dock.color;
  const pulse = 0.6 + 0.4 * Math.sin(world.time * 3 + dock.x);
  ctx.save();
  ctx.translate(dock.x, dock.y);
  if (isTarget) {
    ctx.globalAlpha = 0.25 + 0.2 * pulse;
    ctx.strokeStyle = hex;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 58 + 6 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 62);
  glow.addColorStop(0, hex);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = isTarget ? 0.55 : 0.3;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 62, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // Hexagonal berth.
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const px = Math.cos(a) * 46;
    const py = Math.sin(a) * 46;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(8, 14, 30, 0.9)';
  ctx.fill();
  ctx.strokeStyle = hex;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fillStyle = hex;
  ctx.fill();
  ctx.fillStyle = hex;
  ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(POD_LABEL[dock.color], 0, 56);
  if (isTarget) {
    ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('◄ DELIVER HERE', 0, -78);
  }
  ctx.restore();
}

function drawPod(ctx, world, pod) {
  const hex = POD_HEX[pod.color];
  const bobY = Math.sin(pod.bob) * 4;
  const r = POD.radius * pod.pulse;
  ctx.save();
  ctx.translate(pod.x, pod.y + bobY);
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, POD.glowRadius);
  glow.addColorStop(0, hex);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.65;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, POD.glowRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = hex;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-4, -4, 4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fill();
  ctx.restore();
}

function drawAsteroid(ctx, world, ast) {
  ctx.save();
  ctx.translate(ast.x, ast.y);
  ctx.rotate(ast.rot);
  ctx.beginPath();
  for (let i = 0; i < ast.verts.length; i++) {
    const a = (Math.PI * 2 * i) / ast.verts.length;
    const r = ast.r * ast.verts[i];
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = COLORS.asteroid;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = COLORS.asteroidDark;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-ast.r * 0.25, -ast.r * 0.2, ast.r * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(ast.r * 0.3, ast.r * 0.28, ast.r * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawShip(ctx, world) {
  const ship = world.ship;
  if (world.state === 'gameover') return;
  ctx.save();
  ctx.translate(ship.x, ship.y);
  const blink = ship.invuln > 0 && Math.floor(world.time * 12) % 2 === 0;
  if (blink) ctx.globalAlpha = 0.35;
  // Engine flame.
  if (ship.thrusting) {
    const flick = 14 + world.rng.range(0, 10);
    ctx.beginPath();
    ctx.moveTo(-14, 8);
    ctx.lineTo(-14 - flick, 0);
    ctx.lineTo(-14, -8);
    ctx.closePath();
    ctx.fillStyle = COLORS.flame;
    ctx.fill();
  }
  ctx.rotate(ship.angle);
  // Hull: a sleek courier dart.
  ctx.beginPath();
  ctx.moveTo(22, 0);
  ctx.lineTo(-12, 12);
  ctx.lineTo(-7, 0);
  ctx.lineTo(-12, -12);
  ctx.closePath();
  const body = ctx.createLinearGradient(-12, 0, 22, 0);
  body.addColorStop(0, '#0e7d99');
  body.addColorStop(1, COLORS.ship);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = COLORS.shipCore;
  ctx.stroke();
  // Cockpit.
  ctx.beginPath();
  ctx.arc(6, 0, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();

  // Shield ring while invulnerable.
  if (ship.invuln > 0) {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = COLORS.ship;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Carried cargo rides behind the ship.
  if (world.carrying) {
    const hex = POD_HEX[world.carrying.color];
    const bx = ship.x - Math.cos(ship.angle) * 30;
    const by = ship.y - Math.sin(ship.angle) * 30;
    ctx.save();
    ctx.translate(bx, by);
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = hex;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fillStyle = hex;
    ctx.fill();
    ctx.restore();
    // Guide arrow toward the matching dock.
    const dock = world.targetDock();
    if (dock) {
      const dx = dock.x - ship.x;
      const dy = dock.y - ship.y;
      const d = Math.hypot(dx, dy) || 1;
      const ax = ship.x + (dx / d) * 44;
      const ay = ship.y + (dy / d) * 44;
      const ang = Math.atan2(dy, dx);
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(ang);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = hex;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-6, 7);
      ctx.lineTo(-6, -7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}

function drawParticles(ctx, world) {
  for (const p of world.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFloaters(ctx, world) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const f of world.floaters) {
    ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
    ctx.font = `bold ${f.size}px "Segoe UI", system-ui, sans-serif`;
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

function drawHud(ctx, world) {
  ctx.textBaseline = 'middle';
  // Left: score and best.
  ctx.fillStyle = COLORS.panel;
  rr(ctx, 16, 12, 250, 64, 10);
  ctx.fill();
  ctx.strokeStyle = COLORS.panelEdge;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.textDim;
  ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('SCORE', 30, 28);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 26px "Courier New", monospace';
  ctx.fillText(padScore(world.score), 30, 54);
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.textDim;
  ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('BEST', 252, 28);
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 16px "Courier New", monospace';
  ctx.fillText(padScore(Math.max(world.best, world.score)), 252, 52);

  // Centre: wave and delivery quota.
  ctx.fillStyle = COLORS.panel;
  rr(ctx, 500, 12, 280, 64, 10);
  ctx.fill();
  ctx.strokeStyle = COLORS.panelEdge;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.textDim;
  ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('WAVE', 568, 28);
  ctx.fillText('DELIVERED', 712, 28);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(String(world.wave), 568, 54);
  ctx.font = 'bold 22px "Courier New", monospace';
  ctx.fillText(`${world.delivered}/${world.quota}`, 712, 54);

  // Right: hull and combo.
  ctx.fillStyle = COLORS.panel;
  rr(ctx, 1014, 12, 250, 64, 10);
  ctx.fill();
  ctx.strokeStyle = COLORS.panelEdge;
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.textDim;
  ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('HULL', 1028, 28);
  for (let i = 0; i < GAME.hull; i++) {
    const x = 1032 + i * 26;
    ctx.save();
    ctx.translate(x, 52);
    ctx.beginPath();
    ctx.moveTo(0, 7);
    ctx.bezierCurveTo(-9, -2, -5, -9, 0, -4);
    ctx.bezierCurveTo(5, -9, 9, -2, 0, 7);
    ctx.closePath();
    ctx.fillStyle = i < world.hull ? COLORS.danger : 'rgba(255,255,255,0.14)';
    ctx.fill();
    ctx.restore();
  }
  ctx.textAlign = 'right';
  ctx.fillStyle = world.combo > 1 ? COLORS.gold : COLORS.textDim;
  ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('COMBO', 1250, 28);
  ctx.fillStyle = world.combo > 1 ? COLORS.gold : COLORS.text;
  ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`x${world.combo}`, 1250, 54);
  if (world.comboTimer > 0) {
    const w = 64 * (world.comboTimer / GAME.comboWindow);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(1186, 66, 64, 4);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(1186, 66, w, 4);
  }

  // Carrying banner, bottom centre.
  if (world.carrying) {
    const hex = POD_HEX[world.carrying.color];
    ctx.fillStyle = COLORS.panel;
    rr(ctx, 500, 668, 280, 40, 10);
    ctx.fill();
    ctx.strokeStyle = hex;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = hex;
    ctx.font = 'bold 16px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`CARRYING ${POD_LABEL[world.carrying.color]}  →  ${POD_LABEL[world.carrying.color]} DOCK`, 640, 689);
  }

  // Wrong-dock flash.
  if (world.flash && world.flashTimer > 0) {
    ctx.globalAlpha = Math.min(1, world.flashTimer);
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.danger;
    ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(world.flash, VIEW.width / 2, 110);
    ctx.globalAlpha = 1;
  }
}

function dim(ctx, alpha) {
  ctx.fillStyle = `rgba(2, 4, 12, ${alpha})`;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

function drawTitle(ctx, world) {
  dim(ctx, 0.45);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.ship;
  ctx.font = 'bold 84px "Segoe UI", system-ui, sans-serif';
  ctx.shadowColor = COLORS.ship;
  ctx.shadowBlur = 26;
  ctx.fillText('COMET COURIER', VIEW.width / 2, 190);
  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.text;
  ctx.font = '20px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Deep-space delivery — grab the glowing cargo, race it to the dock that matches.', VIEW.width / 2, 258);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '16px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Chain quick deliveries to build your combo up to x3. Three asteroid hits ends the run.', VIEW.width / 2, 288);

  const pulse = 0.65 + 0.35 * Math.sin(world.time * 4);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 26px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('PRESS ENTER OR TAP TO LAUNCH', VIEW.width / 2, 372);
  ctx.globalAlpha = 1;

  ctx.fillStyle = COLORS.textDim;
  ctx.font = '15px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('WASD / ARROWS — thrust      MOUSE / TOUCH — hold to steer toward the pointer', VIEW.width / 2, 440);
  ctx.fillText('P — pause      M — mute      R — restart after game over', VIEW.width / 2, 468);
  if (world.best > 0) {
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.fillText(`BEST SCORE  ${padScore(world.best)}`, VIEW.width / 2, 520);
  }
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('A new run clears wave after wave — each wave adds cargo and faster asteroids.', VIEW.width / 2, 570);
}

function drawWaveBanner(ctx, world) {
  dim(ctx, 0.25);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 52px "Segoe UI", system-ui, sans-serif';
  ctx.shadowColor = COLORS.gold;
  ctx.shadowBlur = 18;
  ctx.fillText(`WAVE ${world.wave} CLEARED`, VIEW.width / 2, 300);
  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.text;
  ctx.font = '22px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`Wave bonus +${GAME.waveBonus * world.wave}   •   Wave ${world.wave + 1} incoming`, VIEW.width / 2, 356);
}

function drawPause(ctx) {
  dim(ctx, 0.55);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 56px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('PAUSED', VIEW.width / 2, 330);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '18px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Press P or Esc to resume', VIEW.width / 2, 386);
}

function drawGameOver(ctx, world) {
  dim(ctx, 0.55);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const slide = Math.min(1, world.endTimer * 2);
  ctx.globalAlpha = slide;
  ctx.fillStyle = COLORS.danger;
  ctx.font = 'bold 64px "Segoe UI", system-ui, sans-serif';
  ctx.shadowColor = COLORS.danger;
  ctx.shadowBlur = 20;
  ctx.fillText('ROUTE TERMINATED', VIEW.width / 2, 220);
  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.text;
  ctx.font = '20px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Your hull gave out among the asteroids.', VIEW.width / 2, 282);
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 30px "Courier New", monospace';
  ctx.fillText(`FINAL SCORE  ${padScore(world.score)}`, VIEW.width / 2, 348);
  ctx.fillStyle = COLORS.text;
  ctx.font = '20px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`Best  ${padScore(world.best)}      Waves cleared  ${world.wave - 1}      Deliveries  ${world.delivered}`, VIEW.width / 2, 398);
  const pulse = 0.65 + 0.35 * Math.sin(world.time * 4);
  ctx.globalAlpha = pulse * slide;
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 24px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('PRESS R OR TAP TO FLY AGAIN', VIEW.width / 2, 470);
  ctx.globalAlpha = 1;
}

export function drawWorld(ctx, world) {
  ctx.save();
  if (world.shake > 0) {
    const sx = (world.rng.next() - 0.5) * world.shake;
    const sy = (world.rng.next() - 0.5) * world.shake;
    ctx.translate(sx, sy);
  }
  drawBackground(ctx, world);
  for (const dock of DOCKS) drawDock(ctx, world, dock);
  for (const pod of world.pods) drawPod(ctx, world, pod);
  for (const ast of world.asteroids) drawAsteroid(ctx, world, ast);
  // On the title screen the ship spawns at (640, 360), directly under the
  // "PRESS ENTER" line — hide it there so it never sits on top of the text.
  if (world.state !== 'title') drawShip(ctx, world);
  drawParticles(ctx, world);
  drawFloaters(ctx, world);
  ctx.restore();

  if (world.state === 'playing' || world.state === 'waveclear' || world.state === 'paused') {
    drawHud(ctx, world);
  }
  if (world.state === 'title') drawTitle(ctx, world);
  else if (world.state === 'waveclear') drawWaveBanner(ctx, world);
  else if (world.state === 'paused') drawPause(ctx);
  else if (world.state === 'gameover') drawGameOver(ctx, world);
}
