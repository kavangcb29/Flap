import { state, ctx, getEffectiveSpeed } from '../state.js';
import { soundEffects } from '../audio.js';
import { skins } from '../graphics/Themes.js';
import { createJetExhaust, createParticles } from './Particles.js';
import { gameOver } from '../ui.js';

export const plane = {
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
        let targetAngle = (this.velocity * 0.12);
        if (state.gameState !== 'PLAYING') {
            targetAngle = 0;
            this.y += Math.sin(state.frames * 0.05) * 0.5;
        }
        targetAngle = Math.min(Math.PI / 3.5, Math.max(-Math.PI / 3.5, targetAngle));
        this.angle += (targetAngle - this.angle) * 0.15;
        
        ctx.translate(this.x, this.y);
        if (this.invincible > 0 && Math.floor(state.frames / 4) % 2 === 0) {
            ctx.globalAlpha = 0.4;
        }
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

        const skin = skins[state.selectedSkin] || skins[0];

        ctx.fillStyle = skin.body;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = skin.tail;
        ctx.beginPath();
        ctx.moveTo(-15, -5);
        ctx.lineTo(-25, -15);
        ctx.lineTo(-15, 5);
        ctx.fill();
        
        ctx.fillStyle = skin.wing;
        ctx.beginPath();
        ctx.ellipse(5, 5, 10, 4, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(18, 0);
        if (state.graphicsMode === '4k') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.beginPath();
            ctx.arc(0, 0, 13, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 13, state.frames * 0.6, state.frames * 0.6 + Math.PI);
            ctx.stroke();
        } else {
            ctx.rotate(state.frames * 0.5);
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
        this.velocity += state.gravity;
        this.y += this.velocity;

        if (state.gameState === 'PLAYING') {
            createJetExhaust(this.x - 18, this.y);
        }

        if (this.y + this.height / 2 > state.gameHeight) {
            this.y = state.gameHeight - this.height / 2;
            gameOver();
        }
        if (this.y - this.height / 2 < 0) {
            this.y = this.height / 2;
            this.velocity = 0;
        }
    },

    flap: function () {
        this.velocity = -state.jumpStrength;
        soundEffects.flap();
        createParticles(this.x, this.y, 3);
    },

    shoot: function () {
        const now = performance.now();
        if (!this.lastShotTime || now - this.lastShotTime > 250) {
            this.lastShotTime = now;
            import('./Projectiles.js').then(module => {
                module.shootLaser(this.x + this.width / 2, this.y);
            });
        }
    }
};
