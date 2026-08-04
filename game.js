const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Game State & Config ---
let graphicsMode = localStorage.getItem('graphics_mode') || '4k';
const bgImage4K = new Image();
bgImage4K.src = 'flappy_plane_screenshot.jpg';
let gameState = 'HOME'; // HOME, LEVEL_SELECT, PLAYING, LEVEL_COMPLETE, GAMEOVER
let frames = 0;
let score = 0;
let currentLevel = 1;
let maxLevelUnlocked = parseInt(localStorage.getItem('flappy_max_level') || '1', 10);
let highScore = parseInt(localStorage.getItem('flappy_high_score') || '0', 10);
let totalCoins = parseInt(localStorage.getItem('flappy_coins') || '0', 10);
let shieldsBroken = parseInt(localStorage.getItem('flappy_shields_broken') || '0', 10);
const obstaclesToWin = 10; // Pass 10 obstacles to clear a level
let obstaclesPassed = 0;

function saveProgress() {
    localStorage.setItem('flappy_max_level', maxLevelUnlocked);
    localStorage.setItem('flappy_high_score', highScore);
    localStorage.setItem('flappy_coins', totalCoins);
    localStorage.setItem('flappy_shields_broken', shieldsBroken);
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
    shieldBreak: () => playTone(200, 'sawtooth', 0.25, 600),
    achievement: () => {
        playTone(587.33, 'triangle', 0.12, 587.33);
        setTimeout(() => playTone(880, 'triangle', 0.25, 880), 120);
    }
};

// --- Procedural Chiptune Music ---
let musicEnabled = false;
let musicInterval = null;
const chiptuneNotes = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 293.66, 349.23, 440.00, 587.33];
let currentNoteIndex = 0;
function toggleMusic() {
    musicEnabled = !musicEnabled;
    const btn = document.getElementById('music-toggle-btn');
    if (btn) btn.innerText = musicEnabled ? '🎵' : '🔇';
    if (musicEnabled) {
        if (!musicInterval) {
            musicInterval = setInterval(() => {
                if (musicEnabled && gameState === 'PLAYING') {
                    playTone(chiptuneNotes[currentNoteIndex], 'square', 0.1, chiptuneNotes[currentNoteIndex]);
                    currentNoteIndex = (currentNoteIndex + 1) % chiptuneNotes.length;
                }
            }, 180);
        }
    } else if (musicInterval) {
        clearInterval(musicInterval);
        musicInterval = null;
    }
}

// --- Achievements & Trophies System ---
const achievements = [
    { id: 'first_flight', name: 'First Flight', desc: 'Complete Level 1', icon: '✈️', unlocked: false },
    { id: 'coin_collector', name: 'Coin Collector', desc: 'Collect 10 Coins total', icon: '💰', unlocked: false },
    { id: 'shield_master', name: 'Shield Master', desc: 'Break 3 Pipes with a Shield', icon: '🛡️', unlocked: false },
    { id: 'night_owl', name: 'Night Owl', desc: 'Reach Level 11 (Night Theme)', icon: '🌙', unlocked: false },
    { id: 'centurion', name: 'Centurion', desc: 'Score 50 points in one run', icon: '👑', unlocked: false }
];

const savedAchievements = JSON.parse(localStorage.getItem('flappy_achievements') || '[]');
achievements.forEach(a => {
    if (savedAchievements.includes(a.id)) a.unlocked = true;
});

function unlockAchievement(id) {
    const ach = achievements.find(a => a.id === id);
    if (ach && !ach.unlocked) {
        ach.unlocked = true;
        savedAchievements.push(id);
        localStorage.setItem('flappy_achievements', JSON.stringify(savedAchievements));
        soundEffects.achievement();
        showAchievementToast(ach.name);
    }
}

