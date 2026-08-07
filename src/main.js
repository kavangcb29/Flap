import { state, ctx } from './state.js';
import { background } from './graphics/Background.js';
import { obstacles } from './entities/Obstacles.js';
import { collectibles } from './entities/Collectibles.js';
import { plane } from './entities/Plane.js';
import { handleParticles } from './entities/Particles.js';
import { handleDebris } from './entities/Debris.js';
import { handleFloatingTexts } from './entities/FloatingTexts.js';
import { initUIListeners, showHome } from './ui.js';

function loop() {
    if (state.gameState === 'PLAYING') {
        ctx.clearRect(0, 0, state.gameWidth, state.gameHeight);

        ctx.save();
        if (state.screenShake > 0) {
            const dx = Math.sin(state.frames * 0.8) * state.screenShake;
            const dy = Math.cos(state.frames * 0.9) * state.screenShake;
            ctx.translate(dx, dy);
            state.screenShake *= 0.92;
            if (state.screenShake < 0.5) state.screenShake = 0;
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

        if (plane.slowmo > 0) {
            ctx.fillStyle = 'rgba(157, 78, 221, 0.15)';
            ctx.fillRect(0, 0, state.gameWidth, state.gameHeight);
            ctx.fillStyle = '#9d4edd';
            ctx.font = '800 18px Outfit, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`⏱️ SLOW-MO TIME WARP (${Math.ceil(plane.slowmo / 60)}s)`, state.gameWidth / 2, 85);
        }

        if (state.streak >= 3) {
            ctx.fillStyle = '#FF6B00';
            ctx.font = '800 16px Outfit, sans-serif';
            ctx.textAlign = 'left';
            const mult = state.streak >= 15 ? 4 : (state.streak >= 10 ? 3 : (state.streak >= 5 ? 2 : 1));
            ctx.fillText(`🔥 STREAK: ${state.streak} (${mult}x SCORE)`, 20, 85);
        }

        if (state.graphicsMode === '4k') {
            const vig = ctx.createRadialGradient(state.gameWidth / 2, state.gameHeight / 2, Math.min(state.gameWidth, state.gameHeight) * 0.35, state.gameWidth / 2, state.gameHeight / 2, Math.max(state.gameWidth, state.gameHeight) * 0.75);
            vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
            vig.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
            ctx.fillStyle = vig;
            ctx.fillRect(0, 0, state.gameWidth, state.gameHeight);
        }

        ctx.restore();

        state.frames++;
        requestAnimationFrame(loop);
    } else {
        ctx.clearRect(0, 0, state.gameWidth, state.gameHeight);
        background.update();
        background.draw();
        
        plane.draw();
        
        handleParticles();
        handleDebris();
        requestAnimationFrame(loop);
    }
}

// Initialize the game
initUIListeners();
showHome();
loop();
