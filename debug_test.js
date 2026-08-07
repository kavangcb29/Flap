const fs = require('fs');

let logOutput = [];
const mockCtx = {
    setTransform: (...args) => logOutput.push(`ctx.setTransform(${args.join(', ')})`),
    scale: (...args) => logOutput.push(`ctx.scale(${args.join(', ')})`),
    clearRect: (...args) => logOutput.push(`ctx.clearRect(${args.join(', ')})`),
    save: () => logOutput.push(`ctx.save()`),
    restore: () => logOutput.push(`ctx.restore()`),
    translate: (...args) => logOutput.push(`ctx.translate(${args.join(', ')})`),
    rotate: (...args) => logOutput.push(`ctx.rotate(${args.join(', ')})`),
    drawImage: (...args) => logOutput.push(`ctx.drawImage(...)`),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    fillRect: (...args) => logOutput.push(`ctx.fillRect(${args.join(', ')})`),
    fillText: (...args) => logOutput.push(`ctx.fillText(...)`),
    beginPath: () => logOutput.push(`ctx.beginPath()`),
    ellipse: (...args) => logOutput.push(`ctx.ellipse(${args.join(', ')})`),
    fill: () => logOutput.push(`ctx.fill()`),
    stroke: () => logOutput.push(`ctx.stroke()`),
    arc: (...args) => logOutput.push(`ctx.arc(${args.join(', ')})`),
    moveTo: (...args) => logOutput.push(`ctx.moveTo(${args.join(', ')})`),
    lineTo: (...args) => logOutput.push(`ctx.lineTo(${args.join(', ')})`),
};
Object.defineProperty(mockCtx, 'fillStyle', { set: (v) => logOutput.push(`ctx.fillStyle = ${v}`) });
Object.defineProperty(mockCtx, 'strokeStyle', { set: (v) => logOutput.push(`ctx.strokeStyle = ${v}`) });
Object.defineProperty(mockCtx, 'globalAlpha', { set: (v) => logOutput.push(`ctx.globalAlpha = ${v}`) });
Object.defineProperty(mockCtx, 'lineWidth', { set: (v) => logOutput.push(`ctx.lineWidth = ${v}`) });
Object.defineProperty(mockCtx, 'font', { set: (v) => logOutput.push(`ctx.font = ${v}`) });
Object.defineProperty(mockCtx, 'textAlign', { set: (v) => logOutput.push(`ctx.textAlign = ${v}`) });
Object.defineProperty(mockCtx, 'imageSmoothingEnabled', { set: (v) => logOutput.push(`ctx.imageSmoothingEnabled = ${v}`) });
Object.defineProperty(mockCtx, 'imageSmoothingQuality', { set: (v) => logOutput.push(`ctx.imageSmoothingQuality = ${v}`) });

const mockCanvas = {
    getContext: () => mockCtx,
    style: {}
};

global.window = {
    innerWidth: 1920,
    innerHeight: 1080,
    devicePixelRatio: 2,
    addEventListener: () => {}
};
global.document = {
    body: { style: {} },
    getElementById: (id) => {
        if (id === 'gameCanvas') return mockCanvas;
        return {
            classList: { add: () => {}, remove: () => {} },
            addEventListener: () => {},
            innerText: '',
            style: {}
        };
    },
    querySelectorAll: () => [
        { getAttribute: () => '4k', classList: { add: () => {}, remove: () => {} }, addEventListener: () => {}, style: {} },
        { getAttribute: () => 'high', classList: { add: () => {}, remove: () => {} }, addEventListener: () => {}, style: {} },
        { getAttribute: () => 'retro', classList: { add: () => {}, remove: () => {} }, addEventListener: () => {}, style: {} }
    ]
};
global.localStorage = {
    getItem: (key) => {
        if (key === 'flappy_achievements') return '[]';
        if (key === 'flappy_max_level') return '1';
        if (key === 'flappy_high_score') return '0';
        if (key === 'flappy_coins') return '0';
        if (key === 'flappy_shields_broken') return '0';
        if (key === 'flappy_skin') return '0';
        return '4k';
    },
    setItem: () => {}
};
global.Image = class { constructor() { this.complete = true; this.naturalWidth = 1920; } };
global.requestAnimationFrame = () => {};
global.performance = { now: () => 100 };

// Load and eval game.js
const code = fs.readFileSync('D:\\Coding\\antigravity\\Game\\game.js', 'utf8');
eval(code);

// Run 1 frame
startLevel(1);
loop();

fs.writeFileSync('D:\\Coding\\antigravity\\Game\\debug_log.txt', logOutput.join('\n'));
console.log("Debug log created.");