function showAchievementToast(name) {
    const toast = document.getElementById('achievement-toast');
    const descEl = document.getElementById('toast-desc');
    if (toast && descEl) {
        descEl.innerText = name;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 3500);
    }
}

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
let streak = 0;
function getEffectiveSpeed() {
    return plane.slowmo > 0 ? gameSpeed * 0.5 : gameSpeed;
}
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
const trophiesScreen = document.getElementById('trophies-screen');
const trophyList = document.getElementById('trophy-list');
const pauseScreen = document.getElementById('pause-screen');
const cinematicScreen = document.getElementById('cinematic-screen');
const heroPreviewBanner = document.getElementById('hero-preview-banner');
const closeCinematicBtn = document.getElementById('close-cinematic-btn');

// Buttons
const homePlayBtn = document.getElementById('home-play-btn');
const levelsBtn = document.getElementById('levels-btn');
const trophiesBtn = document.getElementById('trophies-btn');
const backTrophiesBtn = document.getElementById('back-trophies-btn');
const backHomeBtn = document.getElementById('back-home-btn');
const restartBtn = document.getElementById('restart-btn');
const homeBtn = document.getElementById('home-btn');
const nextLevelBtn = document.getElementById('next-level-btn');
const homeBtnComplete = document.getElementById('home-btn-complete');

// Pause & Music Buttons
const pauseBtn = document.getElementById('pause-btn');
const musicToggleBtn = document.getElementById('music-toggle-btn');
const resumeBtn = document.getElementById('resume-btn');
const pauseRestartBtn = document.getElementById('pause-restart-btn');
const pauseHomeBtn = document.getElementById('pause-home-btn');

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
    }
}
function togglePause() {
    if (gameState === 'PLAYING') {
        gameState = 'PAUSED';
        if (pauseScreen) pauseScreen.classList.remove('hidden');
    } else if (gameState === 'PAUSED') {
        gameState = 'PLAYING';
        if (pauseScreen) pauseScreen.classList.add('hidden');
    }
}
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        handleInput();
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault();
        togglePause();
    }
});
window.addEventListener('mousedown', () => {
    handleInput();
});

// --- Button Listeners ---
homePlayBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    startLevel(currentLevel);
});

levelsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showLevelSelect();
});

if (trophiesBtn) {
    trophiesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showTrophies();
    });
}
if (backTrophiesBtn) {
    backTrophiesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showHome();
    });
}
if (pauseBtn) {
    pauseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePause();
    });
}
if (musicToggleBtn) {
    musicToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMusic();
    });
}
if (resumeBtn) {
    resumeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePause();
    });
}
if (pauseRestartBtn) {
    pauseRestartBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (pauseScreen) pauseScreen.classList.add('hidden');
        startLevel(currentLevel);
    });
}
if (pauseHomeBtn) {
    pauseHomeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (pauseScreen) pauseScreen.classList.add('hidden');
        showHome();
    });
}
if (heroPreviewBanner) {
    heroPreviewBanner.addEventListener('click', (e) => {
        e.stopPropagation();
        showCinematic();
    });
}
if (closeCinematicBtn) {
    closeCinematicBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showHome();
    });
}

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

// --- Graphics Engine Modes ---
const graphicsToggleBtn = document.getElementById('graphics-toggle-btn');
const graphicsBtns = document.querySelectorAll('.graphics-btn');
const crtOverlay = document.getElementById('crt-overlay');

