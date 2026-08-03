const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Game State & Config ---
let gameState = 'HOME'; // HOME, LEVEL_SELECT, PLAYING, LEVEL_COMPLETE, GAMEOVER
let frames = 0;
let score = 0;
let currentLevel = 1;
let maxLevelUnlocked = parseInt(localStorage.getItem('flappy_max_level') || '1', 10);
let highScore = parseInt(localStorage.getItem('flappy_high_score') || '0', 10);
const obstaclesToWin = 10; // Pass 10 obstacles to clear a level
let obstaclesPassed = 0;

function saveProgress() {
    localStorage.setItem('flappy_max_level', maxLevelUnlocked);
    localStorage.setItem('flappy_high_score', highScore);
}

// --- Sound Effects (Web Audio API) ---
let soundEnabled = true;
let audioCtx = null;

function playTone(freq, type, duration, startFreq = freq) {
    if (!soundEnabled) return;
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(startFreq, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq, audioCtx.currentTime + duration);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
}

const soundEffects = {
    flap: () => playTone(600, 'sine', 0.08, 400),
    score: () => playTone(1174, 'sine', 0.15, 880),
    win: () => {
        playTone(523, 'triangle', 0.1, 523);
        setTimeout(() => playTone(659, 'triangle', 0.1, 659), 100);
        setTimeout(() => playTone(783, 'triangle', 0.1, 783), 200);
        setTimeout(() => playTone(1046, 'triangle', 0.25, 1046), 300);
    },
    gameOver: () => playTone(100, 'sawtooth', 0.4, 300),
    coin: () => playTone(1567, 'sine', 0.12, 1318),
    powerup: () => playTone(880, 'triangle', 0.2, 440),
    shieldBreak: () => playTone(200, 'sawtooth', 0.25, 600)
};

// --- Plane Skins ---
const skins = [
    { name: 'Neon Pink', body: '#f72585', tail: '#b5179e', wing: '#4cc9f0' },
    { name: 'Golden Bomber', body: '#FFD700', tail: '#DAA520', wing: '#FFFFFF' },
    { name: 'Cyan Jet', body: '#00FFFF', tail: '#008B8B', wing: '#FFFFFF' },
    { name: 'Stealth Black', body: '#1a1a1a', tail: '#333333', wing: '#e74c3c' }
];
let selectedSkin = parseInt(localStorage.getItem('flappy_skin') || '0', 10);

// --- Theme State ---
let currentTheme = {
    name: 'Nature',
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

// New HUD & Score UI
const homeHighScoreElement = document.getElementById('home-high-score');
const gameoverHighScoreElement = document.getElementById('gameover-high-score');
const progressBarContainer = document.getElementById('progress-bar-container');
const progressBar = document.getElementById('progress-bar');
const soundToggleBtn = document.getElementById('sound-toggle-btn');

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

if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        soundEnabled = !soundEnabled;
        soundToggleBtn.innerText = soundEnabled ? '🔊' : '🔇';
    });
}

// Skin Selector Listeners
const skinButtons = document.querySelectorAll('.skin-btn');
function updateSkinButtons() {
    skinButtons.forEach((btn) => {
        const idx = parseInt(btn.getAttribute('data-skin'), 10);
        if (idx === selectedSkin) btn.classList.add('active');
        else btn.classList.remove('active');
    });
}
skinButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedSkin = parseInt(btn.getAttribute('data-skin'), 10);
        localStorage.setItem('flappy_skin', selectedSkin);
        updateSkinButtons();
        soundEffects.flap();
    });
});
updateSkinButtons();


