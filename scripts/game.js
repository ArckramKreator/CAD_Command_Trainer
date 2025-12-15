// Get canvas and context
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

    ui: {
        commandInfoHovered: false,

        infoBox: {
            x: 0,
            y: 0,
            size: 40
        }
    },

    commands: [],

    targets: [],

    debugMode: true
};

// Toggle debug mode
window.toggleDebug = function () {
    GameState.debugMode = !GameState.debugMode;
    console.log(`Debug mode ${GameState.debugMode ? 'ENABLED' : 'DISABLED'}`);
};

// Target class
class Target {
    constructor(x, y, id) {
        this.x = x;
        this.y = y;

        // Identifier (00–99 expected)
        this.id = id;

        // Interaction state
        this.selected = false;
        this.hovered = false;

        // Visual configuration (world units)
        this.baseRadius = 50;
        this.lineLength = 25;
    }

    draw(ctx, viewport) {
        const { offsetX, offsetY, scale } = viewport;

        const screenX = (this.x - offsetX) * scale;
        const screenY = (this.y - offsetY) * scale;

        const radius = this.baseRadius * scale;
        const tick = this.lineLength * scale;

        // --- COLOR LOGIC ---
        let fillColor = '#ff2828';
        if (this.hovered) fillColor = '#ffffff';
        else if (this.selected) fillColor = '#2828ff';

        let fontColor = '#ffffff';
        if (this.hovered) fontColor = '#000000';
        else if (this.selected) fontColor = '#ffff00';

        // --- CIRCLE ---
        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.lineWidth = Math.max(0.5, 3 * scale);
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // --- CROSSHAIR LINES ---
        ctx.beginPath();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth =  Math.max(0.5, 3 * scale);

        // Top
        ctx.moveTo(screenX, screenY - (radius / 3) * 2);
        ctx.lineTo(screenX, screenY - radius - tick);

        // Bottom
        ctx.moveTo(screenX, screenY + (radius / 3) * 2);
        ctx.lineTo(screenX, screenY + radius + tick);

        // Left
        ctx.moveTo(screenX - (radius / 3) * 2, screenY);
        ctx.lineTo(screenX - radius - tick, screenY);

        // Right
        ctx.moveTo(screenX + (radius / 3) * 2, screenY);
        ctx.lineTo(screenX + radius + tick, screenY);

        ctx.stroke();

        // --- ID TEXT ---
        ctx.fillStyle = fontColor;
        ctx.font = `${Math.max(10, 40 * scale)}px "IBM Plex Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const label = String(this.id).padStart(2, '0');
        ctx.fillText(label, screenX, screenY);
    }

    containsPoint(worldX, worldY) {
        const dx = worldX - this.x;
        const dy = worldY - this.y;
        return Math.sqrt(dx * dx + dy * dy) <= this.baseRadius;
    }

    moveBy(dx, dy) {
        this.x += dx;
        this.y += dy;
    }
}

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

// Main draw function
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
        target.draw(ctx, GameState.viewport);
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

    // Info box (right side of top box)
    const infoBox = GameState.ui.infoBox;

    infoBox.size = 40;
    infoBox.x = topBoxX + topBoxWidth + 10;
    infoBox.y = topBoxY + (topBoxHeight - infoBox.size) / 2;


    ctx.save();

    ctx.fillStyle = GameState.ui.commandInfoHovered ? '#2a2a55' : '#181830';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.roundRect(
        infoBox.x,
        infoBox.y,
        infoBox.size,
        infoBox.size,
        6
    );

    ctx.fill();
    ctx.stroke();

    // Draw "i" icon
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
        'i',
        infoBox.x + infoBox.size / 2,
        infoBox.y + infoBox.size / 2
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

    if (GameState.ui.commandInfoHovered && GameState.commands.length > 0) {
        const cmd = GameState.commands[0];

        const tooltipWidth = 300;
        const tooltipPadding = 14;
        const tooltipX = infoBox.x + infoBox.size + 10;
        const tooltipY = infoBox.y;

        ctx.save();

        // Background
        ctx.fillStyle = '#101025';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(tooltipX, tooltipY, tooltipWidth, 110, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        // Command name
        ctx.font = 'bold 16px "IBM Plex Mono", monospace';
        ctx.fillText(
            `${cmd.short}`,
            tooltipX + tooltipPadding,
            tooltipY + tooltipPadding
        );

        // Description
        ctx.font = '14px "IBM Plex Mono", monospace';
        wrapText(
            ctx,
            cmd.long,
            tooltipX + tooltipPadding,
            tooltipY + tooltipPadding + 26,
            tooltipWidth - tooltipPadding * 2,
            18
        );

        ctx.restore();
    }
    

}

// Hover detection for info box
canvas.addEventListener('mousemove', (e) => {
    const { x, y, size } = GameState.ui.infoBox;

    GameState.ui.commandInfoHovered =
        e.offsetX >= x &&
        e.offsetX <= x + size &&
        e.offsetY >= y &&
        e.offsetY <= y + size;
});


// Text wrapping utility
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';

    for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && i > 0) {
            ctx.fillText(line, x, y);
            line = words[i] + ' ';
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, y);
}


// Blink cursor interval
setInterval(() => {
    GameState.input.blink = !GameState.input.blink;
}, 500);

// Deactivate text input on outside click
window.addEventListener('mousedown', (e) => {
    if (e.target !== canvas) {
        GameState.input.active = false;
        if (GameState.debugMode) {
            console.log('Text input deactivated');
        }
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

    // Debug log
    if (GameState.debugMode) {
        console.log(`Input buffer: "${GameState.input.buffer}"`);
    }
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
        // Debug log
        if (GameState.debugMode) {
            console.log('Started panning:');
            console.log('\tStart offsetX =' + GameState.viewport.offsetX.toFixed(2));
            console.log('\tStart offsetY =' + GameState.viewport.offsetY.toFixed(2));
            console.log('\tStarting mouseX =' + GameState.mouse.lastX);
            console.log('\tStarting mouseY =' + GameState.mouse.lastY);
        }
    }

});

// Mouse move for panning
window.addEventListener('mousemove', (e) =>{
    if (GameState.mouse.isDragging) {
        const dx = (e.clientX - GameState.mouse.lastX) / GameState.viewport.scale;
        const dy = (e.clientY - GameState.mouse.lastY) / GameState.viewport.scale;
        GameState.viewport.offsetX -= dx;
        GameState.viewport.offsetY -= dy;
        GameState.mouse.lastX = e.clientX;
        GameState.mouse.lastY = e.clientY;
    }
});

// Stop panning on mouse up
window.addEventListener('mouseup', (e) =>{
    if (e.button !== 1) return; // Only middle mouse button)
    GameState.mouse.isDragging = false;
    // Debug log
    if (GameState.debugMode) {
        console.log('Stopped panning:');
        console.log('\tFinal offsetX =' + GameState.viewport.offsetX.toFixed(2));
        console.log('\tFinal offsetY =' + GameState.viewport.offsetY.toFixed(2));
        console.log('\tLast mouseX =' + GameState.mouse.lastX);
        console.log('\tLast mouseY =' + GameState.mouse.lastY);
        
    }
});

// Zoom with mouse wheel
canvas.addEventListener('wheel', (e) =>{
    e.preventDefault();
    const mouse = screenToWorld(e.offsetX, e.offsetY);
    const zoom = e.deltaY < 0 ? 1.1 : 0.9;
    GameState.viewport.scale *= zoom;

    // Clamp the scale
    GameState.viewport.scale = Math.max(GameState.viewport.MIN_SCALE, Math.min(GameState.viewport.MAX_SCALE, GameState.viewport.scale));

    // Keep zoom centered on mouse
    GameState.viewport.offsetX = mouse.x - (e.offsetX / GameState.viewport.scale);
    GameState.viewport.offsetY = mouse.y - (e.offsetY / GameState.viewport.scale);

    // debug log
    if (GameState.debugMode) {
        console.log(`Zoomed to scale: ${GameState.viewport.scale.toFixed(3)}`);
    }
});

// Double-click to spawn a target
canvas.addEventListener('dblclick', (e) =>{
    const {
        x,
        y
    } = screenToWorld(e.offsetX, e.offsetY);
    GameState.targets.push(
        new Target(x, y, GameState.targets.length + 1)
    );
    if (GameState.debugMode) {
        console.log(`Spawned target ${GameState.targets.length} at (${x.toFixed(2)}, ${y.toFixed(2)})`);
    }
});

// Hover detection
canvas.addEventListener('mousemove', (e) => {
    const world = screenToWorld(e.offsetX, e.offsetY);

    for (const target of GameState.targets) {
        target.hovered = target.containsPoint(world.x, world.y);
        if (target.hovered && GameState.debugMode) {
            console.log(`Hovering over target ${target.id}`);
        }
    }
});


// Click to toggle target selection
canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;

    const world = screenToWorld(e.offsetX, e.offsetY);

    for (const target of GameState.targets) {
        if (target.containsPoint(world.x, world.y)) {
            // TOGGLE selection state
            target.selected = !target.selected;

            // Debug log
            if (GameState.debugMode) {
                console.log(`Target ${target.id} selection toggled to ${target.selected}`);
            }

            return; // stop after first hit
        }
    }
    // Debug log for no target clicked
    if (GameState.debugMode) {
        console.log('No target clicked');
    }
    return;
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

    // Debug log
    if (GameState.debugMode) {
        console.log('\tCSV parsing result:', result);
    }

    // Add the last field
    result.push(current.trim());
    return result;
}

// Parse a command line into an object
function parseCommandLine(line) {
    const parts = parseCSVLine(line);
    if (parts.length < 3) return null;

    // Debug log
    if (GameState.debugMode) {
        console.log('\t\tParsed command line:', parts);
    }
    return {
        command: parts[0],
        short: parts[1],
        long: parts.slice(2).join(',') // allows future CSV with extra parts
    };
}


// Load commands from commands.txt
function loadCommands() {
    if (GameState.debugMode) {
        console.log('Loading commands from commands.csv...');
    }
    fetch("commands.csv")
        .then(response => response.text())
        .then(text => {
            GameState.commands = text
                .split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('#'))
                .map(parseCommandLine)
                .filter(cmd => cmd !== null);

            if (GameState.debugMode) {
                console.log('Loaded commands:');
                console.log('\t',GameState.commands);
            }
        })
        .catch(
            err => console.error('Failed to load commands.txt:', err)
        );
}



// Prevent context menu on right-click
canvas.addEventListener('contextmenu', (e) =>{
    e.preventDefault();
    if (GameState.debugMode) {
        console.log('Context menu prevented');
    }
});

// Handle window resize
window.addEventListener('resize', () =>{
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    if (GameState.debugMode) {
        console.log(`Canvas resized to ${canvas.width}x${canvas.height}`);
    }
});

// Initial setup
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;
loadCommands();
//draw();

function loop() {
    draw();
    requestAnimationFrame(loop);
}

// Start the render loop
requestAnimationFrame(loop);

