const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// World state
let isCanvasActive = false;

let offsetX = 0;
let offsetY = 0;
let scale = 0.5;

let isDragging = false;
let lastX = 0;
let lastY = 0;

let bottomInput = '';
let blinkState = true;

const targets = [];
let commands = [];

const MIN_SCALE = 0.02; // Minimum zoom out (2%)
const MAX_SCALE = 2; // Maximum zoom in (400%)

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

    // Calculate secondary line alpha based on scale
    let secondaryAlpha = 0.5;
    if (scale < 0.2) {
        //fade out from 0.5 to 0.0 at scale 0.2
        const minScale = 0.09;
        const maxScale = 0.2;
        secondaryAlpha = (scale - minScale) / (maxScale - minScale) * 0.5;
        secondaryAlpha = Math.max(0, Math.min(secondaryAlpha, 0.5));
    }
    // Draw grid
    ctx.save();
    ctx.lineWidth = 1;
    const gridSize = 100;
    const startX = Math.floor(offsetX / gridSize) * gridSize;
    const startY = Math.floor(offsetY / gridSize) * gridSize;
    const endX = offsetX + canvas.width / scale + gridSize;
    const endY = offsetY + canvas.height / scale + gridSize;

    // Draw vertical lines
    for (let x = startX; x < endX; x += gridSize) {
        const sx = worldToScreen(x, 0).x;
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, canvas.height);

        // Calculate world index for this line
        const worldIndex = Math.round(x / gridSize);
        if (worldIndex % 5 === 0) {
            ctx.strokeStyle = '#888';
            ctx.globalAlpha = 1.0;
        } else {
            ctx.strokeStyle = '#444';
            ctx.globalAlpha = secondaryAlpha;
        }
        ctx.stroke();
    }

    // Draw horizontal lines
    for (let y = startY; y < endY; y += gridSize) {
        const sy = worldToScreen(0, y).y;
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(canvas.width, sy);
        // Calculate world index for this line
        const worldIndex = Math.round(y / gridSize);
        if (worldIndex % 5 === 0) {
            ctx.strokeStyle = '#888';
            ctx.globalAlpha = 1.0;
        } else {
            ctx.strokeStyle = '#444';
            ctx.globalAlpha = secondaryAlpha;
        }
        ctx.stroke();
    }
    ctx.globalAlpha = 1.0; // Reset alpha for other drawings
    ctx.restore();

    // Draw targets
    for (const target of targets) {
        const {
            x,
            y
        } = worldToScreen(target.x, target.y);
        ctx.beginPath();
        ctx.arc(x, y, 15 * scale, 0, 2 * Math.PI);
        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.stroke();
    }

    // Draw top text box
    const topBoxWidth = 1000;
    const topBoxHeight = 60;
    const topBoxX = (canvas.width - topBoxWidth) / 2;
    const topBoxY = 20;

    ctx.save();

    ctx.fillStyle = '#181830';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(topBoxX, topBoxY, topBoxWidth, topBoxHeight, 10);
    ctx.fill();
    ctx.stroke();

    // Draw top text
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 25px "IBM Plex Mono", "DM Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const topText = commands.length > 0
        //? `${commands[0].command} � ${commands[0].short}: ${commands[0].long}`
        ? `${commands[0].command}`
        : 'No command loaded';

    ctx.fillText(
        topText,
        canvas.width / 2,
        topBoxY + topBoxHeight / 2
    );
    ctx.restore();

    // Draw bottom text box
    const bottomBoxWidth = 800;
    const bottomBoxHeight = 60;
    const bottomBoxX = (canvas.width - bottomBoxWidth) / 2;
    const bottomBoxY = canvas.height - bottomBoxHeight - 20;

    ctx.save();

    ctx.fillStyle = '#181830';
    ctx.strokeStyle = isCanvasActive ? '#4af' : '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bottomBoxX, bottomBoxY, bottomBoxWidth, bottomBoxHeight, 10);
    ctx.fill();
    ctx.stroke();

    // Draw bottom text
    let font = 'bold 20px "IBM Plex Mono", "DM Mono", monospace';
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px "IBM Plex Mono", "DM Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const padding = 16;

    // Compose the text with the cursor always present for measurement
    const displayTextWithCursor = bottomInput + '|';
    const visibleTextWithCursor = getVisibleInputText(ctx, displayTextWithCursor, font, bottomBoxWidth, padding);

    // Now, if the blinker is on, draw as is. If not, draw without the cursor.
    let textToDraw;
    if (isCanvasActive && blinkState) {
        textToDraw = visibleTextWithCursor;
    } else {
        // Remove the cursor only if it's at the end
        if (visibleTextWithCursor.endsWith('|')) {
            textToDraw = visibleTextWithCursor.slice(0, -1);
        } else {
            textToDraw = visibleTextWithCursor;
        }
    }

    ctx.fillText(
        textToDraw,
        bottomBoxX + padding, 
        bottomBoxY + bottomBoxHeight / 2
    );
    ctx.restore();

}

