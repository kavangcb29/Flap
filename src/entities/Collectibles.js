import { state, ctx, getEffectiveSpeed, saveProgress } from '../state.js';
import { soundEffects } from '../audio.js';
import { plane } from './Plane.js';
import { createParticles } from './Particles.js';
import { addFloatingText } from './FloatingTexts.js';
import { unlockAchievement, updateScoreUI } from '../ui.js';

export const collectibles = {
    list: [],
    update: function () {
        if (state.frames % 120 === 60 && Math.random() < 0.65) {
            const rand = Math.random();
            const type = rand < 0.60 ? 'coin' : (rand < 0.85 ? 'shield' : 'slowmo');
            const y = Math.random() * (state.gameHeight - 200) + 100;
            this.list.push({ x: state.gameWidth, y: y, type: type, collected: false });
        }
        for (let i = 0; i < this.list.length; i++) {
            let item = this.list[i];
            item.x -= getEffectiveSpeed(plane);
            if (!item.collected) {
                const dx = plane.x - item.x;
                const dy = plane.y - item.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 38) {
                    item.collected = true;
                    if (item.type === 'coin') {
                        state.score += 2;
                        state.totalCoins++;
                        saveProgress();
                        if (state.totalCoins >= 10) unlockAchievement('coin_collector');
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
                    if (state.score > state.highScore) {
                        state.highScore = state.score;
                        saveProgress();
                    }
                    updateScoreUI();
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
