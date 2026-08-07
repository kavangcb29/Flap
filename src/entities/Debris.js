import { ctx } from '../state.js';

// Pre-allocate 100 debris pieces
export const debrisPool = Array.from({ length: 100 }, () => ({ active: false }));

function getFreeDebris() {
    for (let i = 0; i < debrisPool.length; i++) {
        if (!debrisPool[i].active) return debrisPool[i];
    }
    return null;
}

export function createPipeDebris(x, y, color) {
    for (let i = 0; i < 6; i++) {
        const d = getFreeDebris();
        if (!d) break;
        d.active = true;
        d.x = x + (Math.random() - 0.5) * 30;
        d.y = y + (Math.random() - 0.5) * 30;
        d.vx = (Math.random() - 0.5) * 6;
        d.vy = -4 - Math.random() * 4;
        d.rv = (Math.random() - 0.5) * 0.2;
        d.angle = Math.random() * Math.PI;
        d.width = 12 + Math.random() * 14;
        d.height = 18 + Math.random() * 22;
        d.life = 60;
        d.color = color || '#A0A0A0';
    }
}

export function handleDebris() {
    for (let i = 0; i < debrisPool.length; i++) {
        let d = debrisPool[i];
        if (!d.active) continue;
        
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
            d.active = false;
        }
    }
}

export function resetDebris() {
    for (let i = 0; i < debrisPool.length; i++) {
        debrisPool[i].active = false;
    }
}