function setGraphicsMode(mode, showToastMsg = false) {
    graphicsMode = mode;
    localStorage.setItem('graphics_mode', mode);

    if (mode === '4k') {
        if (graphicsToggleBtn) {
            graphicsToggleBtn.innerText = '4K';
            graphicsToggleBtn.style.background = 'linear-gradient(45deg, #FFD700, #FF8C00)';
            graphicsToggleBtn.style.color = '#000';
        }
        if (crtOverlay) crtOverlay.classList.add('hidden');
        if (showToastMsg) showAchievementToast('🌟 4K ULTRA UHD Graphics');
    } else if (mode === 'high') {
        if (graphicsToggleBtn) {
            graphicsToggleBtn.innerText = 'HD';
            graphicsToggleBtn.style.background = 'rgba(255, 255, 255, 0.8)';
            graphicsToggleBtn.style.color = '#2c3e50';
        }
        if (crtOverlay) crtOverlay.classList.add('hidden');
        if (showToastMsg) showAchievementToast('⚡ HIGH HD Arcade Graphics');
    } else if (mode === 'retro') {
        if (graphicsToggleBtn) {
            graphicsToggleBtn.innerText = '8B';
            graphicsToggleBtn.style.background = '#9d4edd';
            graphicsToggleBtn.style.color = '#fff';
        }
        if (crtOverlay) crtOverlay.classList.remove('hidden');
        if (showToastMsg) showAchievementToast('👾 RETRO 8-Bit Pixel Graphics');
    }

    graphicsBtns.forEach((btn) => {
        if (btn.getAttribute('data-graphics') === mode) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

if (graphicsToggleBtn) {
    graphicsToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const nextMode = graphicsMode === '4k' ? 'high' : (graphicsMode === 'high' ? 'retro' : '4k');
        setGraphicsMode(nextMode, true);
        soundEffects.flap();
    });
}
graphicsBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        setGraphicsMode(btn.getAttribute('data-graphics'), true);
        soundEffects.flap();
    });
});
setGraphicsMode(graphicsMode);


// --- State Management ---
function showHome() {
    gameState = 'HOME';
    homeScreen.classList.remove('hidden');
    levelScreen.classList.add('hidden');
    if (trophiesScreen) trophiesScreen.classList.add('hidden');
    if (cinematicScreen) cinematicScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    levelCompleteScreen.classList.add('hidden');
    scoreDisplay.classList.add('hidden');
    levelDisplay.classList.add('hidden');
    if (progressBarContainer) progressBarContainer.classList.add('hidden');
    if (pauseBtn) pauseBtn.classList.add('hidden');
    if (homeHighScoreElement) homeHighScoreElement.innerText = highScore;
    resetGameObjects();
}

function showCinematic() {
    gameState = 'CINEMATIC';
    homeScreen.classList.add('hidden');
    if (cinematicScreen) cinematicScreen.classList.remove('hidden');
}

function showTrophies() {
    gameState = 'TROPHIES';
    homeScreen.classList.add('hidden');
    if (trophiesScreen) {
        trophiesScreen.classList.remove('hidden');
        renderTrophyList();
    }
}

function renderTrophyList() {
    if (!trophyList) return;
    trophyList.innerHTML = '';
    achievements.forEach(a => {
        const item = document.createElement('div');
        item.className = `trophy-item ${a.unlocked ? 'unlocked' : 'locked'}`;
        item.innerHTML = `
            <div class="trophy-icon">${a.icon}</div>
            <div class="trophy-info">
                <h4>${a.name}</h4>
                <p>${a.desc}</p>
            </div>
        `;
        trophyList.appendChild(item);
    });
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
    if (trophiesScreen) trophiesScreen.classList.add('hidden');
    if (cinematicScreen) cinematicScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    levelCompleteScreen.classList.add('hidden');

    // Show HUD
    scoreDisplay.classList.remove('hidden');
    levelDisplay.classList.remove('hidden');
    if (pauseBtn) pauseBtn.classList.remove('hidden');
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
}

function winLevel() {
    gameState = 'LEVEL_COMPLETE';
    soundEffects.win();
    createFireworks(canvas.width * 0.3, canvas.height * 0.4);
    createFireworks(canvas.width * 0.7, canvas.height * 0.4);
    createFireworks(canvas.width * 0.5, canvas.height * 0.3);
    unlockAchievement('first_flight');
    if (currentLevel >= 11) unlockAchievement('night_owl');
    if (currentLevel === maxLevelUnlocked) {
        maxLevelUnlocked++;
        saveProgress();
    }

    levelCompleteScreen.classList.remove('hidden');
    scoreDisplay.classList.add('hidden');
    levelDisplay.classList.add('hidden');
    if (pauseBtn) pauseBtn.classList.add('hidden');
    if (progressBarContainer) progressBarContainer.classList.add('hidden');
    completedLevelElement.innerText = currentLevel;
}

