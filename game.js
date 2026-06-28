const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Game State & Config ---
let gameState = 'HOME'; // HOME, LEVEL_SELECT, PLAYING, LEVEL_COMPLETE, GAMEOVER
let frames = 0;
let score = 0;
let currentLevel = 1;
let maxLevelUnlocked = 1;
const obstaclesToWin = 10; // Pass 10 obstacles to clear a level
let obstaclesPassed = 0;

// --- Theme State ---
let currentTheme = {
    bg: 'linear-gradient(180deg, #87CEEB 0%, #E0F7FA 60%, #A5D6A7 100%)',
    mountains: '#2c3e50',
    pipe: '#2ECC71', pipeBorder: '#27ae60',
    planeBody: '#f72585', planeTail: '#b5179e', planeWing: '#4cc9f0'
};

// Difficulty Settings
let gameSpeed = 3;
let gravity = 0.25;
let jumpStrength = 4.6;
let pipeGap = 150;

// UI Elements
const homeScreen = document.getElementById('home-screen');
const levelScreen = document.getElementById('level-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const levelCompleteScreen = document.getElementById('level-complete-screen');
const completedLevelElement = document.getElementById('completed-level');
const scoreDisplay = document.getElementById('score-display');
const levelDisplay = document.getElementById('level-display');
const finalScoreElement = document.getElementById('final-score');
const levelGrid = document.getElementById('level-grid');

// Buttons
const homePlayBtn = document.getElementById('home-play-btn');
const levelsBtn = document.getElementById('levels-btn');
const backHomeBtn = document.getElementById('back-home-btn');
const restartBtn = document.getElementById('restart-btn');
const homeBtn = document.getElementById('home-btn');
const nextLevelBtn = document.getElementById('next-level-btn');
const homeBtnComplete = document.getElementById('home-btn-complete');

// --- Resize ---
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- Input ---
function handleInput() {
    if (gameState === 'PLAYING') {
        plane.flap();
    } else if (gameState === 'HOME') {
        // Maybe click background to start? Nah, buttons are better.
    }
}
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') handleInput();
});
window.addEventListener('mousedown', () => {
    handleInput();
});

// --- Button Listeners ---
homePlayBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    startLevel(currentLevel); // Continue from last current
});

levelsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showLevelSelect();
});

backHomeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showHome();
});

restartBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    startLevel(currentLevel);
});

homeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showHome();
});

nextLevelBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentLevel < 100) {
        startLevel(currentLevel + 1);
    } else {
        showHome();
    }
});

homeBtnComplete.addEventListener('click', (e) => {
    e.stopPropagation();
    showHome();
});


// --- State Management ---
function showHome() {
    gameState = 'HOME';
    homeScreen.classList.remove('hidden');
    levelScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    levelCompleteScreen.classList.add('hidden');
    scoreDisplay.classList.add('hidden');
    levelDisplay.classList.add('hidden');
    resetGameObjects();
}

function showLevelSelect() {
    gameState = 'LEVEL_SELECT';
    homeScreen.classList.add('hidden');
    levelScreen.classList.remove('hidden');
    renderLevelGrid();
}

function renderLevelGrid() {
    levelGrid.innerHTML = '';
    // Let's say 25 levels for now
    for (let i = 1; i <= 25; i++) {
        const btn = document.createElement('button');
        btn.className = 'level-btn';
        btn.innerText = i;
        if (i > maxLevelUnlocked) {
            btn.classList.add('locked');
            btn.disabled = true;
        } else {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                startLevel(i);
            });
        }
        levelGrid.appendChild(btn);
    }
}

