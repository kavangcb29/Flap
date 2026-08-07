export const state = {
    gameWidth: window.innerWidth,
    gameHeight: window.innerHeight,
    graphicsMode: localStorage.getItem('graphics_mode') || '4k',
    gameState: 'HOME', // HOME, LEVEL_SELECT, PLAYING, LEVEL_COMPLETE, GAMEOVER
    frames: 0,
    score: 0,
    currentLevel: 1,
    maxLevelUnlocked: parseInt(localStorage.getItem('flappy_max_level') || '1', 10),
    highScore: parseInt(localStorage.getItem('flappy_high_score') || '0', 10),
    totalCoins: parseInt(localStorage.getItem('flappy_coins') || '0', 10),
    shieldsBroken: parseInt(localStorage.getItem('flappy_shields_broken') || '0', 10),
    obstaclesPassed: 0,
    obstaclesToWin: 10,
    soundEnabled: true,
    musicEnabled: false,
    selectedSkin: parseInt(localStorage.getItem('flappy_skin') || '0', 10),
    
    // Custom Settings
    uiTheme: localStorage.getItem('flappy_ui_theme') || 'dark',
    spacebarAction: localStorage.getItem('flappy_space_action') || 'flap',
    
    // Physics & Difficulty Modifiers
    gameSpeed: parseFloat(localStorage.getItem('flappy_game_speed') || '3'),
    streak: 0,
    gravity: parseFloat(localStorage.getItem('flappy_gravity') || '0.25'),
    jumpStrength: parseFloat(localStorage.getItem('flappy_jump') || '4.6'),
    pipeGap: parseInt(localStorage.getItem('flappy_pipe_gap') || '150', 10),
    
    screenShake: 0
};

export const canvas = document.getElementById('gameCanvas');
export const ctx = canvas.getContext('2d');

export const bgImage4K = new Image();
bgImage4K.src = 'flappy_plane_screenshot.jpg';

export function saveProgress() {
    localStorage.setItem('flappy_max_level', state.maxLevelUnlocked);
    localStorage.setItem('flappy_high_score', state.highScore);
    localStorage.setItem('flappy_coins', state.totalCoins);
    localStorage.setItem('flappy_shields_broken', state.shieldsBroken);
}

export function getEffectiveSpeed(plane) {
    return plane.slowmo > 0 ? state.gameSpeed * 0.5 : state.gameSpeed;
}