// --- State Management ---
function showHome() {
    gameState = 'HOME';
    homeScreen.classList.remove('hidden');
    levelScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    levelCompleteScreen.classList.add('hidden');
    scoreDisplay.classList.add('hidden');
    levelDisplay.classList.add('hidden');
    if (progressBarContainer) progressBarContainer.classList.add('hidden');
    if (homeHighScoreElement) homeHighScoreElement.innerText = highScore;
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
            name: 'Nature',
            bg: 'linear-gradient(180deg, #87CEEB 0%, #E0F7FA 60%, #A5D6A7 100%)',
            mountains: '#2c3e50',
            pipe: '#2ECC71', pipeBorder: '#27ae60',
            planeBody: '#f72585', planeTail: '#b5179e', planeWing: '#4cc9f0'
        };
    }
    // Theme 2: Desert
    else if (themeIndex === 2) {
        currentTheme = {
            name: 'Desert',
            bg: 'linear-gradient(180deg, #FFB75E 0%, #ED8F03 100%)',
            mountains: '#8B4513',
            pipe: '#FFD700', pipeBorder: '#DAA520',
            planeBody: '#00FFFF', planeTail: '#008B8B', planeWing: '#FFFFFF'
        };
    }
    // Theme 3: Night
    else if (themeIndex === 3) {
        currentTheme = {
            name: 'Night',
            bg: 'linear-gradient(180deg, #0F2027 0%, #203A43 60%, #2C5364 100%)',
            mountains: '#000000',
            pipe: '#8A2BE2', pipeBorder: '#4B0082',
            planeBody: '#FFD700', planeTail: '#DAA520', planeWing: '#FFFFFF'
        };
    }
    // Theme 4: Snow
    else {
        currentTheme = {
            name: 'Snow',
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
    if (progressBarContainer) {
        progressBarContainer.classList.remove('hidden');
        if (progressBar) progressBar.style.width = '0%';
    }

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
    soundEffects.win();
    if (currentLevel === maxLevelUnlocked) {
        maxLevelUnlocked++;
        saveProgress();
    }

    levelCompleteScreen.classList.remove('hidden');
    scoreDisplay.classList.add('hidden');
    levelDisplay.classList.add('hidden');
    if (progressBarContainer) progressBarContainer.classList.add('hidden');
    completedLevelElement.innerText = currentLevel;
}

function gameOver() {
    gameState = 'GAMEOVER';
    soundEffects.gameOver();
    if (score > highScore) {
        highScore = score;
        saveProgress();
    }
    gameOverScreen.classList.remove('hidden');
    scoreDisplay.classList.add('hidden');
    levelDisplay.classList.add('hidden');
    if (progressBarContainer) progressBarContainer.classList.add('hidden');
    finalScoreElement.innerText = score;
    if (gameoverHighScoreElement) gameoverHighScoreElement.innerText = highScore;
}

// --- Game Objects ---
const plane = {
    x: 50,
    y: 150,
    width: 34,
    height: 24,
    velocity: 0,
    angle: 0,
    shielded: false,

    draw: function () {
        ctx.save();
        ctx.translate(this.x, this.y);
        this.angle = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.velocity * 0.1)));
        ctx.rotate(this.angle);

        if (this.shielded) {
            ctx.strokeStyle = '#00FFFF';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, 24, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
            ctx.fill();
        }

        const skin = skins[selectedSkin] || skins[0];

        // Body
        ctx.fillStyle = skin.body;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        // Tail
        ctx.fillStyle = skin.tail;
        ctx.beginPath();
        ctx.moveTo(-15, -5);
        ctx.lineTo(-25, -15);
        ctx.lineTo(-15, 5);
        ctx.fill();
        // Wing
        ctx.fillStyle = skin.wing;
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
        soundEffects.flap();
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
                if (plane.shielded) {
                    plane.shielded = false;
                    soundEffects.shieldBreak();
                    obs.topHeight = -100; // remove obstruction
                    createParticles(plane.x, plane.y, 15);
                } else {
                    gameOver();
                }
            }
            // Bottom Pipe
            const bottomPipeY = obs.topHeight + pipeGap;
            if (pRight > obs.x && pLeft < obs.x + this.width && pBottom > bottomPipeY) {
                if (plane.shielded) {
                    plane.shielded = false;
                    soundEffects.shieldBreak();
                    obs.topHeight = canvas.height + 100; // remove obstruction
                    createParticles(plane.x, plane.y, 15);
                } else {
                    gameOver();
                }
            }

            // Score
            if (!obs.passed && plane.x > obs.x + this.width) {
                score++;
                obstaclesPassed++;
                soundEffects.score();
                if (score > highScore) {
                    highScore = score;
                    saveProgress();
                }
                scoreDisplay.innerText = `${obstaclesPassed}/${obstaclesToWin}`;
                if (progressBar) {
                    const percent = Math.min(100, (obstaclesPassed / obstaclesToWin) * 100);
                    progressBar.style.width = `${percent}%`;
                }
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

const collectibles = {
    list: [],
    update: function () {
        if (frames % 120 === 60 && Math.random() < 0.65) {
            const type = Math.random() < 0.75 ? 'coin' : 'shield';
            const y = Math.random() * (canvas.height - 200) + 100;
            this.list.push({ x: canvas.width, y: y, type: type, collected: false });
        }
        for (let i = 0; i < this.list.length; i++) {
            let item = this.list[i];
            item.x -= gameSpeed;
            if (!item.collected) {
                const dx = plane.x - item.x;
                const dy = plane.y - item.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 28) {
                    item.collected = true;
                    if (item.type === 'coin') {
                        score += 2;
                        soundEffects.coin();
                        createParticles(item.x, item.y, 8);
                    } else if (item.type === 'shield') {
                        plane.shielded = true;
                        soundEffects.powerup();
                        createParticles(item.x, item.y, 10);
                    }
                    if (score > highScore) {
                        highScore = score;
                        saveProgress();
                    }
                    scoreDisplay.innerText = `${obstaclesPassed}/${obstaclesToWin}`;
                }
            }
            if (item.x < -30 || item.collected) {
                this.list.splice(i, 1);
                i--;
            }
        }
    },
    draw: function () {
        for (let item of this.list) {
            ctx.save();
            ctx.translate(item.x, item.y);
            if (item.type === 'coin') {
                ctx.fillStyle = '#FFD700';
                ctx.strokeStyle = '#DAA520';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 12px Outfit, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('$', 0, 0);
            } else {
                ctx.fillStyle = 'rgba(0, 255, 255, 0.6)';
                ctx.strokeStyle = '#00FFFF';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, 14, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
            ctx.restore();
        }
    },
    reset: function () {
        this.list = [];
    }
};

const background = {
    mountains: [],
    clouds: [],
    stars: [],
    snowflakes: [],
    init: function () {
        for (let i = 0; i < 5; i++) {
            this.clouds.push({
                x: Math.random() * canvas.width,
                y: Math.random() * (canvas.height / 2),
                speed: 0.1 + Math.random() * 0.2,
                size: 30 + Math.random() * 50
            });
        }
        for (let i = 0; i < 40; i++) {
            this.stars.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * (window.innerHeight * 0.6),
                size: 1 + Math.random() * 2,
                alpha: Math.random()
            });
        }
        for (let i = 0; i < 35; i++) {
            this.snowflakes.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                size: 2 + Math.random() * 3,
                vy: 1 + Math.random() * 2,
                vx: (Math.random() - 0.5) * 1
            });
        }
    },
    update: function () {
        for (let c of this.clouds) {
            c.x -= c.speed;
            if (c.x + c.size * 2 < 0) c.x = canvas.width + c.size;
        }
        if (currentTheme.name === 'Snow') {
            for (let s of this.snowflakes) {
                s.y += s.vy;
                s.x += s.vx;
                if (s.y > canvas.height) {
                    s.y = -10;
                    s.x = Math.random() * canvas.width;
                }
            }
        }
    },
    draw: function () {
        if (currentTheme.name === 'Night') {
            ctx.fillStyle = '#ffffff';
            for (let s of this.stars) {
                ctx.globalAlpha = 0.4 + Math.sin(frames * 0.05 + s.x) * 0.4;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

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

        if (currentTheme.name === 'Snow') {
            ctx.fillStyle = '#ffffff';
            for (let s of this.snowflakes) {
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
};
background.init();

function resetGameObjects() {
    obstacles.reset();
    collectibles.reset();
    plane.y = canvas.height / 2;
    plane.velocity = 0;
    plane.shielded = false;
}

function loop() {
    if (gameState === 'PLAYING') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        background.update();
        background.draw();

        obstacles.update();
        obstacles.draw();

        collectibles.update();
        collectibles.draw();

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