function setDifficulty(level) {
    const themeIndex = Math.ceil(level / 5) % 4; 
    
    // Theme 1: Nature
    if (themeIndex === 1) {
        currentTheme = {
            bg: 'linear-gradient(180deg, #87CEEB 0%, #E0F7FA 60%, #A5D6A7 100%)',
            mountains: '#2c3e50',
            pipe: '#2ECC71', pipeBorder: '#27ae60',
            planeBody: '#f72585', planeTail: '#b5179e', planeWing: '#4cc9f0'
        };
    }
    // Theme 2: Desert
    else if (themeIndex === 2) {
        currentTheme = {
            bg: 'linear-gradient(180deg, #FFB75E 0%, #ED8F03 100%)',
            mountains: '#8B4513',
            pipe: '#FFD700', pipeBorder: '#DAA520',
            planeBody: '#00FFFF', planeTail: '#008B8B', planeWing: '#FFFFFF'
        };
    }
    // Theme 3: Night
    else if (themeIndex === 3) {
        currentTheme = {
            bg: 'linear-gradient(180deg, #0F2027 0%, #203A43 60%, #2C5364 100%)',
            mountains: '#000000',
            pipe: '#8A2BE2', pipeBorder: '#4B0082',
            planeBody: '#FFD700', planeTail: '#DAA520', planeWing: '#FFFFFF'
        };
    }
    // Theme 4: Snow
    else {
        currentTheme = {
            bg: 'linear-gradient(180deg, #E0FFFF 0%, #FFFFFF 100%)',
            mountains: '#B0E0E6',
            pipe: '#FFFFFF', pipeBorder: '#ADD8E6',
            planeBody: '#FF0000', planeTail: '#8B0000', planeWing: '#FFFFFF'
        };
    }
    
    document.body.style.background = currentTheme.bg;

    // 1-10: Easy
    if (level <= 10) {
        gravity = 0.2;
        jumpStrength = 4.0;
        gameSpeed = 3 + (level * 0.1);
        pipeGap = 170;
    }
    // 11-20: Medium
    else if (level <= 20) {
        gravity = 0.25;
        jumpStrength = 4.6;
        gameSpeed = 4 + ((level - 10) * 0.15);
        pipeGap = 150;
    }
    // 21+: Hard
    else {
        gravity = 0.35;
        jumpStrength = 5.2;
        gameSpeed = 5 + ((level - 20) * 0.2);
        pipeGap = 130;
    }
}

function startLevel(level) {
    currentLevel = level;
    setDifficulty(level);

    gameState = 'PLAYING';

    // Hide UIs
    homeScreen.classList.add('hidden');
    levelScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    levelCompleteScreen.classList.add('hidden');

    // Show HUD
    scoreDisplay.classList.remove('hidden');
    levelDisplay.classList.remove('hidden');
    levelDisplay.innerText = `Level ${currentLevel}`;

    // Reset Data
    score = 0;
    obstaclesPassed = 0;
    frames = 0;
    obstacles.reset();
    createParticles(plane.x, plane.y, 10); // Spawn effect

    scoreDisplay.innerText = `${obstaclesPassed}/${obstaclesToWin}`;

    plane.y = canvas.height / 2;
    plane.velocity = 0;
    plane.angle = 0;

    // Do NOT call loop() here, it is already running globally.
}

function winLevel() {
    gameState = 'LEVEL_COMPLETE';
    if (currentLevel === maxLevelUnlocked) {
        maxLevelUnlocked++;
    }

    levelCompleteScreen.classList.remove('hidden');
    scoreDisplay.classList.add('hidden');
    levelDisplay.classList.add('hidden');
    completedLevelElement.innerText = currentLevel;
}

function gameOver() {
    gameState = 'GAMEOVER';
    gameOverScreen.classList.remove('hidden');
    scoreDisplay.classList.add('hidden');
    levelDisplay.classList.add('hidden');
    finalScoreElement.innerText = score;
}

// --- Game Objects ---
const plane = {
    x: 50,
    y: 150,
    width: 34,
    height: 24,
    velocity: 0,
    angle: 0,

    draw: function () {
        ctx.save();
        ctx.translate(this.x, this.y);
        this.angle = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.velocity * 0.1)));
        ctx.rotate(this.angle);

        // Body
        ctx.fillStyle = currentTheme.planeBody;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        // Tail
        ctx.fillStyle = currentTheme.planeTail;
        ctx.beginPath();
        ctx.moveTo(-15, -5);
        ctx.lineTo(-25, -15);
        ctx.lineTo(-15, 5);
        ctx.fill();
        // Wing
        ctx.fillStyle = currentTheme.planeWing;
        ctx.beginPath();
        ctx.ellipse(5, 5, 10, 4, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    },

    update: function () {
        this.velocity += gravity;
        this.y += this.velocity;

        if (this.y + this.height / 2 > canvas.height) {
            this.y = canvas.height - this.height / 2;
            gameOver();
        }
        if (this.y - this.height / 2 < 0) {
            this.y = this.height / 2;
            this.velocity = 0;
        }
    },

    flap: function () {
        this.velocity = -jumpStrength;
        createParticles(this.x, this.y, 3);
    }
};

