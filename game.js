const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const keys = {};
const pressed = {};

const input = {
  left: false,
  right: false,
  jump: false,
  dash: false,
};

const world = {
  width: 3000,
  height: 540,
  gravity: 1600,
};

const player = {
  x: 110,
  y: 280,
  w: 24,
  h: 42,
  vx: 0,
  vy: 0,
  speed: 270,
  jumpForce: 620,
  onGround: false,
  facing: 1,
  canDash: true,
  dashTime: 0,
  dashCooldown: 0,
  trail: [],
};

const platforms = [
  { x: 0, y: 480, w: 390, h: 60 },
  { x: 430, y: 440, w: 170, h: 20 },
  { x: 640, y: 390, w: 160, h: 20 },
  { x: 860, y: 355, w: 170, h: 20 },
  { x: 1100, y: 430, w: 200, h: 20 },
  { x: 1380, y: 365, w: 180, h: 20 },
  { x: 1650, y: 315, w: 160, h: 20 },
  { x: 1860, y: 250, w: 140, h: 20 },
  { x: 2050, y: 310, w: 180, h: 20 },
  { x: 2300, y: 420, w: 240, h: 20 },
  { x: 2570, y: 360, w: 200, h: 20 },
  { x: 2690, y: 280, w: 180, h: 20 },
];

const stars = [
  { x: 160, y: 100, r: 2 },
  { x: 420, y: 160, r: 3 },
  { x: 700, y: 110, r: 2 },
  { x: 950, y: 150, r: 3 },
  { x: 1290, y: 90, r: 2 },
  { x: 1580, y: 200, r: 3 },
  { x: 1920, y: 110, r: 2 },
  { x: 2240, y: 140, r: 3 },
  { x: 2580, y: 90, r: 2 },
  { x: 2860, y: 170, r: 3 },
];

const gems = [
  { x: 590, y: 370, r: 10, collected: false },
  { x: 930, y: 300, r: 10, collected: false },
  { x: 1450, y: 310, r: 10, collected: false },
  { x: 1920, y: 205, r: 10, collected: false },
  { x: 2760, y: 225, r: 10, collected: false },
];

const portal = {
  x: 2925,
  y: 200,
  w: 42,
  h: 80,
  active: false,
};

const camera = { x: 0 };

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rectOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function keyPressed(e) {
  keys[e.key.toLowerCase()] = true;
  if (!pressed[e.key.toLowerCase()]) {
    pressed[e.key.toLowerCase()] = true;
  }
}

function keyReleased(e) {
  keys[e.key.toLowerCase()] = false;
  delete pressed[e.key.toLowerCase()];
}

window.addEventListener('keydown', (e) => {
  keyPressed(e);
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    input.jump = true;
    e.preventDefault();
  }

  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
    input.dash = true;
    e.preventDefault();
  }

  if (e.key.toLowerCase() === 'r') {
    resetGame();
  }
});

window.addEventListener('keyup', (e) => {
  keyReleased(e);
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    input.jump = false;
  }
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
    input.dash = false;
  }
});

function tryJump() {
  if (player.onGround) {
    player.vy = -player.jumpForce;
    player.onGround = false;
  }
}

function tryDash() {
  if (player.canDash && player.dashCooldown <= 0) {
    player.dashCooldown = 0.7;
    player.canDash = false;
    player.vx = player.facing * 585;
    player.vy = 0;
    player.trail.length = 0;
  }
}

