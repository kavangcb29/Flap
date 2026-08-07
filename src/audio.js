import { state } from './state.js';

let audioCtx = null;

export function playTone(freq, type, duration, startFreq = freq) {
    if (!state.soundEnabled) return;
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

export const soundEffects = {
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
    },
    laser: () => playTone(1200, 'square', 0.1, 800),
    explosion: () => playTone(50, 'sawtooth', 0.3, 150)
};

let musicInterval = null;
const chiptuneNotes = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 293.66, 349.23, 440.00, 587.33];
let currentNoteIndex = 0;

export function toggleMusic() {
    state.musicEnabled = !state.musicEnabled;
    const btn = document.getElementById('music-toggle-btn');
    if (btn) btn.innerText = state.musicEnabled ? '🎵' : '🔇';
    if (state.musicEnabled) {
        if (!musicInterval) {
            musicInterval = setInterval(() => {
                if (state.musicEnabled && state.gameState === 'PLAYING') {
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