const obstacles = {
    list: [],
    width: 50,

    update: function () {
        if (frames % 120 === 0) { // Slower spawn rate
            const minHeight = 50;
            const maxHeight = canvas.height - pipeGap - minHeight;
            const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1) + minHeight);

            this.list.push({
                x: canvas.width,
                topHeight: topHeight,
                passed: false
            });
        }

        for (let i = 0; i < this.list.length; i++) {
            let obs = this.list[i];
            obs.x -= gameSpeed;

            // Collision
            const pLeft = plane.x - plane.width / 2 + 5;
            const pRight = plane.x + plane.width / 2 - 5;
            const pTop = plane.y - plane.height / 2 + 5;
            const pBottom = plane.y + plane.height / 2 - 5;

            // Top Pipe
            if (pRight > obs.x && pLeft < obs.x + this.width && pTop < obs.topHeight) {
                gameOver();
            }
            // Bottom Pipe
            const bottomPipeY = obs.topHeight + pipeGap;
            if (pRight > obs.x && pLeft < obs.x + this.width && pBottom > bottomPipeY) {
                gameOver();
            }

            // Score
            if (!obs.passed && plane.x > obs.x + this.width) {
                score++;
                obstaclesPassed++;
                scoreDisplay.innerText = `${obstaclesPassed}/${obstaclesToWin}`;
                obs.passed = true;

                if (obstaclesPassed >= obstaclesToWin) {
                    winLevel();
                }
            }

            if (obs.x + this.width < 0) {
                this.list.shift();
                i--;
            }
        }
    },

    draw: function () {
        ctx.fillStyle = currentTheme.pipe;
        ctx.strokeStyle = currentTheme.pipeBorder;
        ctx.lineWidth = 2;

        for (let obs of this.list) {
            // Top Pipe
            ctx.fillRect(obs.x, 0, this.width, obs.topHeight);
            ctx.strokeRect(obs.x, 0, this.width, obs.topHeight);

            // Bottom Pipe
            const bottomPipeY = obs.topHeight + pipeGap;
            ctx.fillRect(obs.x, bottomPipeY, this.width, canvas.height - bottomPipeY);
            ctx.strokeRect(obs.x, bottomPipeY, this.width, canvas.height - bottomPipeY);

            // Pipe Caps
            ctx.fillStyle = currentTheme.pipeBorder;
            ctx.fillRect(obs.x - 2, obs.topHeight - 20, this.width + 4, 20); // Top Cap
            ctx.fillRect(obs.x - 2, bottomPipeY, this.width + 4, 20); // Bottom Cap
            ctx.fillStyle = currentTheme.pipe; // Restore
        }
    },

    reset: function () {
        this.list = [];
    }
};

const particlesList = [];
function createParticles(x, y, count) {
    for (let i = 0; i < count; i++) {
        particlesList.push({
            x: x - 10,
            y: y,
            vx: (Math.random() - 0.5) * 2 - 2,
            vy: (Math.random() - 0.5) * 2,
            life: 20 + Math.random() * 10,
            color: `hsl(${Math.random() * 50 + 100}, 100%, 70%)` // Greenish particles
        });
    }
}
function handleParticles() {
    for (let i = 0; i < particlesList.length; i++) {
        let p = particlesList[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 30;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        if (p.life <= 0) {
            particlesList.splice(i, 1);
            i--;
        }
    }
}

const background = {
    mountains: [],
    clouds: [],
    init: function () {
        // Init clouds
        for (let i = 0; i < 5; i++) {
            this.clouds.push({
                x: Math.random() * canvas.width,
                y: Math.random() * (canvas.height / 2),
                speed: 0.1 + Math.random() * 0.2, // Much slower clouds
                size: 30 + Math.random() * 50
            });
        }
    },
    update: function () {
        for (let c of this.clouds) {
            c.x -= c.speed;
            if (c.x + c.size * 2 < 0) c.x = canvas.width + c.size;
        }
    },
    draw: function () {
        // Draw Mountains
        ctx.fillStyle = currentTheme.mountains;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);
        ctx.lineTo(200, canvas.height - 150);
        ctx.lineTo(400, canvas.height - 50);
        ctx.lineTo(600, canvas.height - 200);
        ctx.lineTo(900, canvas.height - 100);
        ctx.lineTo(canvas.width, canvas.height - 250);
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.fill();

        // Draw Clouds
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for (let c of this.clouds) {
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
            ctx.arc(c.x + c.size * 0.8, c.y - c.size * 0.5, c.size * 0.9, 0, Math.PI * 2);
            ctx.arc(c.x + c.size * 1.5, c.y, c.size * 0.8, 0, Math.PI * 2);
            ctx.fill();
        }
    }
};
background.init();

function resetGameObjects() {
    obstacles.reset();
    plane.y = canvas.height / 2;
    plane.velocity = 0;
}

function loop() {
    if (gameState === 'PLAYING') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        background.update();
        background.draw();

        obstacles.update();
        obstacles.draw();

        handleParticles();

        plane.update();
        plane.draw();

        frames++;
        requestAnimationFrame(loop);
    } else {
        // Draw background even in menus for effect
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        background.update();
        background.draw();
        if (gameState !== 'HOME') {
            plane.draw(); // Show plane in background if not home
        }
        requestAnimationFrame(loop);
    }
}

// Start in Home
showHome();
loop();