function updatePlayer(dt) {
  const left = keys.a || keys.arrowleft;
  const right = keys.d || keys.arrowright;

  if (left && !right) {
    player.vx -= 1300 * dt;
    player.facing = -1;
  } else if (right && !left) {
    player.vx += 1300 * dt;
    player.facing = 1;
  } else {
    const drag = player.onGround ? 1700 : 600;
    if (Math.abs(player.vx) < drag * dt) {
      player.vx = 0;
    } else {
      player.vx -= Math.sign(player.vx) * drag * dt;
    }
  }

  player.vx = clamp(player.vx, -player.speed, player.speed);

  if (pressed['w'] || pressed['arrowup']) {
    tryJump();
  }

  if (input.dash && !pressed['shift']) {
    tryDash();
  }

  if (player.dashCooldown > 0) {
    player.dashCooldown -= dt;
  }

  if (player.onGround) {
    player.canDash = true;
  }

  player.vy += world.gravity * dt;
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  player.onGround = false;

  for (const p of platforms) {
    const prevY = player.y - player.vy * dt;
    const prevX = player.x - player.vx * dt;

    const nextX = player.x + player.w;
    const nextY = player.y + player.h;
    const px2 = p.x + p.w;
    const py2 = p.y + p.h;

    if (
      player.x < px2 && nextX > p.x &&
      prevY + player.h <= p.y + 12 && player.y + player.h >= p.y &&
      player.vy >= 0
    ) {
      player.y = p.y - player.h;
      player.vy = 0;
      player.onGround = true;
    }

    if (player.y < py2 && nextY > p.y && prevX + player.w <= p.x + 12 && player.x + player.w >= p.x && player.vx > 0) {
      player.x = p.x - player.w;
      player.vx = 0;
    }

    if (player.y < py2 && nextY > p.y && player.x <= px2 && prevX >= p.x - 12 && player.x <= p.x + p.w && player.vx < 0) {
      player.x = p.x + p.w;
      player.vx = 0;
    }
  }

  player.x = clamp(player.x, 0, world.width - player.w);
  player.y = clamp(player.y, 0, world.height + 200);

  if (player.y > HEIGHT + 80) {
    resetGame();
  }

  player.trail.push({ x: player.x + player.w * 0.5, y: player.y + player.h * 0.5, life: 0.32 });
  player.trail = player.trail.filter((p) => {
    p.life -= dt;
    return p.life > 0;
  });

  if (player.x + player.w > portal.x && player.x < portal.x + portal.w && player.y + player.h > portal.y && player.y < portal.y + portal.h) {
    if (gems.every((gem) => gem.collected)) {
      portal.active = true;
    }
  }

  if (portal.active && player.x + player.w > portal.x && player.x < portal.x + portal.w && player.y + player.h > portal.y && player.y < portal.y + portal.h) {
    window.alert('Você alcançou a órbita. Mundo fundido com sucesso!');
    resetGame();
  }

  for (const gem of gems) {
    if (!gem.collected) {
      const dx = player.x + player.w / 2 - gem.x;
      const dy = player.y + player.h / 2 - gem.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 28) {
        gem.collected = true;
      }
    }
  }

  if (keys['r']) {
    resetGame();
  }

  input.dash = false;
  pressed['shift'] = false;
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, '#070d16');
  sky.addColorStop(0.35, '#102235');
  sky.addColorStop(1, '#0a0d22');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    const offsetX = (s.x - camera.x * (0.2 + i * 0.02)) % (WIDTH + 200);
    const px = offsetX < 0 ? offsetX + WIDTH + 200 : offsetX;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.85)' : 'rgba(125,228,255,0.9)';
    ctx.beginPath();
    ctx.arc(px, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(123, 118, 255, 0.12)';
  ctx.fillRect(0, 150, WIDTH, 1);

  ctx.fillStyle = 'rgba(160, 210, 255, 0.08)';
  for (let i = 0; i < 5; i++) {
    const y = 120 + i * 70;
    ctx.fillRect(0, y, WIDTH, 1);
  }
}

function drawWorld() {
  ctx.save();
  ctx.translate(-camera.x, 0);

  for (const p of platforms) {
    ctx.fillStyle = 'rgba(142, 176, 255, 0.3)';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = 'rgba(180, 225, 255, 0.8)';
    ctx.strokeRect(p.x, p.y, p.w, p.h);
  }

  for (const gem of gems) {
    if (gem.collected) continue;
    ctx.save();
    ctx.translate(gem.x, gem.y);
    ctx.rotate(performance.now() / 400 + gem.x * 0.01);
    ctx.fillStyle = '#f2d6ff';
    ctx.beginPath();
    ctx.moveTo(0, -gem.r * 1.3);
    ctx.lineTo(gem.r * 0.7, 0);
    ctx.lineTo(0, gem.r * 1.3);
    ctx.lineTo(-gem.r * 0.7, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = portal.active ? '#8cffd2' : '#d2d8ff';
  ctx.fillRect(portal.x, portal.y, portal.w, portal.h);
  ctx.strokeStyle = portal.active ? '#d0fff1' : '#f9fbff';
  ctx.strokeRect(portal.x, portal.y, portal.w, portal.h);

  ctx.restore();
}

function drawPlayer() {
  const px = player.x;
  const py = player.y;

  for (let i = 0; i < player.trail.length; i++) {
    const t = player.trail[i];
    const alpha = Math.max(0, t.life * 2.5);
    ctx.fillStyle = `rgba(125, 228, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(t.x - camera.x, t.y, 7 - i * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#f6f8ff';
  ctx.fillRect(px - camera.x, py, player.w, player.h);
  ctx.fillStyle = '#7de4ff';
  ctx.fillRect(px - camera.x + 4, py + 8, 6, 6);
  ctx.fillRect(px - camera.x + player.w - 10, py + 8, 6, 6);

  ctx.strokeStyle = '#b4c9ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px - camera.x + 8, py + 32);
  ctx.lineTo(px - camera.x + player.w - 8, py + 32);
  ctx.stroke();
}

function drawHudText() {
  const remaining = gems.filter((gem) => !gem.collected).length;
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`Fragmentos: ${remaining}/5`, 20, 46);

  if (!portal.active) {
    ctx.fillStyle = 'rgba(160, 195, 255, 0.9)';
    ctx.font = '14px sans-serif';
    ctx.fillText('Reúna os fragmentos para abrir a porta.', 20, 72);
  }
}

function updateCamera() {
  camera.x = clamp(player.x - WIDTH * 0.35, 0, world.width - WIDTH);
}

function resetGame() {
  player.x = 110;
  player.y = 280;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.canDash = true;
  player.dashCooldown = 0;
  player.trail = [];
  for (const gem of gems) gem.collected = false;
  portal.active = false;
  camera.x = 0;
}

let lastTime = 0;

function gameLoop(timestamp) {
  const dt = Math.min(0.033, (timestamp - lastTime) / 1000 || 0.016);
  lastTime = timestamp;

  updatePlayer(dt);
  updateCamera();

  drawBackground();
  drawWorld();
  drawPlayer();
  drawHudText();

  requestAnimationFrame(gameLoop);
}

resetGame();
requestAnimationFrame(gameLoop);