function gameOver() {
    gameState = 'GAMEOVER';
    streak = 0;
    soundEffects.gameOver();
    screenShake = 15;
    if (score > highScore) {
        highScore = score;
        saveProgress();
    }
    gameOverScreen.classList.remove('hidden');
    scoreDisplay.classList.add('hidden');
    levelDisplay.classList.add('hidden');
    if (pauseBtn) pauseBtn.classList.add('hidden');
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
    invincible: 0,
    slowmo: 0,

    draw: function () {
        ctx.save();
        ctx.translate(this.x, this.y);
        if (this.invincible > 0 && Math.floor(frames / 4) % 2 === 0) {
            ctx.globalAlpha = 0.4;
        }
        this.angle = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.velocity * 0.1)));
        ctx.rotate(this.angle);

        if (this.shielded) {
            ctx.strokeStyle = '#00FFFF';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, 26, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'rgba(0, 255, 255, 0.25)';
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

        // Propeller Animation
        ctx.save();
        ctx.translate(18, 0);
        if (graphicsMode === '4k') {
            // 4K Ultra Cinematic Motion Blur Propeller Disk
            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.beginPath();
            ctx.arc(0, 0, 13, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 13, frames * 0.6, frames * 0.6 + Math.PI);
            ctx.stroke();
        } else {
            ctx.rotate(frames * 0.5);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.fillRect(-2, -11, 4, 22);
        }
        ctx.restore();

        ctx.restore();
    },

    update: function () {
        if (this.invincible > 0) {
            this.invincible--;
        }
        if (this.slowmo > 0) {
            this.slowmo--;
        }
        this.velocity += gravity;
        this.y += this.velocity;

        // Spawn Jet Engine Combustion Exhaust & Smoke Trails
        if (gameState === 'PLAYING') {
            createJetExhaust(this.x - 18, this.y);
        }

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
            obs.x -= getEffectiveSpeed();

            if (obs.destroyed) {
                continue;
            }

            // Collision
            const pLeft = plane.x - plane.width / 2 + 5;
            const pRight = plane.x + plane.width / 2 - 5;
            const pTop = plane.y - plane.height / 2 + 5;
            const pBottom = plane.y + plane.height / 2 - 5;

            const bottomPipeY = obs.topHeight + pipeGap;

            const hitTop = (pRight > obs.x && pLeft < obs.x + this.width && pTop < obs.topHeight);
            const hitBottom = (pRight > obs.x && pLeft < obs.x + this.width && pBottom > bottomPipeY);

            if (hitTop || hitBottom) {
                if (plane.shielded || plane.invincible > 0) {
                    if (plane.shielded) {
                        plane.shielded = false;
                        plane.invincible = 60; // 60 frames (1 second) of invincibility
                        obs.destroyed = true;  // Mark obstacle destroyed so it never collides again
                        soundEffects.shieldBreak();
                        screenShake = 12;
                        shieldsBroken++;
                        saveProgress();
                        if (shieldsBroken >= 3) unlockAchievement('shield_master');
                        addFloatingText(plane.x, plane.y - 25, 'SHIELD BREAK!', '#00FFFF');
                        createParticles(obs.x + this.width / 2, hitTop ? obs.topHeight / 2 : bottomPipeY + 80, 25);
                        createPipeDebris(obs.x + this.width / 2, hitTop ? obs.topHeight / 2 : bottomPipeY + 80, currentTheme.pipe);
                    } else if (plane.invincible > 0) {
                        obs.destroyed = true;
                        createParticles(obs.x + this.width / 2, hitTop ? obs.topHeight / 2 : bottomPipeY + 80, 15);
                        createPipeDebris(obs.x + this.width / 2, hitTop ? obs.topHeight / 2 : bottomPipeY + 80, currentTheme.pipe);
                    }
                } else {
                    gameOver();
                }
            }

            // Score
            if (!obs.passed && plane.x > obs.x + this.width) {
                streak++;
                const mult = streak >= 15 ? 4 : (streak >= 10 ? 3 : (streak >= 5 ? 2 : 1));
                score += mult;
                obstaclesPassed++;
                soundEffects.score();
                if (mult > 1) {
                    addFloatingText(plane.x + 20, plane.y - 15, `+${mult} (STREAK x${mult}!)`, '#FF6B00');
                } else {
                    addFloatingText(plane.x + 20, plane.y - 15, '+1', '#2ECC71');
                }
                if (score >= 50) unlockAchievement('centurion');
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
            if (obs.destroyed) continue;

            const bottomPipeY = obs.topHeight + pipeGap;
            const bottomHeight = canvas.height - bottomPipeY;

            if (graphicsMode === '4k') {
                // 4K Ultra Photorealistic Industrial Metallic Rusted Pipes
                const topGrad = ctx.createLinearGradient(obs.x, 0, obs.x + this.width, 0);
                topGrad.addColorStop(0, '#555555');
                topGrad.addColorStop(0.3, '#2e2e2e');
                topGrad.addColorStop(0.7, '#1a1a1a');
                topGrad.addColorStop(1, '#0d0d0d');
                ctx.fillStyle = topGrad;
                ctx.fillRect(obs.x, 0, this.width, obs.topHeight);
                ctx.fillRect(obs.x, bottomPipeY, this.width, bottomHeight);

                // Pipe Caps with metallic shine
                ctx.fillStyle = '#666666';
                ctx.fillRect(obs.x - 3, obs.topHeight - 22, this.width + 6, 22);
                ctx.fillRect(obs.x - 3, bottomPipeY, this.width + 6, 22);

                // Specular edge light reflection
                ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
                ctx.fillRect(obs.x + 4, 0, 4, obs.topHeight);
                ctx.fillRect(obs.x + 4, bottomPipeY, 4, bottomHeight);

                // Industrial metallic rivets
                ctx.fillStyle = '#aaaaaa';
                for (let ry = 15; ry < obs.topHeight - 10; ry += 35) {
                    ctx.beginPath();
                    ctx.arc(obs.x + 8, ry, 2.5, 0, Math.PI * 2);
                    ctx.arc(obs.x + this.width - 8, ry, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
                for (let ry = bottomPipeY + 25; ry < canvas.height - 10; ry += 35) {
                    ctx.beginPath();
                    ctx.arc(obs.x + 8, ry, 2.5, 0, Math.PI * 2);
                    ctx.arc(obs.x + this.width - 8, ry, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (graphicsMode === 'retro') {
                // 8-Bit Pixel Art Mode
                ctx.fillStyle = '#00E436';
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 4;
                ctx.fillRect(obs.x, 0, this.width, obs.topHeight);
                ctx.strokeRect(obs.x, 0, this.width, obs.topHeight);
                ctx.fillRect(obs.x, bottomPipeY, this.width, bottomHeight);
                ctx.strokeRect(obs.x, bottomPipeY, this.width, bottomHeight);

                ctx.fillRect(obs.x - 4, obs.topHeight - 20, this.width + 8, 20);
                ctx.strokeRect(obs.x - 4, obs.topHeight - 20, this.width + 8, 20);
                ctx.fillRect(obs.x - 4, bottomPipeY, this.width + 8, 20);
                ctx.strokeRect(obs.x - 4, bottomPipeY, this.width + 8, 20);
            } else {
                // High HD Standard Vector Mode
                ctx.fillStyle = currentTheme.pipe;
                ctx.strokeStyle = currentTheme.pipeBorder;
                ctx.lineWidth = 2;
                ctx.fillRect(obs.x, 0, this.width, obs.topHeight);
                ctx.strokeRect(obs.x, 0, this.width, obs.topHeight);
                ctx.fillRect(obs.x, bottomPipeY, this.width, bottomHeight);
                ctx.strokeRect(obs.x, bottomPipeY, this.width, bottomHeight);

                ctx.fillStyle = currentTheme.pipeBorder;
                ctx.fillRect(obs.x - 2, obs.topHeight - 20, this.width + 4, 20);
                ctx.fillRect(obs.x - 2, bottomPipeY, this.width + 4, 20);
            }
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
            color: `hsl(${Math.random() * 50 + 100}, 100%, 70%)`
        });
    }
}
function createJetExhaust(x, y) {
    // Flame Particle
    particlesList.push({
        x: x,
        y: y + (Math.random() - 0.5) * 4,
        vx: -3 - Math.random() * 2,
        vy: (Math.random() - 0.5) * 1,
        life: 12 + Math.random() * 6,
        color: Math.random() < 0.5 ? '#FF4500' : '#FFD700'
    });
    // Smoke Contrail
    if (frames % 2 === 0) {
        particlesList.push({
            x: x - 5,
            y: y + (Math.random() - 0.5) * 6,
            vx: -1.5 - Math.random(),
            vy: (Math.random() - 0.5) * 0.5,
            life: 25 + Math.random() * 10,
            color: 'rgba(255, 255, 255, 0.4)',
            sizeDelta: 0.15
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
        ctx.globalAlpha = Math.max(0, p.life / 30);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.sizeDelta ? (3 + (30 - p.life) * p.sizeDelta) : 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        if (p.life <= 0) {
            particlesList.splice(i, 1);
            i--;
        }
    }
}

const debrisList = [];
function createPipeDebris(x, y, color) {
    for (let i = 0; i < 6; i++) {
        debrisList.push({
            x: x + (Math.random() - 0.5) * 30,
            y: y + (Math.random() - 0.5) * 30,
            vx: (Math.random() - 0.5) * 6,
            vy: -4 - Math.random() * 4,
            rv: (Math.random() - 0.5) * 0.2,
            angle: Math.random() * Math.PI,
            width: 12 + Math.random() * 14,
            height: 18 + Math.random() * 22,
            life: 60,
            color: color || '#A0A0A0'
        });
    }
}
function handleDebris() {
    for (let i = 0; i < debrisList.length; i++) {
        let d = debrisList[i];
        d.x += d.vx;
        d.y += d.vy;
        d.vy += 0.35;
        d.angle += d.rv;
        d.life--;
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(d.angle);
        ctx.fillStyle = d.color;
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = Math.max(0, d.life / 60);
        ctx.fillRect(-d.width / 2, -d.height / 2, d.width, d.height);
        ctx.strokeRect(-d.width / 2, -d.height / 2, d.width, d.height);
        ctx.restore();
        if (d.life <= 0) {
            debrisList.splice(i, 1);
            i--;
        }
    }
}

function createFireworks(x, y) {
    for (let i = 0; i < 35; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 6;
        particlesList.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 40 + Math.random() * 20,
            color: `hsl(${Math.random() * 360}, 100%, 65%)`
        });
    }
}

// --- Screen Shake & Floating Text ---
let screenShake = 0;
const floatingTexts = [];
function addFloatingText(x, y, text, color) {
    floatingTexts.push({ x: x, y: y, text: text, color: color, life: 40 });
}
function handleFloatingTexts() {
    for (let i = 0; i < floatingTexts.length; i++) {
        let ft = floatingTexts[i];
        ft.y -= 1.2;
        ft.life--;
        ctx.save();
        ctx.fillStyle = ft.color;
        ctx.font = '800 16px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.globalAlpha = Math.max(0, ft.life / 40);
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
        if (ft.life <= 0) {
            floatingTexts.splice(i, 1);
            i--;
        }
    }
}

const collectibles = {
    list: [],
    update: function () {
        if (frames % 120 === 60 && Math.random() < 0.65) {
            const rand = Math.random();
            const type = rand < 0.60 ? 'coin' : (rand < 0.85 ? 'shield' : 'slowmo');
            const y = Math.random() * (canvas.height - 200) + 100;
            this.list.push({ x: canvas.width, y: y, type: type, collected: false });
        }
        for (let i = 0; i < this.list.length; i++) {
            let item = this.list[i];
            item.x -= getEffectiveSpeed();
            if (!item.collected) {
                const dx = plane.x - item.x;
                const dy = plane.y - item.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 38) {
                    item.collected = true;
                    if (item.type === 'coin') {
                        score += 2;
                        totalCoins++;
                        saveProgress();
                        if (totalCoins >= 10) unlockAchievement('coin_collector');
                        soundEffects.coin();
                        addFloatingText(item.x, item.y - 15, '+$2 COIN!', '#FFD700');
                        createParticles(item.x, item.y, 8);
                    } else if (item.type === 'shield') {
                        plane.shielded = true;
                        soundEffects.powerup();
                        addFloatingText(item.x, item.y - 15, 'SHIELD EQUIPPED!', '#00FFFF');
                        createParticles(item.x, item.y, 10);
                    } else if (item.type === 'slowmo') {
                        plane.slowmo = 300; // 5 seconds
                        soundEffects.powerup();
                        addFloatingText(item.x, item.y - 15, 'TIME WARP! x0.5 SPEED', '#9d4edd');
                        createParticles(item.x, item.y, 12);
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
            } else if (item.type === 'shield') {
                ctx.fillStyle = 'rgba(0, 255, 255, 0.6)';
                ctx.strokeStyle = '#00FFFF';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, 14, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            } else if (item.type === 'slowmo') {
                ctx.fillStyle = 'rgba(157, 78, 221, 0.7)';
                ctx.strokeStyle = '#c77dff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, 14, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#fff';
                ctx.font = '14px Outfit, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('⏱️', 0, 0);
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
        if (graphicsMode === '4k' && bgImage4K.complete && bgImage4K.naturalWidth > 0) {
            ctx.save();
            ctx.drawImage(bgImage4K, 0, 0, canvas.width, canvas.height);
            // Volumetric golden atmosphere glow
            const skyGlow = ctx.createLinearGradient(0, 0, 0, canvas.height);
            skyGlow.addColorStop(0, 'rgba(255, 140, 0, 0.15)');
            skyGlow.addColorStop(1, 'rgba(15, 32, 39, 0.35)');
            ctx.fillStyle = skyGlow;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
            return;
        }

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
    plane.invincible = 0;
}

function loop() {
    if (gameState === 'PLAYING') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        if (screenShake > 0) {
            const dx = (Math.random() - 0.5) * screenShake * 2;
            const dy = (Math.random() - 0.5) * screenShake * 2;
            ctx.translate(dx, dy);
            screenShake *= 0.88;
            if (screenShake < 0.5) screenShake = 0;
        }

        background.update();
        background.draw();

        obstacles.update();
        obstacles.draw();

        collectibles.update();
        collectibles.draw();

        handleParticles();
        handleDebris();
        handleFloatingTexts();

        plane.update();
        plane.draw();

        // HUD: Slow-Mo Time Warp Banner
        if (plane.slowmo > 0) {
            ctx.fillStyle = 'rgba(157, 78, 221, 0.15)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#9d4edd';
            ctx.font = '800 18px Outfit, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`⏱️ SLOW-MO TIME WARP (${Math.ceil(plane.slowmo / 60)}s)`, canvas.width / 2, 85);
        }

        // HUD: Combo Streak Indicator
        if (streak >= 3) {
            ctx.fillStyle = '#FF6B00';
            ctx.font = '800 16px Outfit, sans-serif';
            ctx.textAlign = 'left';
            const mult = streak >= 15 ? 4 : (streak >= 10 ? 3 : (streak >= 5 ? 2 : 1));
            ctx.fillText(`🔥 STREAK: ${streak} (${mult}x SCORE)`, 20, 85);
        }

        // 4K Ultra Cinematic Vignette Overlay
        if (graphicsMode === '4k') {
            const vig = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.35, canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.75);
            vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
            vig.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
            ctx.fillStyle = vig;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.restore();

        frames++;
        requestAnimationFrame(loop);
    } else {
        // Draw background even in menus for effect
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        background.update();
        background.draw();
        handleParticles();
        handleDebris();
        if (gameState !== 'HOME') {
            plane.draw();
        }
        requestAnimationFrame(loop);
    }
}

// Start in Home
showHome();
loop();
