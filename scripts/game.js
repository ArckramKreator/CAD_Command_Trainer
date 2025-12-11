const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Main Game State Object 
const GameState = {

    viewport: {
        offsetX: 0,
        offsetY: 0,
        scale: 0.5,
        MIN_SCALE: 0.02,
        MAX_SCALE: 2
    },

    mouse: {
        isDragging: false,
        lastX: 0,
        lastY: 0
    },

    input: {
        active: false,
        buffer: '',
        blink: true
    },

    commands: [],

    targets: []
};

// Utility: world <-> screen
function worldToScreen(x, y) {
    return {
        x: (x - GameState.viewport.offsetX) * GameState.viewport.scale,
        y: (y - GameState.viewport.offsetY) * GameState.viewport.scale,
    };
}

function screenToWorld(x, y) {
    return {
        x: x / GameState.viewport.scale + GameState.viewport.offsetX,
        y: y / GameState.viewport.scale + GameState.viewport.offsetY,
    };
}

// Draw grid and targets
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate secondary line alpha based on scale
    let secondaryAlpha = 0.5;

    const minScale = 0.09;
    const maxScale = 0.2;

    if (GameState.viewport.scale < minScale) {
        secondaryAlpha = 0;
    } else if (GameState.viewport.scale > maxScale) {
        secondaryAlpha = 0.5;
    } else {
        const t = (GameState.viewport.scale - minScale) / (maxScale - minScale) ;
        secondaryAlpha = t * 0.5;
    }
    // Draw grid
    ctx.save();
    ctx.lineWidth = 1;
    const gridSize = 100;
    const startX = Math.floor(GameState.viewport.offsetX / gridSize) * gridSize;
    const startY = Math.floor(GameState.viewport.offsetY / gridSize) * gridSize;
    const endX = GameState.viewport.offsetX + canvas.width / GameState.viewport.scale + gridSize;
    const endY = GameState.viewport.offsetY + canvas.height / GameState.viewport.scale + gridSize;

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
    for (const target of GameState.targets) {
        const {
            x,
            y
        } = worldToScreen(target.x, target.y);
        ctx.beginPath();
        ctx.arc(x, y, 15 * GameState.viewport.scale, 0, 2 * Math.PI);
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

    const topText = GameState.commands.length > 0
        //? `${GameState.commands[0].command} � ${GameState.commands[0].short}: ${GameState.commands[0].long}`
        ? `${GameState.commands[0].command}`
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
    ctx.strokeStyle = GameState.input.active ? '#4af' : '#fff';
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
    const displayTextWithCursor = GameState.input.buffer + '|';
    const visibleTextWithCursor = getVisibleInputText(ctx, displayTextWithCursor, font, bottomBoxWidth, padding);

    // Now, if the blinker is on, draw as is. If not, draw without the cursor.
    let textToDraw;
    if (GameState.input.active && GameState.input.blink) {
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
  GameState.input.blink = !GameState.input.blink;
  if (GameState.input.active) draw();
}, 500); // 500ms = 1 blink per second


window.addEventListener('mousedown', (e) => {
  if (e.target !== canvas) {
    GameState.input.active = false;
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
    
    if (!GameState.input.active) return;

    e.preventDefault();

    // Ignore key events if the user is holding a modifier (Ctrl, Alt, Meta)
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    if (e.key === 'Backspace') {
        GameState.input.buffer = GameState.input.buffer.slice(0, -1);
        e.preventDefault();
    } else if (e.key === 'Enter' || e.code === 'Space') {
        // Optionally, handle enter (e.g., submit or clear)
        GameState.input.buffer = '';
    } else if (e.key === 'Escape') {
        // Handle escape (e.g., clear input)
        GameState.input.buffer = '';
    } else if (e.key.length === 1 && !(e.code === 'Space')) {
        // Only add printable characters
        GameState.input.buffer += e.key;
    }
    draw();
});

// Mouse events for panning
canvas.addEventListener('mousedown', (e) =>{
    // 1. Activate text input focus
    GameState.input.active = true;
    
    // 2. Handle middle-button panning
    if (e.button == 1){ 
        GameState.mouse.isDragging = true;
        GameState.mouse.lastX = e.clientX;
        GameState.mouse.lastY = e.clientY;
        // Prevent default to avoid scrolling the page
        e.preventDefault();
    }

    draw();    
});


window.addEventListener('mousemove', (e) =>{
    if (GameState.mouse.isDragging) {
        const dx = (e.clientX - GameState.mouse.lastX) / GameState.viewport.scale;
        const dy = (e.clientY - GameState.mouse.lastY) / GameState.viewport.scale;
        GameState.viewport.offsetX -= dx;
        GameState.viewport.offsetY -= dy;
        GameState.mouse.lastX = e.clientX;
        GameState.mouse.lastY = e.clientY;
        draw();
    }
});

window.addEventListener('mouseup', (e) =>{
    if (e.button !== 1) return; // Only middle mouse button)
    GameState.mouse.isDragging = false;
});

// Zoom with mouse wheel
canvas.addEventListener('wheel', (e) =>{
    e.preventDefault();
    const mouse = screenToWorld(e.offsetX, e.offsetY);
    const zoom = e.deltaY < 0 ? 1.1 : 0.9;
    GameState.viewport.scale *= zoom;

    // Clamp the scale
    GameState.viewport.scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, GameState.viewport.scale));

    // Keep zoom centered on mouse
    GameState.viewport.offsetX = mouse.x - (e.offsetX / GameState.viewport.scale);
    GameState.viewport.offsetY = mouse.y - (e.offsetY / GameState.viewport.scale);

    draw();
});

// Double-click to spawn a target
canvas.addEventListener('dblclick', (e) =>{
    const {
        x,
        y
    } = screenToWorld(e.offsetX, e.offsetY);
    GameState.targets.push({
        x,
        y
    });
    draw();
});

// CSV parsing utility
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            // Toggle insideQuotes unless it's an escaped quote ("")
            if (line[i + 1] === '"') {
                current += '"';
                i++; // skip escaped quote
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            // Comma acts as field separator ONLY if not inside quotes
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    // Add the last field
    result.push(current.trim());
    return result;
}

// Parse a command line into an object
function parseCommandLine(line) {
    const parts = parseCSVLine(line);
    if (parts.length < 3) return null;

    return {
        command: parts[0],
        short: parts[1],
        long: parts.slice(2).join(',') // allows future CSV with extra parts
    };
}


// Load commands from commands.txt
function loadCommands() {
    fetch("commands.csv")
        .then(response => response.text())
        .then(text => {
            GameState.commands = text
                .split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('#'))
                .map(parseCommandLine)
                .filter(cmd => cmd !== null);

            console.log(GameState.commands);
            draw();
        })
        .catch(
            err => console.error('Failed to load commands.txt:', err)
        );
}



// Prevent context menu on right-click
canvas.addEventListener('contextmenu', (e) =>{
    e.preventDefault();
});

// Handle window resize
window.addEventListener('resize', () =>{
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    draw();
});

// Initial setup
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;
loadCommands();
draw();