setInterval(() => {
  blinkState = !blinkState;
  if (isCanvasActive) draw();
}, 500); // 500ms = 1 blink per second


window.addEventListener('mousedown', (e) => {
  if (e.target !== canvas) {
    isCanvasActive = false;
    draw();
  }
});

// Utility function to get visible text in the input box
function getVisibleInputText(ctx, text, font, boxWidth, padding) {
  ctx.font = font;
  let visibleText = text;
  let textWidth = ctx.measureText(visibleText).width;
  const maxWidth = boxWidth - 2 * padding;

  // If text fits, return as is
  if (textWidth <= maxWidth) return visibleText;

  // Otherwise, trim from the start until it fits
  let start = 0;
  while (start < text.length) {
    visibleText = text.slice(start);
    textWidth = ctx.measureText(visibleText).width;
    if (textWidth <= maxWidth) break;
    start++;
  }
  return visibleText;
}


// Text imput handling
window.addEventListener('keydown', (e) =>{
    
    if (!isCanvasActive) return;

    // Ignore key events if the user is holding a modifier (Ctrl, Alt, Meta)
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    if (e.key === 'Backspace') {
        bottomInput = bottomInput.slice(0, -1);
        e.preventDefault();
    } else if (e.key.length === 1) {
        // Only add printable characters
        bottomInput += e.key;
    } else if (e.key === 'Enter' || e.key === 'Space') {
        // Optionally, handle enter (e.g., submit or clear)
        e.preventDefault();
        bottomInput = '';
    } else if (e.key === 'Escape') {
        // Handle escape (e.g., clear input)
        bottomInput = '';
    }
    draw();
});

// Mouse events for panning
canvas.addEventListener('mousedown', (e) =>{
    // 1. Activate text input focus
    isCanvasActive = true;
    
    // 2. Handle middle-button panning
    if (e.button == 1){ 
        isDragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        // Prevent default to avoid scrolling the page
        e.preventDefault();
    }

    draw();    
});


window.addEventListener('mousemove', (e) =>{
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

window.addEventListener('mouseup', (e) =>{
    if (e.button !== 1) return; // Only middle mouse button)
    isDragging = false;
});

// Zoom with mouse wheel
canvas.addEventListener('wheel', (e) =>{
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
canvas.addEventListener('dblclick', (e) =>{
    const {
        x,
        y
    } = screenToWorld(e.offsetX, e.offsetY);
    targets.push({
        x,
        y
    });
    draw();
});



// Function to parse a command line from commands.txt
function parseCommandLine(line) {
  // Split only on the first two commas
  const parts = line.split(',');
  if (parts.length < 3) return null;
  // Rejoin in case LONGDescription contains commas
  const [command, shortDesc, ...longDescArr] = parts;
  const longDesc = longDescArr.join(',');
  return {
    command: command.trim(),
    short: shortDesc.trim(),
    long: longDesc.trim()
  };
}

// Load commands from commands.txt
function loadCommands() {
  fetch('commands.txt')
    .then(response => response.text())
    .then(text => {
      commands = text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#')) // skip empty and comment lines
        .map(parseCommandLine)
        .filter(cmd => cmd !== null);
      console.log(commands);
      draw();
    })
    .catch(err => {
      console.error('Failed to load commands.txt:', err);
    });
}


// Prevent context menu on right-click
canvas.addEventListener('contextmenu', (e) =>{
    e.preventDefault();
});

// Handle window resize
window.addEventListener('resize', () =>{
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw();
});

// Initial setup
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
loadCommands();
draw();

