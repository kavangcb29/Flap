import { state, ctx } from '../state.js';

export const particlesList = [];

export function createParticles(x, y, count) {
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

export function createJetExhaust(x, y) {
    const is4K = state.graphicsMode === '4k';
    particlesList.push({
        x: x,
        y: y + (Math.random() - 0.5) * 4,
        vx: -3 - Math.random() * 2,
        vy: (Math.random() - 0.5) * (is4K ? 0.5 : 1),
        life: is4K ? 16 + Math.random() * 8 : 12 + Math.random() * 6,
        color: is4K ? (Math.random() < 0.6 ? '#FFA500' : '#FF4500') : (Math.random() < 0.5 ? '#FF4500' : '#FFD700'),
        size: is4K ? 4 + Math.random() * 3 : 3,
        type: 'fire'
    });
    if (state.frames % 2 === 0) {
        particlesList.push({
            x: x - 5,
            y: y + (Math.random() - 0.5) * 6,
            vx: -1.5 - Math.random(),
            vy: (Math.random() - 0.5) * 0.5,
            life: is4K ? 40 + Math.random() * 20 : 25 + Math.random() * 10,
            color: is4K ? 'rgba(200, 200, 200, 0.25)' : 'rgba(255, 255, 255, 0.4)',
            sizeDelta: is4K ? 0.25 : 0.15,
            size: is4K ? 5 : 3,
            type: 'smoke'
        });
    }
}

export function handleParticles() {
    for (let i = 0; i < particlesList.length; i++) {
        let p = particlesList[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        
        ctx.save();
        if (state.graphicsMode === '4k' && p.type === 'fire') {
            ctx.globalCompositeOperation = 'lighter';
        }
        
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life / 30);
        ctx.beginPath();
        const currentSize = p.sizeDelta ? ((p.size || 3) + (30 - p.life) * p.sizeDelta) : (p.size || 3);
        ctx.arc(p.x, p.y, Math.max(0.1, currentSize), 0, Math.PI * 2);
        
        if (state.graphicsMode === '4k' && p.type === 'fire') {
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentSize);
            grad.addColorStop(0, '#FFFFFF');
            grad.addColorStop(0.3, p.color);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
        }
        
        ctx.fill();
        ctx.restore();
        
        if (p.life <= 0) {
            particlesList.splice(i, 1);
            i--;
        }
    }
}

export function createFireworks(x, y) {
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

export function resetParticles() {
    particlesList.length = 0;
}
