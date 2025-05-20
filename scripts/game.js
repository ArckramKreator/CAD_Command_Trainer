const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// World state
let offsetX = 0;
let offsetY = 0;
let scale = 1;

let isDragging = false;
let lastX = 0;
let lastY = 0;

const targets = [];

const MIN_SCALE = 0.05; // Minimum zoom out (5%)
const MAX_SCALE = 4;   // Maximum zoom in (400%)


// Utility: world <-> screen
function worldToScreen(x, y) {
  return {
    x: (x - offsetX) * scale,
    y: (y - offsetY) * scale,
  };
}

function screenToWorld(x, y) {
  return {
    x: x / scale + offsetX,
    y: y / scale + offsetY,
  };
}

// Draw grid and targets
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw grid
  ctx.save();
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1;
  const gridSize = 100;
  const startX = Math.floor(offsetX / gridSize) * gridSize;
  const startY = Math.floor(offsetY / gridSize) * gridSize;
  for (
    let x = startX;
    x < offsetX + canvas.width / scale + gridSize;
    x += gridSize
  ) {
    const sx = worldToScreen(x, 0).x;
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, canvas.height);
    ctx.stroke();
  }
  for (
    let y = startY;
    y < offsetY + canvas.height / scale + gridSize;
    y += gridSize
  ) {
    const sy = worldToScreen(0, y).y;
    ctx.beginPath();
    ctx.moveTo(0, sy);
    ctx.lineTo(canvas.width, sy);
    ctx.stroke();
  }
  ctx.restore();

  // Draw targets
  for (const target of targets) {
    const { x, y } = worldToScreen(target.x, target.y);
    ctx.beginPath();
    ctx.arc(x, y, 15 * scale, 0, 2 * Math.PI);
    ctx.fillStyle = 'red';
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.stroke();
  }
}

// Mouse events for panning
canvas.addEventListener('mousedown', (e) => {
  isDragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
});

window.addEventListener('mousemove', (e) => {
  if (isDragging) {
    const dx = (e.clientX - lastX) / scale;
    const dy = (e.clientY - lastY) / scale;
    offsetX -= dx;
    offsetY -= dy;
    lastX = e.clientX;
    lastY = e.clientY;
    draw();
  }
});

window.addEventListener('mouseup', () => {
  isDragging = false;
});

// Zoom with mouse wheel
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const mouse = screenToWorld(e.offsetX, e.offsetY);
  const zoom = e.deltaY < 0 ? 1.1 : 0.9;
  scale *= zoom;

  // Clamp the scale
  scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));

  // Keep zoom centered on mouse
  offsetX = mouse.x - (e.offsetX / scale);
  offsetY = mouse.y - (e.offsetY / scale);

  draw();
});

// Double-click to spawn a target
canvas.addEventListener('dblclick', (e) => {
  const { x, y } = screenToWorld(e.offsetX, e.offsetY);
  targets.push({ x, y });
  draw();
});

// Handle window resize
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  draw();
});

// Initial setup
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
draw();
