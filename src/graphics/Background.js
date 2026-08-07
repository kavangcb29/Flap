import { state, ctx, bgImage4K, getEffectiveSpeed } from '../state.js';
import { currentTheme } from './Themes.js';
import { plane } from '../entities/Plane.js';

export const background = {
    mountains: [],
    clouds: [],
    stars: [],
    snowflakes: [],
    init: function () {
        for (let i = 0; i < 5; i++) {
            this.clouds.push({
                x: Math.random() * state.gameWidth,
                y: Math.random() * (state.gameHeight / 2),
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
            if (c.x + c.size * 2 < 0) c.x = state.gameWidth + c.size;
        }
        if (currentTheme.name === 'Snow') {
            for (let s of this.snowflakes) {
                s.y += s.vy;
                s.x += s.vx;
                if (s.y > state.gameHeight) {
                    s.y = -10;
                    s.x = Math.random() * state.gameWidth;
                }
            }
        }
    },
    draw: function () {
        if (state.graphicsMode === '4k' && bgImage4K.complete && bgImage4K.naturalWidth > 0) {
            ctx.save();
            const panOffset = (state.frames * 0.15) % state.gameWidth;
            ctx.drawImage(bgImage4K, -panOffset, 0, state.gameWidth + 10, state.gameHeight);
            ctx.drawImage(bgImage4K, state.gameWidth - panOffset, 0, state.gameWidth + 10, state.gameHeight);
            
            const skyGlow = ctx.createLinearGradient(0, 0, 0, state.gameHeight);
            skyGlow.addColorStop(0, 'rgba(255, 140, 0, 0.15)');
            skyGlow.addColorStop(1, 'rgba(15, 32, 39, 0.35)');
            ctx.fillStyle = skyGlow;
            ctx.fillRect(0, 0, state.gameWidth, state.gameHeight);
            ctx.restore();
            this.drawTelemetry();
            return;
        }

        if (currentTheme.name === 'Night') {
            ctx.fillStyle = '#ffffff';
            for (let s of this.stars) {
                ctx.globalAlpha = 0.4 + Math.sin(state.frames * 0.05 + s.x) * 0.4;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        // Offscreen Prerendering for Mountains
        if (!this.mountainCanvas || this.lastTheme !== currentTheme.name || this.lastHeight !== state.gameHeight) {
            this.mountainCanvas = document.createElement('canvas');
            this.mountainCanvas.width = state.gameWidth;
            this.mountainCanvas.height = state.gameHeight;
            const mCtx = this.mountainCanvas.getContext('2d');
            
            mCtx.fillStyle = currentTheme.mountains;
            mCtx.beginPath();
            mCtx.moveTo(0, state.gameHeight);
            mCtx.lineTo(200, state.gameHeight - 150);
            mCtx.lineTo(400, state.gameHeight - 50);
            mCtx.lineTo(600, state.gameHeight - 200);
            mCtx.lineTo(900, state.gameHeight - 100);
            mCtx.lineTo(state.gameWidth, state.gameHeight - 250);
            mCtx.lineTo(state.gameWidth, state.gameHeight);
            mCtx.lineTo(0, state.gameHeight);
            mCtx.fill();
            
            this.lastTheme = currentTheme.name;
            this.lastHeight = state.gameHeight;
        }
        
        ctx.drawImage(this.mountainCanvas, 0, 0);

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
        this.drawTelemetry();
    },
    
    drawTelemetry: function () {
        if (state.gameState === 'PLAYING') {
            ctx.save();
            ctx.fillStyle = state.graphicsMode === '4k' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)';
            ctx.font = '800 48px Outfit, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const centerY = state.gameHeight / 2;
            const centerX = state.gameWidth / 2;
            
            ctx.fillText(`ALT: ${Math.floor(state.gameHeight - plane.y)}M`, centerX, centerY - 60);
            ctx.fillText(`SPD: ${Math.floor(getEffectiveSpeed(plane) * 100)} KPH`, centerX, centerY);
            ctx.fillText(`DST: ${Math.floor(state.frames / 5)}M`, centerX, centerY + 60);
            
            ctx.font = '700 24px Outfit, sans-serif';
            const engTemp = 70 + (state.streak * 5) + Math.floor(plane.velocity);
            ctx.fillText(`ENG TEMP: ${engTemp}°C`, centerX, centerY + 110);
            
            ctx.restore();
        }
    }
};
background.init();
