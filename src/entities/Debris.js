import { ctx } from '../state.js';

export const debrisList = [];

export function createPipeDebris(x, y, color) {
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

export function handleDebris() {
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

export function resetDebris() {
    debrisList.length = 0;
}
