import { state, ctx } from '../state.js';

// Pre-allocate 1500 particles for the pool
export const particlePool = Array.from({ length: 1500 }, () => ({ active: false }));

function getFreeParticle() {
    for (let i = 0; i < particlePool.length; i++) {
        if (!particlePool[i].active) return particlePool[i];
    }
    return null;
}

export function createParticles(x, y, count) {
    for (let i = 0; i < count; i++) {
        const p = getFreeParticle();
        if (!p) break;
        p.active = true;
        p.x = x - 10;
        p.y = y;
        p.vx = (Math.random() - 0.5) * 2 - 2;
        p.vy = (Math.random() - 0.5) * 2;
        p.life = 20 + Math.random() * 10;
        p.color = `hsl(${Math.random() * 50 + 100}, 100%, 70%)`;
        p.type = 'spark';
        p.sizeDelta = 0;
        p.size = 3;
    }
}

export function createJetExhaust(x, y) {
    const is4K = state.graphicsMode === '4k';
    const fireP = getFreeParticle();
    if (fireP) {
        fireP.active = true;
        fireP.x = x;
        fireP.y = y + (Math.random() - 0.5) * 4;
        fireP.vx = -3 - Math.random() * 2;
        fireP.vy = (Math.random() - 0.5) * (is4K ? 0.5 : 1);
        fireP.life = is4K ? 16 + Math.random() * 8 : 12 + Math.random() * 6;
        fireP.color = is4K ? (Math.random() < 0.6 ? '#FFA500' : '#FF4500') : (Math.random() < 0.5 ? '#FF4500' : '#FFD700');
        fireP.size = is4K ? 4 + Math.random() * 3 : 3;
        fireP.type = 'fire';
        fireP.sizeDelta = 0;
    }
    
    if (state.frames % 2 === 0) {
        const smokeP = getFreeParticle();
        if (smokeP) {
            smokeP.active = true;
            smokeP.x = x - 5;
            smokeP.y = y + (Math.random() - 0.5) * 6;
            smokeP.vx = -1.5 - Math.random();
            smokeP.vy = (Math.random() - 0.5) * 0.5;
            smokeP.life = is4K ? 40 + Math.random() * 20 : 25 + Math.random() * 10;
            smokeP.color = is4K ? 'rgba(200, 200, 200, 0.25)' : 'rgba(255, 255, 255, 0.4)';
            smokeP.sizeDelta = is4K ? 0.25 : 0.15;
            smokeP.size = is4K ? 5 : 3;
            smokeP.type = 'smoke';
        }
    }
}

export function handleParticles() {
    for (let i = 0; i < particlePool.length; i++) {
        let p = particlePool[i];
        if (!p.active) continue;
        
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
            p.active = false;
        }
    }
}

export function createFireworks(x, y) {
    for (let i = 0; i < 35; i++) {
        const p = getFreeParticle();
        if (!p) break;
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 6;
        p.active = true;
        p.x = x;
        p.y = y;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.life = 40 + Math.random() * 20;
        p.color = `hsl(${Math.random() * 360}, 100%, 65%)`;
        p.type = 'firework';
        p.sizeDelta = 0;
        p.size = 3;
    }
}

export function resetParticles() {
    for (let i = 0; i < particlePool.length; i++) {
        particlePool[i].active = false;
    }
}
